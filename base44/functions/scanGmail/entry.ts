import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get Gmail access token
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    // Fetch recent messages (last 50)
    const res = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50',
      { headers: authHeader }
    );
    
    if (!res.ok) {
      throw new Error('Failed to fetch Gmail messages');
    }

    const { messages = [] } = await res.json();
    const threats = [];

    // Analyze each message
    for (const msg of messages.slice(0, 20)) { // Limit to 20 for performance
      const fullRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
        { headers: authHeader }
      );
      
      if (!fullRes.ok) continue;
      
      const message = await fullRes.json();
      
      // Extract headers and body
      const headers = message.payload.headers;
      const from = headers.find(h => h.name === 'From')?.value || '';
      const subject = headers.find(h => h.name === 'Subject')?.value || '';
      const date = headers.find(h => h.name === 'Date')?.value || '';
      
      // Decode body
      let body = '';
      if (message.payload.body?.data) {
        body = atob(message.payload.body.data);
      } else if (message.payload.parts?.[0]?.body?.data) {
        body = atob(message.payload.parts[0].body.data);
      }

      // Use InvokeLLM to analyze for threats
      const analysisPrompt = `Analyze this email for phishing, scams, or malicious content.
      
From: ${from}
Subject: ${subject}
Body: ${body.substring(0, 2000)}

Return a JSON response with:
{
  "is_threat": boolean,
  "threat_type": "phishing" | "scam" | "malware" | "spoofing" | "safe" | null,
  "confidence": number (0-100),
  "reason": string (brief explanation)
}`;

      const llmRes = await base44.integrations.Core.InvokeLLM({
        prompt: analysisPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            is_threat: { type: "boolean" },
            threat_type: { type: ["string", "null"] },
            confidence: { type: "number" },
            reason: { type: "string" }
          },
          required: ["is_threat", "threat_type", "confidence", "reason"]
        }
      });

      const analysis = JSON.parse(llmRes);

      if (analysis.is_threat) {
        // Create threat record
        const threat = await base44.entities.EmailThreat.create({
          user_id: user.id,
          message_id: msg.id,
          from_address: from,
          subject,
          threat_type: analysis.threat_type,
          confidence_score: analysis.confidence,
          analysis_reason: analysis.reason,
          status: 'detected',
          scanned_date: new Date().toISOString()
        });

        threats.push({
          threat_id: threat.id,
          message_id: msg.id,
          from: from,
          subject,
          threat_type: analysis.threat_type,
          confidence: analysis.confidence,
          reason: analysis.reason
        });

        // Optionally label in Gmail
        try {
          await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}/modify`,
            {
              method: 'POST',
              headers: authHeader,
              body: JSON.stringify({
                addLabelIds: ['Label_1'] // Will create "Threat" label
              })
            }
          );
        } catch (e) {
          console.error('Failed to label message:', e);
        }
      }
    }

    return Response.json({ 
      scanned: messages.length,
      threats_found: threats.length,
      threats 
    });
  } catch (error) {
    console.error('Gmail scan error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});