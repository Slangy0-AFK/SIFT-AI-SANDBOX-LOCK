export function readDatabaseUrl(env: NodeJS.ProcessEnv) {
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required');
  return databaseUrl;
}

export function readConfig(env: NodeJS.ProcessEnv) {
  const databaseUrl = readDatabaseUrl(env);
  const port = Number(env.PORT ?? '3000');
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }
  const origin = env.FRONTEND_ORIGIN;
  if (!origin) throw new Error('FRONTEND_ORIGIN is required');
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    throw new Error('FRONTEND_ORIGIN must be an HTTP(S) origin');
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin) {
    throw new Error('FRONTEND_ORIGIN must be an HTTP(S) origin without a path');
  }
  const production = env.NODE_ENV === 'production';
  const trustProxyHops = Number(env.TRUST_PROXY_HOPS ?? '0');
  if (!Number.isInteger(trustProxyHops) || trustProxyHops < 0 || trustProxyHops > 5) {
    throw new Error('TRUST_PROXY_HOPS must be an integer between 0 and 5');
  }
  if (production && url.protocol !== 'https:') throw new Error('FRONTEND_ORIGIN must use HTTPS in production');
  const sessionSecret = env.SESSION_SECRET;
  if (!sessionSecret || Buffer.byteLength(sessionSecret) < 32) {
    throw new Error('SESSION_SECRET must contain at least 32 bytes');
  }
  const smtpValues = [env.SMTP_HOST, env.SMTP_PORT, env.SMTP_USER, env.SMTP_PASSWORD, env.SMTP_FROM];
  let smtp: { host: string; port: number; user: string; password: string; from: string } | undefined;
  if (smtpValues.some(Boolean)) {
    const [host, smtpPort, user, password, from] = smtpValues;
    if (!host || !smtpPort || !user || !password || !from) throw new Error('All SMTP settings are required');
    const portNumber = Number(smtpPort);
    if (!Number.isInteger(portNumber) || portNumber < 1 || portNumber > 65535) throw new Error('SMTP_PORT is invalid');
    smtp = { host, port: portNumber, user, password, from };
  }
  return { databaseUrl, port, origin, sessionSecret, production, smtp, trustProxyHops };
}
