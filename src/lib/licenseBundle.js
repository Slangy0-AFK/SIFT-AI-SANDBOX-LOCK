import { buildLicenseFile } from '@/lib/licenseFile';
import { buildZipBlob, saveBlob } from '@/lib/zip';
import { PLUGIN_ENV_READS, PLUGIN_SETUP_STEPS, PLUGIN_TESTS } from '@/lib/pluginContent';

// The full version and a founding place get everything as one zip: the license
// file, the plug-in code, the setup instructions, the terms and the checklist.
// A Device Check key keeps the plain license file it has always had.
const ENTITLEMENTS = ['pro', 'founding'];

export function bundleOffered(license) {
  return ENTITLEMENTS.includes(license?.entitlement) && Boolean(license?.key);
}

const numbered = (lines) => lines.map((line, index) => `${index + 1}. ${line}`);

function setupText(license) {
  return [
    'SIFT AI plug-in: setup instructions',
    '===================================',
    '',
    'How to apply your key',
    '---------------------',
    ...numbered(license.instructions || []),
    '',
    `Your setup sends the key to SIFT AI once: POST ${license.endpoint}`,
    '  {"action": "validate", "key": "your key from the license file",',
    '   "model": "the one model this key is for", "deployment_id": "the deployment it runs on"}',
    '',
    'Setting the plug-in up in your product',
    '--------------------------------------',
    ...numbered(PLUGIN_SETUP_STEPS),
    '',
    'What it reads from your environment',
    '-----------------------------------',
    ...PLUGIN_ENV_READS.map(([name, note]) => `${name.padEnd(20)}${note}`),
    '',
    'Nothing installs this into your product for you: you or your developer copy it in.',
    'It needs an internet connection to validate the key.',
    '',
    'Keep this file to yourself. SIFT AI'
  ].join('\n');
}

function termsText(license) {
  return [
    'SIFT AI license terms',
    '=====================',
    '',
    `Order: ${license.order_number || 'not recorded'}`,
    `Plan:  ${license.plan_label || 'SIFT AI'}`,
    `Model: ${license.model_name || 'not locked yet, and it locks to the first model that activates it'}`,
    ...(license.deployment_id ? [`Deployment: ${license.deployment_id}`] : []),
    '',
    'What it unlocks',
    '---------------',
    license.unlocks || '',
    '',
    'License terms',
    '-------------',
    ...(license.terms || []).map((line) => `- ${line}`),
    '',
    'Keep this file to yourself. SIFT AI'
  ].join('\n');
}

function checklistText() {
  return [
    'SIFT AI test checklist',
    '======================',
    '',
    'Run these in a test environment, and read the audit log after each one. Every',
    'check should leave exactly one entry, and no entry should ever contain a message.',
    '',
    ...PLUGIN_TESTS.flatMap((check, index) => [`${index + 1}. ${check.title}`, `   ${check.text}`, '']),
    'If a check does not behave as described, stop there and ask SIFT AI before real traffic.',
    '',
    'Keep this file to yourself. SIFT AI'
  ].join('\n');
}

async function pluginFile(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path} could not be read`);
  return res.text();
}

// Every item or none: if a piece cannot be read, nothing is delivered, so a zip
// can never arrive with something missing from it.
export async function downloadLicenseBundle(license) {
  const [js, py] = await Promise.all([pluginFile('/plugin/sift-guard.js'), pluginFile('/plugin/sift_guard.py')]);

  const blob = buildZipBlob([
    { name: 'siftai-license.txt', text: buildLicenseFile(license, license.key) },
    { name: 'setup-instructions.txt', text: setupText(license) },
    { name: 'license-terms.txt', text: termsText(license) },
    { name: 'test-checklist.txt', text: checklistText() },
    { name: 'sift-guard.js', text: js },
    { name: 'sift_guard.py', text: py }
  ]);

  saveBlob(blob, `siftai-license-${license.order_number || 'key'}.zip`);
}