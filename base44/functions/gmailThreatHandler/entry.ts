import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get authenticated user first
    const user = await base44.auth.me();
    if (!user) {
      console.warn('Gmail webhook: No authenticated user');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify webhook authenticity using history ID from payload
    const payload = await req.json();
    const historyId = payload.data?.historyId;
    
    if (!historyId) {
      console.warn('Gmail webhook: Missing historyId - potential spoofed request');
      return Response.json({ error: 'Invalid webhook payload' }, { status: 400 });
    }

    // Get the app user's Gmail connection
    const connectorId = '6a0f21a2f39d9bf2ebd374e6';
    
    let accessToken;
    try {
      const connection = await base44.asServiceRole.connectors.getCurrentAppUserConnection(connectorId);
      accessToken = connection.accessToken;
      console.log(`Gmail webhook received with historyId: ${historyId}`);
    } catch (err) {
      console.error('Gmail webhook connection failed:', err.message);
      return Response.json({ error: 'Connection failed' }, { status: 401 });
    }
    
    const authHeader = { Authorization: `Bearer ${accessToken}` };
    const messageIds = payload.data?.new_message_ids || [];
    
    if (messageIds.length === 0) {
      return Response.json({ status: 'ok', processed: 0 });
    }

    let threatsFound = 0;

    // Analyze each new message
    for (const messageId of messageIds.slice(0, 10)) {
      try {
        const res = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
          { headers: authHeader }
        );
        
        if (!res.ok) continue;
        
        const message = await res.json();
        
        const headers = message.payload.headers;
        const from = headers.find(h => h.name === 'From')?.value || '';
        const subject = headers.find(h => h.name === 'Subject')?.value || '';
        
        let body = '';
        if (message.payload.body?.data) {
          body = atob(message.payload.body.data);
        } else if (message.payload.parts?.[0]?.body?.data) {
          body = atob(message.payload.parts[0].body.data);
        }

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
          await base44.asServiceRole.entities.EmailThreat.create({
            user_id: user.id,
            message_id: messageId,
            from_address: from,
            subject,
            threat_type: analysis.threat_type,
            confidence_score: analysis.confidence,
            analysis_reason: analysis.reason,
            status: 'detected',
            scanned_date: new Date().toISOString()
          });

          try {
            await fetch(
              `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`,
              {
                method: 'POST',
                headers: authHeader,
                body: JSON.stringify({ addLabelIds: ['Label_1'] })
              }
            );
          } catch (e) {
            console.error('Failed to label:', e);
          }

          threatsFound++;
        }
      } catch (err) {
        console.error('Error processing message:', err);
        continue;
      }
    }

    return Response.json({ 
      status: 'ok', 
      processed: messageIds.length,
      threats_found: threatsFound 
    });
  } catch (error) {
    console.error('Gmail webhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});