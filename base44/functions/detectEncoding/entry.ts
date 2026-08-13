import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Allow: scheduler secret header, entity automation, or authenticated user
    const schedulerSecret = Deno.env.get('SCHEDULER_SECRET');
    const providedSecret = req.headers.get('x-scheduler-secret') || req.headers.get('x-automation-secret');
    const isScheduler = schedulerSecret && providedSecret === schedulerSecret;
    
    let user = null;
    if (!isScheduler) {
      user = await base44.auth.me().catch(() => null);
      if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
      }
    }

    const { content, source } = await req.json();
    
    if (!content) {
      return Response.json({ error: 'Content required' }, { status: 400 });
    }

    // Detection results
    const results = {
      encoding_detected: 'none',
      obfuscation_level: 0,
      confidence: 0,
      indicators: [],
      decoded_content: null,
      threat_indicators: []
    };

    // Base64 detection pattern
    const base64Pattern = /^(?:[A-Za-z0-9+\/]{4})*(?:[A-Za-z0-9+\/]{2}==|[A-Za-z0-9+\/]{3}=)?$/;
    const base64UrlPattern = /^(?:[A-Za-z0-9-_]{4})*(?:[A-Za-z0-9-_]{2}==|[A-Za-z0-9-_]{3}=)?$/;
    
    // Base60 detection (sexagesimal - digits 0-9 and letters A-Z excluding some)
    // Base60 typically uses: 0-9, A-Z (excluding I, O to avoid confusion with 1, 0)
    const base60Pattern = /^[0-9A-HJ-NP-Z]+$/;
    
    // Base32 detection
    const base32Pattern = /^[A-Z2-7]+=*$/;
    
    // Hex detection
    const hexPattern = /^[0-9A-Fa-f]+$/;

    let encodingFound = 'none';
    let confidence = 0;
    let obfuscationLevel = 0;

    // Check for Base64
    if (base64Pattern.test(content.trim()) || base64UrlPattern.test(content.trim())) {
      if (content.length > 20) {
        encodingFound = 'base64';
        confidence = 85;
        obfuscationLevel = 6;
        results.indicators.push('Valid Base64 structure detected');
        
        // Try to decode
        try {
          const decoded = atob(content.trim());
          results.decoded_content = decoded;
          
          // Check if decoded content contains suspicious patterns
          const suspiciousPatterns = [
            /eval\s*\(/i,
            /exec\s*\(/i,
            /function\s*\(/i,
            /script/i,
            /import\s+/i,
            /require\s*\(/i,
            /document\./i,
            /window\./i
          ];
          
          suspiciousPatterns.forEach(pattern => {
            if (pattern.test(decoded)) {
              results.threat_indicators.push(`Suspicious pattern detected: ${pattern.source}`);
              obfuscationLevel += 2;
            }
          });
          
          if (results.threat_indicators.length > 0) {
            confidence = 95;
            obfuscationLevel = Math.min(obfuscationLevel + 2, 10);
          }
        } catch (e) {
          results.indicators.push('Base64 decoding failed - possibly corrupted or custom encoding');
          confidence = 70;
        }
      }
    }
    
    // Check for Base60 (sexagesimal)
    if (encodingFound === 'none' && base60Pattern.test(content.trim()) && content.length > 30) {
      // Additional check: base60 typically has specific length patterns
      const charSet = new Set(content.replace(/[^0-9A-HJ-NP-Z]/g, ''));
      if (charSet.size > 20) {
        encodingFound = 'base60';
        confidence = 65;
        obfuscationLevel = 7;
        results.indicators.push('Possible Base60 (sexagesimal) encoding detected');
        results.indicators.push('This is an unusual encoding method - may indicate custom obfuscation');
        
        // Base60 is not standard, so we flag it as high obfuscation
        confidence = 75;
      }
    }
    
    // Check for Base32
    if (encodingFound === 'none' && base32Pattern.test(content.trim()) && content.length > 20) {
      encodingFound = 'base32';
      confidence = 80;
      obfuscationLevel = 5;
      results.indicators.push('Base32 encoding detected');
    }
    
    // Check for Hex
    if (encodingFound === 'none' && hexPattern.test(content.trim()) && content.length > 40 && content.length % 2 === 0) {
      encodingFound = 'hex';
      confidence = 75;
      obfuscationLevel = 4;
      results.indicators.push('Hexadecimal encoding detected');
    }
    
    // Check for mixed/layered encoding
    const hasMultipleEncodings = [
      base64Pattern.test(content.trim()),
      base60Pattern.test(content.trim()),
      base32Pattern.test(content.trim()),
      hexPattern.test(content.trim())
    ].filter(Boolean).length > 1;
    
    if (hasMultipleEncodings) {
      encodingFound = 'mixed';
      confidence = 90;
      obfuscationLevel = 9;
      results.indicators.push('Multiple encoding layers detected - high obfuscation');
      results.threat_indicators.push('Layered encoding often indicates deliberate evasion attempt');
    }
    
    // Check for unicode obfuscation
    const unicodeRatio = (content.match(/[^\x00-\x7F]/g) || []).length / content.length;
    if (unicodeRatio > 0.3) {
      if (encodingFound === 'none') {
        encodingFound = 'unicode';
      }
      confidence = Math.max(confidence, 70);
      obfuscationLevel += 3;
      results.indicators.push(`High unicode character ratio: ${(unicodeRatio * 100).toFixed(1)}%`);
      results.threat_indicators.push('Unicode obfuscation detected');
    }
    
    // Final assessment
    results.encoding_detected = encodingFound;
    results.obfuscation_level = Math.min(obfuscationLevel, 10);
    results.confidence = confidence;
    
    // Log detected encoding threat if significant (using service role)
    if (confidence > 60 && obfuscationLevel >= 5) {
      try {
        await base44.asServiceRole.entities.ZeroDayAnomaly.create({
          anomaly_signature: `ENC-${encodingFound}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          anomaly_type: encodingFound === 'base64' ? 'base64_obfuscation' : encodingFound === 'base60' ? 'base60_anomaly' : 'encoded_payload',
          severity: obfuscationLevel >= 8 ? 'critical' : obfuscationLevel >= 6 ? 'warning' : 'info',
          status: 'detected',
          agent_id: 'encoding_detector',
          source_ip: 'local',
          payload_hash: await hashContent(content),
          environment: 'production',
          confidence_score: confidence,
          encoding_detected: encodingFound,
          obfuscation_level: obfuscationLevel,
          mitigation_applied: null,
          notes: `Encoding detection: ${encodingFound}, Obfuscation: ${obfuscationLevel}/10, Indicators: ${results.indicators.join('; ')}`
        });
      } catch (e) {
        console.error('Failed to log encoding threat:', e);
      }
    }
    
    return Response.json(results);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function hashContent(content) {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}