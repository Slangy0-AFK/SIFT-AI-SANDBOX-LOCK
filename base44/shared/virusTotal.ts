// VirusTotal reputation lookup shared by checkVirusTotal and scanApi.
// Returns { status, body } so callers can wrap it in their own Response.
export async function lookupVirusTotal(apiKey, type, value) {
  let endpoint;
  if (type === 'ip') endpoint = `https://www.virustotal.com/api/v3/ip_addresses/${encodeURIComponent(value)}`;
  else if (type === 'domain') endpoint = `https://www.virustotal.com/api/v3/domains/${encodeURIComponent(value)}`;
  else if (type === 'url') endpoint = `https://www.virustotal.com/api/v3/urls/${btoa(value).replace(/=/g, '')}`;
  else if (type === 'hash') endpoint = `https://www.virustotal.com/api/v3/files/${encodeURIComponent(value)}`;
  else return { status: 400, body: { error: 'Invalid type. Must be: ip, domain, url, or hash' } };

  const response = await fetch(endpoint, { headers: { 'x-apikey': apiKey, 'Accept': 'application/json' } });

  if (response.status === 404) {
    return { status: 200, body: { found: false, message: 'No analysis found for this item', data: null } };
  }
  if (!response.ok) {
    const error = await response.text();
    return { status: response.status, body: { error: `VirusTotal API error: ${error}` } };
  }

  const result = await response.json();
  const stats = result.data?.attributes?.last_analysis_stats || {};
  const malicious = stats.malicious || 0;
  const suspicious = stats.suspicious || 0;
  const total = Object.values(stats).reduce((a, b) => a + b, 0);

  return {
    status: 200,
    body: {
      found: true,
      type,
      value,
      data: result.data,
      stats,
      threatLevel: malicious > 5 ? 'critical' : malicious > 2 ? 'high' : malicious > 0 ? 'medium' : suspicious > 0 ? 'warning' : 'safe',
      scannedBy: total,
      maliciousCount: malicious,
      suspiciousCount: suspicious,
    },
  };
}