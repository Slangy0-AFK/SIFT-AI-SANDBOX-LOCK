import { createClientFromRequest } from 'npm:@base44/sdk@0.8.34';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { indicator, type } = await req.json();
    if (!indicator || !type) {
      return Response.json({ error: 'Indicator and type are required' }, { status: 400 });
    }

    const ALIENVAULT_API_KEY = Deno.env.get('ALIENVAULT_API_KEY');
    if (!ALIENVAULT_API_KEY) {
      return Response.json({ error: 'AlienVault API key not configured' }, { status: 500 });
    }

    // Map type to AlienVault indicator type (e.g., IPv4, URL, fileHash)
    let otxType = '';
    if (type === 'ip') otxType = 'IPv4';
    else if (type === 'domain' || type === 'url') otxType = 'domain';
    else if (type === 'hash') otxType = 'file';
    else return Response.json({ error: 'Unsupported indicator type' }, { status: 400 });

    const response = await fetch(`https://otx.alienvault.com/api/v1/indicators/${otxType}/${encodeURIComponent(indicator)}/general`, {
      method: 'GET',
      headers: {
        'X-OTX-API-KEY': ALIENVAULT_API_KEY,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        // AlienVault returns 404 for indicators it doesn't know about. This is a clean result.
        return Response.json({ pulses: 0, known: false, details: 'Indicator not found in AlienVault OTX (Clean)' });
      }
      throw new Error(`AlienVault API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const pulses = data.pulse_info?.count || 0;
    
    let isThreat = false;
    let threatLevel = 'low';
    
    if (pulses > 0) {
      isThreat = true;
      threatLevel = pulses > 5 ? 'critical' : pulses > 2 ? 'high' : 'medium';
    }

    return Response.json({
      known: true,
      pulses: pulses,
      is_threat: isThreat,
      threat_level: threatLevel,
      details: data,
      tags: data.pulse_info?.pulses?.flatMap(p => p.tags) || []
    });

  } catch (error) {
    console.error('AlienVault check error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});