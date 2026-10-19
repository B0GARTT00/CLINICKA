import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';

/**
 * Sends transactional emails (verification codes, password resets, etc.)
 * through SMTP. Configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and
 * SMTP_FROM in .env. The client can swap providers by changing .env only —
 * no code changes needed.
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
    const subject = 'Verify your CLINICKA account';
    const text = `
Hello ${displayName ?? ''},

Welcome to CLINICKA. Please verify your email address by clicking the link below:

${verificationUrl}

This link expires in 24 hours. If you didn't create an account, you can ignore this email.

— CLINICKA
    `.trim();
    const html = `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #0f172a; color: #e2e8f0; border-radius: 12px;">
        <h2 style="color: #2dd4bf;">Verify your CLINICKA account</h2>
        <p>Hello ${displayName ?? ''},</p>
        <p>Welcome to CLINICKA. Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${verificationUrl}" style="background: #2dd4bf; color: #0f172a; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; display: inline-block;">Verify my email</a>
        </div>
        <p style="font-size: 12px; color: #94a3b8;">This link expires in 24 hours. If you didn't create an account, you can ignore this email.</p>
        <p style="font-size: 11px; color: #64748b;">— CLINICKA</p>
      </div>
    `.trim();

    if (!this.transporter || !this.from) {
      this.logger.log(
        `[EMAIL LOG] To: ${to}\nSubject: ${subject}\nVerification URL: ${verificationUrl}\n`,
      );
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.from,
        to,
        subject,
        text,
        html,
      });
      this.logger.log(`Verification email sent to ${to}`);
    } catch (error: unknown) {
      this.logger.error(`Failed to send verification email to ${to}: ${error instanceof Error ? error.message : String(error)}`);
      // Don't throw — signup should still succeed even if email fails.
      // The user can request a resend later.
    }
  }
}