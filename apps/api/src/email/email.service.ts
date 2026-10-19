import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter, SendMailOptions } from 'nodemailer';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Sends transactional emails (verification codes, password resets, etc.)
 * through SMTP. Configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and
 * SMTP_FROM in .env. The client can swap providers by changing .env only —
 * no code changes needed.
 *
 * The clinic logo (clinova-emblem.png) is embedded inline so it shows up in
 * the email without relying on external image hosting.
 */
@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter?: Transporter;
  private from?: string;
  private logoBase64?: string;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const host = this.config.get<string>('smtp.host');
    const port = this.config.get<number>('smtp.port');
    const user = this.config.get<string>('smtp.user');
    const pass = this.config.get<string>('smtp.pass');
    this.from = this.config.get<string>('smtp.from');

    // Embed the clinic logo as base64 so it displays inline in emails.
    try {
      const logoPath = join(__dirname, '..', '..', '..', '..', 'web', 'public', 'clinova-emblem.png');
      const logoBuffer = readFileSync(logoPath);
      this.logoBase64 = logoBuffer.toString('base64');
      this.logger.log('Clinic logo embedded for email templates.');
    } catch {
      this.logger.warn('Could not load clinic logo for emails. Emails will be sent without a logo.');
    }

    // SMTP is optional in development: if not configured, emails are logged
    // instead of sent so signup still works without an SMTP server.
    if (!host || !port || !user || !pass) {
      this.logger.warn(
        'SMTP not fully configured. Verification emails will be logged, not sent. ' +
          'Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM in .env to send real emails.',
      );
      return;
    }

    this.transporter = createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    this.logger.log(`SMTP transporter ready on ${host}:${port}`);
  }

  /**
   * Sends a verification email. Falls back to logging when SMTP is not
   * configured, so development doesn't require an SMTP server.
   */
  async sendVerificationEmail(
    to: string,
    verificationUrl: string,
    displayName?: string,
  ): Promise<void> {
    const subject = 'Welcome to CLINICKA — Verify your account';
    const logoCid = this.logoBase64 ? 'clinova-emblem' : undefined;

    const text = `
Hello ${displayName ?? ''},

You're invited to join CLINICKA, the campus health information system for Brokenshire College.

Please verify your email address to activate your account:

${verificationUrl}

This link expires in 24 hours. If you didn't sign up, you can ignore this email.

— CLINICKA · Brokenshire College
    `.trim();

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify your CLINICKA account</title>
        </head>
        <body style="margin: 0; padding: 0; background: #0f172a; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #0f172a; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" max-width="600" cellpadding="0" cellspacing="0" style="background: #1e293b; border-radius: 16px; border: 1px solid #334155;">
                  <tr>
                    <td align="center" style="padding: 32px 32px 24px;">
                      ${this.logoBase64 ? `<img src="cid:clinova-emblem" alt="CLINICKA" width="80" height="80" style="display: block; border-radius: 50%; border: 2px solid #2dd4bf;" />` : ''}
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding: 0 32px 24px;">
                      <h1 style="margin: 0; font-size: 24px; color: #ffffff; font-weight: 700;">Welcome to CLINICKA</h1>
                      <p style="margin: 12px 0 0; font-size: 16px; color: #94a3b8;">Brokenshire College Campus Health System</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 0 32px 32px;">
                      <p style="margin: 0 0 16px; font-size: 15px; color: #e2e8f0;">Hello ${displayName ?? 'there'},</p>
                      <p style="margin: 0 0 24px; font-size: 15px; color: #cbd5e1; line-height: 1.6;">
                        You've been invited to join CLINICKA. Please verify your email address to activate your account and access your health records.
                      </p>
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center">
                            <a href="${verificationUrl}" style="display: inline-block; background: #2dd4bf; color: #0f172a; padding: 16px 32px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 16px;">Verify my email</a>
                          </td>
                        </tr>
                      </table>
                      <p style="margin: 24px 0 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                        This verification link expires in 24 hours.<br />
                        If you didn't create an account, you can safely ignore this email.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding: 24px 32px 32px;">
                      <p style="margin: 0; font-size: 12px; color: #64748b; letter-spacing: 0.5px; text-transform: uppercase;">
                        CLINICKA &middot; Brokenshire College
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `.trim();

    if (!this.transporter || !this.from) {
      this.logger.log(
        `[EMAIL LOG] To: ${to}\nSubject: ${subject}\nVerification URL: ${verificationUrl}\nLogo embedded: ${!!this.logoBase64}\n`,
      );
      return;
    }

    const mailOptions: SendMailOptions = {
      from: this.from,
      to,
      subject,
      text,
      html,
    };

    if (this.logoBase64) {
      mailOptions.attachments = [
        {
          filename: 'clinova-emblem.png',
          content: this.logoBase64,
          encoding: 'base64',
          cid: 'clinova-emblem',
        },
      ];
    }

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Verification email sent to ${to}`);
    } catch (error: unknown) {
      this.logger.error(`Failed to send verification email to ${to}: ${error instanceof Error ? error.message : String(error)}`);
      // Don't throw — signup should still succeed even if email fails.
      // The user can request a resend later.
    }
  }
}