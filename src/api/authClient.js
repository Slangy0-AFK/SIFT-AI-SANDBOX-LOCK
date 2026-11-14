const buildEnvironment = /** @type {ImportMeta & {env: {VITE_API_BASE_URL?: string, DEV: boolean}}} */ (import.meta);
const apiRoot = (buildEnvironment.env.VITE_API_BASE_URL ||
  (buildEnvironment.env.DEV ? 'http://localhost:3000/api' : '/api')).replace(/\/+$/, '');

let csrfToken = '';

/**
 * @param {string} path
 * @param {{method?: string, body?: unknown}} [options]
 */
async function request(path, { method = 'GET', body } = {}) {
  const headers = new Headers();
  if (body !== undefined) headers.set('Content-Type', 'application/json');
  if (method !== 'GET' && csrfToken) headers.set('X-CSRF-Token', csrfToken);

  const response = await fetch(`${apiRoot}/auth${path}`, {
    method,
    credentials: 'include',
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : null;

  if (data?.csrfToken) csrfToken = data.csrfToken;
  if (!response.ok) {
    const error = Object.assign(
      new Error(data?.error || `Authentication request failed (${response.status})`),
      { status: response.status },
    );
    throw error;
  }
  return data;
}

export const authClient = {
  session: () => request('/session'),
  login: (email, password) => request('/login', {
    method: 'POST',
    body: { email, password },
  }),
  register: (email, password) => request('/register', {
    method: 'POST',
    body: { email, password },
  }),
  verifyEmail: (token) => request('/verify-email', {
    method: 'POST',
    body: { token },
  }),
  resendVerification: (email) => request('/resend-verification', {
    method: 'POST',
    body: { email },
  }),
  requestPasswordReset: (email) => request('/forgot-password', {
    method: 'POST',
    body: { email },
  }),
  resetPassword: (token, password) => request('/reset-password', {
    method: 'POST',
    body: { token, password },
  }),
  acceptTerms: (version) => request('/terms', {
    method: 'POST',
    body: { version },
  }),
  async logout() {
    if (!csrfToken) await request('/session');
    await request('/logout', { method: 'POST', body: {} });
    csrfToken = '';
  },
};
