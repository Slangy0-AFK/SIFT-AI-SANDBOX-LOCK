// The .txt a buyer downloads. Every line of it is the text the server sent, so
// the file can never say something different from the page it came from.
const dayOnly = (value) => {
  if (!value) return 'not recorded';
  try {
    return new Date(value).toLocaleDateString('en-US', { dateStyle: 'long' });
  } catch (error) {
    return 'not recorded';
  }
};

export function buildLicenseFile(license, key) {
  return [
    'SIFT AI license key',
    '===================',
    '',
    `Order:            ${license.order_number || 'not recorded'}`,
    `Key:              ${key}`,
    `Status:           ${license.status_label}`,
    `Issued:           ${dayOnly(license.issued_at)}`,
    ...(license.expires_at ? [`Works until:      ${dayOnly(license.expires_at)}`] : []),
    '',
    'What it unlocks',
    '---------------',
    license.unlocks,
    '',
    'How to apply it',
    '---------------',
    ...(license.instructions || []).map((line, index) => `${index + 1}. ${line}`),
    '',
    'Your setup sends the key to SIFT AI once, like this:',
    `  POST ${license.endpoint}`,
    `  {"action": "validate", "key": "${key}"}`,
    '',
    'License terms',
    '-------------',
    ...(license.terms || []).map((line) => `- ${line}`),
    '',
    'Keep this file to yourself. SIFT AI',
  ].join('\n');
}

export function downloadLicenseFile(license, key) {
  const blob = new Blob([buildLicenseFile(license, key)], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `siftai-license-${license.order_number || 'key'}.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}