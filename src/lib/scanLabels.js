// One place for the plain words SIFT AI uses about checks, so the scanner, the
// history page and a saved check never describe the same thing differently.

export const VERDICTS = {
  flagged: { label: 'Flagged', badge: 'destructive', tone: 'text-destructive' },
  unknown: { label: 'Unknown', badge: 'secondary', tone: 'text-amber-400' },
  approved: { label: 'Approved', badge: 'outline', tone: 'text-emerald-400' }
};

export const SCAN_TYPES = {
  // Older records, from when a link, domain or hash check ran through VirusTotal.
  // That is switched off, so the wording says so instead of implying a live result.
  virustotal_url: 'Link (withdrawn VirusTotal check)',
  virustotal_domain: 'Domain (withdrawn VirusTotal check)',
  virustotal_hash: 'File hash (withdrawn VirusTotal check)',
  virustotal_ip: 'IP address (withdrawn VirusTotal check)',
  open_source: 'Link, domain, IP or file hash',
  message: 'Message or email',
  sms: 'Message or email',
  email: 'Message or email',
  device_scan: 'Device check'
};

export function scanTypeLabel(scanType) {
  return SCAN_TYPES[scanType] || 'Check';
}

export const TYPE_FILTERS = [
  { id: 'all', label: 'Any kind', types: null },
  { id: 'item', label: 'Link, domain, IP or hash', types: ['open_source', 'virustotal_url', 'virustotal_domain', 'virustotal_hash', 'virustotal_ip'] },
  { id: 'message', label: 'Message or email', types: ['message', 'sms', 'email'] },
  { id: 'device', label: 'Device check', types: ['device_scan'] }
];

export const LIST_TYPES = [
  { id: 'domain', label: 'Domain' },
  { id: 'url', label: 'Link' },
  { id: 'app', label: 'App name' },
  { id: 'hash', label: 'File hash' }
];

export function listTypeLabel(itemType) {
  return (LIST_TYPES.find((entry) => entry.id === itemType) || {}).label || 'Item';
}

export const DEVICE_TYPES = [
  { id: 'android', label: 'Android phone' },
  { id: 'ios', label: 'iPhone' },
  { id: 'tablet', label: 'Tablet' },
  { id: 'desktop', label: 'Laptop or desktop' },
  { id: 'other', label: 'Something else' }
];

export function deviceTypeLabel(deviceType) {
  return (DEVICE_TYPES.find((entry) => entry.id === deviceType) || {}).label || 'Device';
}

// The three verdicts, worked out the same way everywhere.
export function verdictOf(record) {
  if (!record) return 'unknown';
  if (record.is_threat) return 'flagged';
  if (record.threat_level === 'safe') return 'approved';
  return 'unknown';
}

export function verdictLabel(record) {
  return VERDICTS[verdictOf(record)].label;
}

// The query fragments behind the history filters, so the counting and the
// listing always agree on what "Flagged" means.
export function verdictFilter(verdict) {
  if (verdict === 'flagged') return { is_threat: true };
  if (verdict === 'unknown') return { is_threat: false, threat_level: 'warning' };
  if (verdict === 'approved') return { is_threat: false, threat_level: 'safe' };
  return {};
}

export function formatWhen(value) {
  if (!value) return 'not yet';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'not yet';
  return date.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export const BROWSER_LIMIT =
  'SIFT AI runs in your browser. It checks only the item you paste or upload, and a browser cannot look through a whole phone by itself. Nothing here says a device is clean or safe.';