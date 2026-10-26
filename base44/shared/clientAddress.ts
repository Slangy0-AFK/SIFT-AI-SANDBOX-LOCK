// The client address a caller cannot choose.
//
// X-Forwarded-For is a caller-supplied header: whatever a caller puts in it is
// forwarded untouched, so only the entry the edge itself appended (the last one)
// is usable. The edge-provided header wins when it is present.
//
// Nothing usable means 'unknown', never a value the caller chose: callers treat
// that as "not identified" and attribute nothing to it.

export const UNKNOWN_CLIENT_ADDRESS = 'unknown';

// An address literal (IPv4 or IPv6) and nothing else — not a hostname, not a
// quoted string, no injected markup. Anything unrecognised is refused.
const ADDRESS_LIKE = /^[0-9a-fA-F:.]{3,45}$/;

export function trustedClientAddress(req) {
  const edgeProvided = addressOrUnknown(req.headers.get('cf-connecting-ip'));
  if (edgeProvided !== UNKNOWN_CLIENT_ADDRESS) return edgeProvided;

  const forwarded = req.headers.get('x-forwarded-for')?.split(',').map((s) => s.trim()).filter(Boolean) || [];
  return addressOrUnknown(forwarded[forwarded.length - 1]);
}

function addressOrUnknown(value) {
  const candidate = String(value || '').trim();
  return ADDRESS_LIKE.test(candidate) ? candidate : UNKNOWN_CLIENT_ADDRESS;
}