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

async function lookupMalwareBazaar(hash) {
  const key = readSecret('ABUSECH_AUTH_KEY');
  if (!key) return unavailable('malwarebazaar', 'access key not configured');
  if (!/^[a-f0-9]{64}$/i.test(hash)) {
    return none('malwarebazaar', 'MalwareBazaar indexes SHA-256 hashes, so this hash length is not looked up here');
  }
  try {
    const res = await fetch('https://mb-api.abuse.ch/api/v1/', {
      method: 'POST',
      headers: { 'Auth-Key': key, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ query: 'get_info', hash }).toString(),
      signal: AbortSignal.timeout(TIMEOUT)
    });
    if (res.status === 401 || res.status === 403) return unavailable('malwarebazaar', 'access key refused');
    if (!res.ok) return failed('malwarebazaar', `the source answered HTTP ${res.status}`);
    const data = await readJson(res);
    if (!data || data.query_status !== 'ok') return none('malwarebazaar');
    const row = (data.data || [])[0] || {};
    return hit('malwarebazaar', {
      first_seen: row.first_seen || null,
      family: row.signature || null,
      tags: row.tags || [],
      detail_url: `https://bazaar.abuse.ch/sample/${hash}/`,
      category: 'malware_sample'
    });
  } catch (error) {
    return failed('malwarebazaar', String((error && error.message) || error));
  }
}

async function lookupThreatFox(value) {
  const key = readSecret('ABUSECH_AUTH_KEY');
  if (!key) return unavailable('threatfox', 'access key not configured');
  try {
    const res = await fetch('https://threatfox-api.abuse.ch/api/v1/', {
      method: 'POST',
      headers: { 'Auth-Key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'search_ioc', search_term: value }),
      signal: AbortSignal.timeout(TIMEOUT)
    });
    if (res.status === 401 || res.status === 403) return unavailable('threatfox', 'access key refused');
    if (!res.ok) return failed('threatfox', `the source answered HTTP ${res.status}`);
    const data = await readJson(res);
    if (!data || data.query_status !== 'ok' || !data.data || !data.data.length) return none('threatfox');
    const row = data.data[0] || {};
    return hit('threatfox', {
      first_seen: row.first_seen_utc || null,
      family: row.malware_printable || row.malware || row.malware_alias || null,
      tags: row.tags || [],
      detail_url: row.reference || 'https://threatfox.abuse.ch/browse/',
      category: row.threat_type || 'ioc'
    });
  } catch (error) {
    return failed('threatfox', String((error && error.message) || error));
  }
}

async function lookupUrlhaus(kind, value) {
  const key = readSecret('ABUSECH_AUTH_KEY');
  if (!key) return unavailable('urlhaus', 'access key not configured');
  const endpoint = kind === 'url' ? 'https://urlhaus-api.abuse.ch/v1/url/' : 'https://urlhaus-api.abuse.ch/v1/host/';
  const field = kind === 'url' ? 'url' : 'host';
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Auth-Key': key, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ [field]: value }).toString(),
      signal: AbortSignal.timeout(TIMEOUT)
    });
    if (res.status === 401 || res.status === 403) return unavailable('urlhaus', 'access key refused');
    if (!res.ok) return failed('urlhaus', `the source answered HTTP ${res.status}`);
    const data = await readJson(res);
    if (!data || data.query_status !== 'ok') return none('urlhaus');
    const row = kind === 'url' ? data : data;
    return hit('urlhaus', {
      first_seen: row.date_added || row.firstseen || null,
      family: null,
      tags: row.tags || [],
      detail_url: row.urlhaus_reference || null,
      threat: row.threat || null,
      category: kind === 'url' ? 'malware_url' : 'malware_host'
    });
  } catch (error) {
    return failed('urlhaus', String((error && error.message) || error));
  }
}

async function lookupFeodo(ip) {
  try {
    const res = await fetch('https://feodotracker.abuse.ch/downloads/ipblocklist.json', {
      signal: AbortSignal.timeout(TIMEOUT)
    });
    if (!res.ok) return failed('feodotracker', `the source answered HTTP ${res.status}`);
    const rows = await readJson(res);
    if (!Array.isArray(rows)) return failed('feodotracker', 'the source sent an unexpected response');
    const row = rows.find((entry) => entry && entry.ip_address === ip);
    if (!row) return none('feodotracker');
    return hit('feodotracker', {
      first_seen: row.first_seen || null,
      family: row.malware || null,
      tags: ['command-and-control', row.status || 'online'].filter(Boolean),
      detail_url: `https://feodotracker.abuse.ch/browse/host/${ip}/`,
      category: 'c2'
    });
  } catch (error) {
    return failed('feodotracker', String((error && error.message) || error));
  }
}

async function lookupOtx(kind, value) {
  const key = readSecret('ALIENVAULT_API_KEY');
  if (!key) return unavailable('otx', 'access key not configured');
  const type = kind === 'hash' ? 'file' : kind === 'ip' ? 'IPv4' : kind;
  try {
    const res = await fetch(`https://otx.alienvault.com/api/v1/indicators/${type}/${encodeURIComponent(value)}/general`, {
      headers: { 'X-OTX-API-KEY': key, Accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT)
    });
    if (res.status === 401 || res.status === 403) return unavailable('otx', 'access key refused');
    if (res.status === 404) return none('otx');
    if (!res.ok) return failed('otx', `the source answered HTTP ${res.status}`);
    const data = await readJson(res);
    const pulses = (data && data.pulse_info && data.pulse_info.pulses) || [];
    if (!pulses.length) return none('otx');
    const stamps = pulses.map((pulse) => pulse.created).filter(Boolean).sort();
    const tags = [...new Set(pulses.flatMap((pulse) => pulse.tags || []))].slice(0, 12);
    const families = [...new Set(pulses.flatMap((pulse) => pulse.malware_families || []))].slice(0, 8);
    return hit('otx', {
      first_seen: stamps[0] || null,
      family: families.join(', ') || null,
      tags,
      detail_url: `https://otx.alienvault.com/indicator/${type}/${encodeURIComponent(value)}`,
      category: 'pulse'
    });
  } catch (error) {
    return failed('otx', String((error && error.message) || error));
  }
}

async function lookupPhishTank(url) {
  const key = readSecret('PHISHTANK_APP_KEY');
  if (!key) return unavailable('phishtank', 'access key not configured');
  try {
    const res = await fetch('https://checkurl.phishtank.com/checkurl/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ url, format: 'json', app_key: key }).toString(),
      signal: AbortSignal.timeout(TIMEOUT)
    });
    if (!res.ok) return failed('phishtank', `the source answered HTTP ${res.status}`);
    const data = await readJson(res);
    const row = (data && data.results) || {};
    if (row.in_database !== true) return none('phishtank');
    return hit('phishtank', {
      first_seen: row.verified_at || null,
      family: null,
      tags: ['phishing'],
      detail_url: row.phish_detail_page || null,
      category: 'phishing'
    });
  } catch (error) {
    return failed('phishtank', String((error && error.message) || error));
  }
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