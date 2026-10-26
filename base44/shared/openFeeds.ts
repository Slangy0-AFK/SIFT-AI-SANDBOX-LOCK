// Open-source threat feeds used by the scanner.
//
// Rules this file exists to keep:
// - Every source answers separately, so a person can see which one said what.
// - A source that cannot answer (no access key, refused, timeout, bad response)
//   is reported as unavailable or error. It is never counted as a hit and never
//   counted as a pass.
// - Nothing here ever describes an item as "clean" or "safe". The strongest
//   thing a check can say is "not found in these feeds" / "no hits in the checks run".
// - VirusTotal is deliberately absent: its public API must not be used commercially.

import { readSecret } from './runtimeSecrets.ts';

const TIMEOUT = 9000;

// These sources need an access key that this build does not carry. The name is
// deliberately not read from the environment at all: an unregistered secret name
// must not be referenced. Each source says so plainly instead of failing.
const NO_ACCESS_KEY = 'no access key is configured for this source in this build, so it was not queried';

export const FEED_SOURCES = [
  {
    id: 'malwarebazaar',
    name: 'MalwareBazaar',
    operator: 'abuse.ch',
    covers: 'malware file hashes (SHA-256)',
    site: 'https://bazaar.abuse.ch/',
    commercial: 'restricted',
    commercial_note: 'abuse.ch allows free non-commercial use; commercial use needs a paid abuse.ch plan. Not confirmed for this app yet.'
  },
  {
    id: 'threatfox',
    name: 'ThreatFox',
    operator: 'abuse.ch',
    covers: 'indicators of compromise: hashes, links, domains, IP addresses',
    site: 'https://threatfox.abuse.ch/',
    commercial: 'restricted',
    commercial_note: 'abuse.ch terms: free non-commercial use, paid plan for commercial use. Not confirmed for this app yet.'
  },
  {
    id: 'urlhaus',
    name: 'URLhaus',
    operator: 'abuse.ch',
    covers: 'links and hosts used to spread malware',
    site: 'https://urlhaus.abuse.ch/',
    commercial: 'restricted',
    commercial_note: 'abuse.ch terms: free non-commercial use, paid plan for commercial use. Not confirmed for this app yet.'
  },
  {
    id: 'feodotracker',
    name: 'Feodo Tracker',
    operator: 'abuse.ch',
    covers: 'command-and-control addresses used by botnet malware',
    site: 'https://feodotracker.abuse.ch/',
    commercial: 'restricted',
    commercial_note: 'abuse.ch terms: free non-commercial use, paid plan for commercial use. Not confirmed for this app yet.'
  },
  {
    id: 'otx',
    name: 'AlienVault OTX',
    operator: 'LevelBlue',
    covers: 'community threat pulses: hashes, links, domains, IP addresses',
    site: 'https://otx.alienvault.com/',
    commercial: 'not_confirmed',
    commercial_note: 'The OTX end-user agreement restricts commercial exploitation and use outside its intended use. Written permission is needed before paid tiers rely on it. Not confirmed.'
  },
  {
    id: 'phishtank',
    name: 'PhishTank',
    operator: 'OpenDNS / Cisco',
    covers: 'verified phishing links',
    site: 'https://phishtank.org/',
    commercial: 'not_confirmed',
    commercial_note: 'PhishTank’s data terms need checking before commercial use, and it needs an application key. Not confirmed.'
  }
];

export const CLAMAV_NOTE =
  'ClamAV is the open-source antivirus engine (GPL-2.0). SIFT AI cannot run it: its backend runs in a managed sandbox with no access to system programs, so no antivirus engine runs inside SIFT AI. No ClamAV result is produced here, and none is ever faked. Until a separate ClamAV service is stood up, a file is checked by its hash against the feeds above, plus the local scan checklist you run yourself on your own machine.';

function source(id) {
  return FEED_SOURCES.find((entry) => entry.id === id) || { id, name: id, operator: '' };
}

function hit(id, detail) {
  return { ...source(id), status: 'hit', ...detail };
}

function none(id, note) {
  return { ...source(id), status: 'none', note: note || null };
}

function unavailable(id, reason) {
  return { ...source(id), status: 'unavailable', reason };
}

function failed(id, reason) {
  return { ...source(id), status: 'error', reason };
}

async function readJson(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (error) {
    return null;
  }
}

// MalwareBazaar, ThreatFox, URLhaus and PhishTank each need an access key that
// this build does not carry, so none of them is queried and each reports itself
// as unavailable. Nothing here invents a key, and no unregistered secret name is
// read. Feodo Tracker needs no key and OTX uses a registered one, so those are
// the sources that can still answer.
async function lookupMalwareBazaar(hash) {
  return unavailable('malwarebazaar', NO_ACCESS_KEY);
}

async function lookupThreatFox(value) {
  return unavailable('threatfox', NO_ACCESS_KEY);
}

async function lookupUrlhaus(kind, value) {
  return unavailable('urlhaus', NO_ACCESS_KEY);
}

async function lookupPhishTank(url) {
  return unavailable('phishtank', NO_ACCESS_KEY);
}

