import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter, SendMailOptions } from 'nodemailer';
import { setDefaultResultOrder } from 'node:dns';

/**
 * Node reports a failed connect to a host with several addresses as an
 * `AggregateError` whose own `message` is empty, so logging `error.message`
 * alone produces a bare "verification failed:" with no cause. Include the code
 * and every underlying cause so SMTP failures stay diagnosable.
 */
export function describeError(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error);
  }

  const code = (error as { code?: unknown }).code;
  const causes = (error as { errors?: unknown }).errors;
  const hasCauses = Array.isArray(causes) && causes.length > 0;
  const parts: string[] = [];

  if (error.message) {
    parts.push(error.message);
  } else if (!hasCauses) {
    parts.push(error.name);
  }

  if (code !== undefined) {
    parts.push(`(code: ${String(code)})`);
  }

  if (hasCauses) {
    const details = (causes as unknown[]).map((cause) => describeError(cause)).join('; ');
    parts.push(`causes: ${details}`);
  }

  return parts.join(' ');
}

/**
 * Sends transactional emails (verification codes, password resets, etc.)
 * through SMTP. Configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and
 * SMTP_FROM in .env. The client can swap providers by changing .env only —
 * no code changes needed.
 *
 */
@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter?: Transporter;
  private from?: string;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const host = this.config.get<string>('smtp.host');
    const port = this.config.get<number>('smtp.port');
    const user = this.config.get<string>('smtp.user');
    const pass = this.config.get<string>('smtp.pass');
    this.from = this.config.get<string>('smtp.from');
    const normalizedPass = pass?.replace(/\s+/g, '');

    // SMTP is optional in development: if not configured, emails are logged
    // instead of sent so signup still works without an SMTP server.
    if (!host || !port || !user || !normalizedPass || !this.from) {
      this.logger.warn(
        'SMTP not fully configured. Verification emails will be logged, not sent. ' +
          'Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM in .env to send real emails.',
      );
      return;
    }

    // Some development networks advertise an unreachable IPv6 route for
    // Gmail, so prefer IPv4 when resolving the SMTP host.
    setDefaultResultOrder('ipv4first');
    this.transporter = createTransport({
      host,
      port,
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 30_000,
      secure: port === 465,
      auth: { user, pass: normalizedPass },
    });

    this.logger.log(`SMTP transporter ready on ${host}:${port}`);
    void this.transporter
      .verify()
      .then(() => this.logger.log('SMTP connection verified successfully.'))
      .catch((error: unknown) => {
        this.logger.error(`SMTP connection verification failed: ${describeError(error)}`);
      });
  }

  /**
   * Sends a verification email. Falls back to logging when SMTP is not
   * configured, so development doesn't require an SMTP server.
   */
  async sendVerificationEmail(
    to: string,
    verificationUrl: string,
    displayName?: string,
  ): Promise<boolean> {
    const subject = 'Welcome to CLINICKA — Verify your account';

    const recipientName = displayName?.trim() || 'there';
    const text = `
CLINICKA
Brokenshire College Campus Health System

Verify your email address

Hello ${recipientName},

Your CLINICKA account has been created. Verify your email address to activate your account and access your health records.

Verify your email: ${verificationUrl}

This verification link expires in 24 hours. If you did not create this account, you can safely ignore this email.

CLINICKA Support
Brokenshire College
    `.trim();

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify your CLINICKA account</title>
        </head>
        <body style="margin: 0; padding: 0; background: #f1f5f9; font-family: Arial, Helvetica, sans-serif; color: #172033;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f1f5f9; padding: 24px 12px;">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background: #ffffff; border: 1px solid #dbe3ee; border-radius: 12px;">
                  <tr>
                    <td style="padding: 28px 32px 22px; border-bottom: 4px solid #16b8a6;">
                      <p style="margin: 0; color: #0f766e; font-size: 13px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;">CLINICKA</p>
                      <p style="margin: 8px 0 0; color: #64748b; font-size: 14px;">Brokenshire College Campus Health System</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 32px 32px 8px;">
                      <h1 style="margin: 0; font-size: 25px; line-height: 1.25; color: #172033; font-weight: 700;">Verify your email address</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 0 32px 32px;">
                      <p style="margin: 0 0 16px; font-size: 16px; color: #334155;">Hello ${recipientName},</p>
                      <p style="margin: 0 0 24px; font-size: 15px; color: #475569; line-height: 1.65;">
                        Your CLINICKA account has been created. Verify your email address to activate your account and access your health records.
                      </p>
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center">
                            <a href="${verificationUrl}" style="display: inline-block; background: #0f766e; color: #ffffff; padding: 14px 28px; border-radius: 7px; text-decoration: none; font-weight: 700; font-size: 16px;">Verify my email</a>
                          </td>
                        </tr>
                      </table>
                      <p style="margin: 28px 0 8px; font-size: 13px; color: #64748b; line-height: 1.5;">
                        This link expires in 24 hours.
                      </p>
                      <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                        If you did not create this account, you can safely ignore this email.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 18px 32px; background: #f8fafc; border-radius: 0 0 12px 12px;">
                      <p style="margin: 0; font-size: 12px; color: #64748b; text-align: center;">
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
        `[EMAIL LOG] To: ${to}\nSubject: ${subject}\nVerification URL: ${verificationUrl}\n`,
      );
      return false;
    }

    const mailOptions: SendMailOptions = {
      from: this.from,
      to,
      subject,
      text,
      html,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Verification email sent to ${to}`);
      return true;
    } catch (error: unknown) {
      this.logger.error(`Failed to send verification email to ${to}: ${describeError(error)}`);
      return false;
    }
  }
}