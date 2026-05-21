import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get authenticated user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if this is a test connection call
    const body = await req.json().catch(() => ({}));
    if (body.testConnection) {
      // Just verify connection exists
      const connectorId = '6a0f2325e2853c72f54ef687';
      await base44.asServiceRole.connectors.getCurrentAppUserConnection(connectorId);
      return Response.json({ connected: true });
    }
    
    // Get the app user's Outlook connection
    const connectorId = Deno.env.get('OUTLOOK_CONNECTOR_ID') || '6a0f2325e2853c72f54ef687';
    
    let accessToken;
    try {
      const connection = await base44.asServiceRole.connectors.getCurrentAppUserConnection(connectorId);
      accessToken = connection.accessToken;
      console.log(`Outlook scan for user: ${user.email}`);
    } catch (err) {
      console.error('Outlook auth failed:', err.message);
      return Response.json({ error: 'Outlook connection not found' }, { status: 401 });
    }
    
    const authHeader = { Authorization: `Bearer ${accessToken}` };
    
    // Fetch recent messages from Outlook (last 20)
    const res = await fetch(
      'https://graph.microsoft.com/v1.0/me/messages?$top=20&$select=from,subject,body,receivedDateTime',
      { headers: authHeader }
    );
    
    if (!res.ok) {
      throw new Error(`Outlook API error: ${res.status}`);
    }
    
    const data = await res.json();
    const messages = data.value || [];
    
    if (messages.length === 0) {
      return Response.json({ status: 'ok', processed: 0, threats_found: 0 });
    }

    let threatsFound = 0;

    // Analyze each message
    for (const message of messages.slice(0, 10)) {
      try {
        const from = message.from?.emailAddress?.address || '';
        const subject = message.subject || '';
        const body = message.body?.content || '';

        const analysisPrompt = `Analyze this email for phishing, scams, or malicious content.
        
From: ${from}
Subject: ${subject}
Body: ${body.substring(0, 2000)}

Return JSON:
{
  "is_threat": boolean,
  "threat_type": "phishing" | "scam" | "malware" | "spoofing" | "safe" | null,
  "confidence": number (0-100),
  "reason": string
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
          await base44.entities.EmailThreat.create({
            user_id: user.id,
            message_id: message.id,
            from_address: from,
            subject,
            threat_type: analysis.threat_type,
            confidence_score: analysis.confidence,
            analysis_reason: analysis.reason,
            status: 'detected',
            scanned_date: new Date().toISOString()
          });

          threatsFound++;
        }
      } catch (err) {
        console.error('Error processing Outlook message:', err);
        continue;
      }
    }

    return Response.json({ 
      status: 'ok', 
      processed: messages.length,
      threats_found: threatsFound 
    });
  } catch (error) {
    console.error('Outlook scan error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});