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
  if (production && url.protocol !== 'https:') throw new Error('FRONTEND_ORIGIN must use HTTPS in production');
  const sessionSecret = env.SESSION_SECRET;
  if (!sessionSecret || Buffer.byteLength(sessionSecret) < 32) {
    throw new Error('SESSION_SECRET must contain at least 32 bytes');
  }
  return { databaseUrl, port, origin, sessionSecret, production };
}
