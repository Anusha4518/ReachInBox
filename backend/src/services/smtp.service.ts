import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config/env.js';

class SmtpService {
  private transporter: Transporter | null = null;
  private isInitializing: Promise<void> | null = null;

  private async getTransporter(): Promise<Transporter> {
    if (this.transporter) {
      return this.transporter;
    }

    if (this.isInitializing) {
      await this.isInitializing;
      return this.transporter!;
    }

    this.isInitializing = (async () => {
      // 1. Real SMTP (e.g. Gmail App Password, SendGrid, Resend) for real inbox notifications
      if (config.smtp.user && config.smtp.pass) {
        this.transporter = nodemailer.createTransport({
          host: config.smtp.host,
          port: config.smtp.port,
          secure: config.smtp.secure,
          auth: {
            user: config.smtp.user,
            pass: config.smtp.pass,
          },
        });
        console.log(`🚀 Configured REAL SMTP Delivery via ${config.smtp.host} (${config.smtp.user})`);
        return;
      }

      // 2. Ethereal Fake SMTP (Assignment default for testing)
      const hasValidEnvCreds =
        config.ethereal.user &&
        config.ethereal.pass &&
        config.ethereal.user !== 'your_ethereal_user_here';

      if (hasValidEnvCreds) {
        this.transporter = nodemailer.createTransport({
          host: config.ethereal.host,
          port: config.ethereal.port,
          secure: config.ethereal.port === 465,
          auth: {
            user: config.ethereal.user,
            pass: config.ethereal.pass,
          },
        });
        console.log(`📧 Configured Ethereal SMTP with user: ${config.ethereal.user}`);
      } else {
        // Automatically provision an ephemeral Ethereal test account
        console.log('⚡ Generating ephemeral Ethereal Email test account for development...');
        const testAccount = await nodemailer.createTestAccount();
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
        console.log(`✅ Generated Ethereal Test Account: ${testAccount.user}`);
      }
    })();

    await this.isInitializing;
    this.isInitializing = null;
    return this.transporter!;
  }

  /**
   * Sends an email via Ethereal SMTP.
   * Returns the message ID and live Ethereal preview URL.
   */
  async sendEmail(options: {
    from: string;
    to: string;
    subject: string;
    body: string;
  }): Promise<{ messageId: string; previewUrl: string | false }> {
    const transporter = await this.getTransporter();

    const fromAddress = config.smtp.user || options.from;

    const info = await transporter.sendMail({
      from: `"ReachInbox Outreach" <${fromAddress}>`,
      to: options.to,
      subject: options.subject,
      text: options.body,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #0f172a; margin-top: 0;">${options.subject}</h2>
          <div style="color: #334155; line-height: 1.6; white-space: pre-wrap; margin: 20px 0;">
            ${options.body}
          </div>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">
            Sent by ReachInbox Cold Email Engine • Simulated via Ethereal Email
          </p>
        </div>
      `,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);

    console.log(`📨 Email sent to: ${options.to} (MessageId: ${info.messageId})`);
    if (previewUrl) {
      console.log(`🔗 Ethereal Preview URL: ${previewUrl}`);
    }

    return {
      messageId: info.messageId,
      previewUrl,
    };
  }
}

export const smtpService = new SmtpService();