// Which kind of thing did the person paste? A hash is hex, an IP is four numbers,
// anything starting with http is a link, and the rest is treated as a domain.
export function detectKind(value, wanted) {
  if (wanted && ['hash', 'url', 'domain', 'ip'].includes(wanted)) return wanted;
  const text = String(value || '').trim();
  if (/^(https?:\/\/|www\.)/i.test(text)) return 'url';
  if (/^[a-f0-9]{32}$|^[a-f0-9]{40}$|^[a-f0-9]{64}$/i.test(text)) return 'hash';
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(text)) return 'ip';
  if (/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(text)) return 'domain';
  return null;
}

export async function runFeedChecks(kind, value) {
  const tasks = [];
  if (kind === 'hash') tasks.push(lookupMalwareBazaar(value), lookupThreatFox(value), lookupOtx('hash', value));
  if (kind === 'url') tasks.push(lookupUrlhaus('url', value), lookupThreatFox(value), lookupPhishTank(value), lookupOtx('url', value));
  if (kind === 'domain') tasks.push(lookupUrlhaus('domain', value), lookupThreatFox(value), lookupOtx('domain', value));
  if (kind === 'ip') tasks.push(lookupFeodo(value), lookupThreatFox(value), lookupOtx('ip', value));

  const settled = await Promise.allSettled(tasks);
  const results = settled.map((entry, index) =>
    entry.status === 'fulfilled'
      ? entry.value
      : { id: `source_${index}`, name: 'a source', operator: '', status: 'error', reason: 'the source did not answer' }
  );
  return { results };
}

const KIND_WORDS = { hash: 'file hash', url: 'link', domain: 'domain', ip: 'IP address' };

// The combined rule, decided here on the server from the source answers alone.
// Flagged  = two or more independent sources agree, or a known command-and-control
//            address, or a known malware link.
// Unknown  = exactly one source flagged it, or the sources disagree, or no feed
//            could answer at all, or the rogue-AI checklist raised items.
// Approved = nothing hit — worded "No hits in the checks run", never "clean".
export function combineVerdict(results, opts = {}) {
  const hits = results.filter((entry) => entry.status === 'hit');
  const answered = results.filter((entry) => entry.status === 'hit' || entry.status === 'none');
  const silent = results.filter((entry) => entry.status === 'unavailable' || entry.status === 'error');
  const c2 = hits.some((entry) => entry.category === 'c2');
  const malwareUrl = hits.some((entry) => entry.category === 'malware_url');
  const checklistHit = opts.checklistHit === true;

  const flaggedFor = [];
  if (hits.length >= 2) flaggedFor.push(`${hits.length} independent sources agree`);
  if (c2) flaggedFor.push('a known command-and-control address');
  if (malwareUrl) flaggedFor.push('a known malware link');

  if (flaggedFor.length) {
    return {
      level: 'flagged',
      headline: `Flagged: ${flaggedFor.join(', and ')}`,
      lines: hits.map((entry) => `${entry.name}: ${entry.family || entry.threat || entry.category}`),
      next: 'Do not open it, do not run it, and keep it away from your other accounts. If it is already on a device, remove it and change the passwords you used on that device.'
    };
  }

  if (hits.length === 1) {
    const only = hits[0];
    return {
      level: 'unknown',
      headline: 'Unknown — a single source flagged it',
      lines: [
        `${only.name} flagged it${only.family ? ` as ${only.family}` : ''}.`,
        `The other ${answered.length + silent.length - 1} sources had nothing on it. One source on its own is not enough to call something flagged.`,
        silent.length ? `${silent.length} of the sources could not answer, so this is not the full picture either.` : ''
      ].filter(Boolean),
      next: 'Treat it with care, and get a person to look at it if it matters.'
    };
  }

  if (checklistHit) {
    return {
      level: 'unknown',
      headline: 'Unknown — no feed hits, but your own checklist raised items',
      lines: [
        'None of the feeds that answered had anything on this item.',
        'Your rogue-AI checklist flagged at least one thing, so this cannot be called "no hits in the checks run" until you have reviewed it.'
      ],
      next: 'Work through the checklist items you marked before you trust it.'
    };
  }

  if (!answered.length) {
    return {
      level: 'unknown',
      headline: 'Unknown — no feed could answer for this item',
      lines: [
        `These checks came back without data${silent.length ? `: ${silent.map((entry) => entry.name).join(', ')}` : ''}.`,
        'That is not the same as nothing being wrong. No feed answered, so nothing was actually checked.'
      ],
      next: 'Try again in a moment, or use the local scan checklist and your own antivirus on your machine.'
    };
  }

  return {
    level: 'approved',
    headline: 'No hits in the checks run',
    lines: [
      `Not found in these feeds: ${answered.map((entry) => entry.name).join(', ')}.`,
      silent.length ? `${silent.length} source${silent.length === 1 ? '' : 's'} could not answer, so this is not a complete picture.` : '',
      `This is not a guarantee that the ${KIND_WORDS[opts.kind] || 'item'} is safe. SIFT AI is not an antivirus and does not certify anything.`
    ].filter(Boolean),
    next: 'Keep your own antivirus and updates in place, and use the local scan checklist if you have the file itself.'
  };
}