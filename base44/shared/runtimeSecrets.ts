import { secrets } from 'base44:runtime';

// One safe reader for runtime secrets. If a secret is not set the lookup must not
// take the whole function down: it returns null and the caller marks that source
// unavailable rather than inventing a result.
export function readSecret(name) {
  try {
    const value = secrets.get(name);
    if (value) return value;
  } catch (error) {
    console.warn(`[secrets] runtime lookup failed for ${name}:`, error && error.message);
  }
  try {
    return Deno.env.get(name) || null;
  } catch (error) {
    return null;
  }
}