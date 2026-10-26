export const SOURCE_CATALOG = [
  {
    id: 'malwarebazaar',
    name: 'MalwareBazaar',
    operator: 'abuse.ch',
    covers: 'Malware file hashes (SHA-256).',
    site: 'https://bazaar.abuse.ch/',
    commercial: 'restricted',
    commercial_note: 'abuse.ch allows free use for non-commercial purposes; commercial use needs a paid abuse.ch plan. SIFT AI has not confirmed a commercial licence, so this feed is used with that restriction flagged. It also needs an abuse.ch access key, which this build does not carry: it is listed here but is not queried when you run a check.'
  },
  {
    id: 'threatfox',
    name: 'ThreatFox',
    operator: 'abuse.ch',
    covers: 'Indicators of compromise: hashes, links, domains and IP addresses.',
    site: 'https://threatfox.abuse.ch/',
    commercial: 'restricted',
    commercial_note: 'abuse.ch terms: free for non-commercial use, paid plan for commercial use. Not confirmed for SIFT AI. It also needs an abuse.ch access key, which this build does not carry: it is listed here but is not queried when you run a check.'
  },
  {
    id: 'urlhaus',
    name: 'URLhaus',
    operator: 'abuse.ch',
    covers: 'Links and hosts used to spread malware.',
    site: 'https://urlhaus.abuse.ch/',
    commercial: 'restricted',
    commercial_note: 'abuse.ch terms: free for non-commercial use, paid plan for commercial use. Not confirmed for SIFT AI. It also needs an abuse.ch access key, which this build does not carry: it is listed here but is not queried when you run a check.'
  },
  {
    id: 'feodotracker',
    name: 'Feodo Tracker',
    operator: 'abuse.ch',
    covers: 'Command-and-control addresses used by botnet malware.',
    site: 'https://feodotracker.abuse.ch/',
    commercial: 'restricted',
    commercial_note: 'abuse.ch terms: free for non-commercial use, paid plan for commercial use. Not confirmed for SIFT AI.'
  },
  {
    id: 'otx',
    name: 'AlienVault OTX',
    operator: 'LevelBlue',
    covers: 'Community threat pulses: hashes, links, domains and IP addresses.',
    site: 'https://otx.alienvault.com/',
    commercial: 'not_confirmed',
    commercial_note: 'OTX’s end-user agreement restricts commercial exploitation and use outside its intended use. Written permission is needed before a paid tier relies on it. Not confirmed.'
  },
  {
    id: 'phishtank',
    name: 'PhishTank',
    operator: 'OpenDNS / Cisco',
    covers: 'Verified phishing links.',
    site: 'https://phishtank.org/',
    commercial: 'not_confirmed',
    commercial_note: 'PhishTank’s data terms need checking before commercial use, and its API needs an application key. Not confirmed. That application key is not in this build, so it is listed here but is not queried when you run a check.'
  }
];

export const COMMERCIAL_LABELS = {
  restricted: 'Terms restrict commercial use',
  not_confirmed: 'Commercial use not confirmed',
  ok: 'Commercial use stated as allowed'
};

export const CLAMAV = {
  name: 'ClamAV',
  operator: 'Cisco Talos (open source)',
  licence: 'GPL-2.0',
  covers: 'An antivirus engine for files, with its own signature database.',
  site: 'https://www.clamav.net/',
  commercial: 'ok',
  commercial_note: 'Open-source under GPL-2.0, so the licence itself does not restrict commercial use.'
};

export const WORDING_RULES = [
  'A source that has nothing on an item reads “Not found in these feeds”. That is never written as “clean” or “safe”.',
  'The strongest an item can read is “No hits in the checks run”. Nothing on SIFT AI certifies that a device is clean.',
  'Flagged needs two or more independent sources agreeing, or a known command-and-control address, or a known malware link.',
  'Unknown is one source on its own, sources that disagree, no feed data at all, or items raised by your own checklist.'
];