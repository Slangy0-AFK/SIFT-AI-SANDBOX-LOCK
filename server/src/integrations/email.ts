import nodemailer from 'nodemailer';

export interface RecoveryMailer {
  sendPasswordReset(email: string, url: string): Promise<void>;
}

export function createRecoveryMailer(settings: {
  host: string; port: number; user: string; password: string; from: string;
} | undefined): RecoveryMailer | null {
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
    }
  };
}
