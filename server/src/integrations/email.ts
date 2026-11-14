import nodemailer from 'nodemailer';

export interface AccountMailer {
  sendPasswordReset(email: string, url: string): Promise<void>;
  sendVerification(email: string, url: string): Promise<void>;
}

export function createAccountMailer(settings: {
  host: string; port: number; user: string; password: string; from: string;
} | undefined): AccountMailer | null {
  if (!settings) return null;
  const secure = settings.port === 465;
  const transport = nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure,
    requireTLS: !secure,
    auth: { user: settings.user, pass: settings.password },
    tls: { rejectUnauthorized: true },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
  });
  return {
    async sendPasswordReset(email, url) {
      const result = await transport.sendMail({
        from: settings.from,
        to: email,
        subject: 'Reset your SIFT AI password',
        text: `Use this link within 30 minutes to reset your password:\n\n${url}\n\nIf you did not request this, ignore this email.`
      });
      if (result.accepted.length !== 1) throw new Error('Recovery message was not accepted');
    },
    async sendVerification(email, url) {
      const result = await transport.sendMail({
        from: settings.from,
        to: email,
        subject: 'Verify your SIFT AI email address',
        text: `Use this link within 24 hours to verify your email address:\n\n${url}\n\nIf you did not request this account, ignore this email.`
      });
      if (result.accepted.length !== 1) throw new Error('Verification message was not accepted');
    }
  };
}
