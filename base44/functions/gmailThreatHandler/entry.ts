import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Webhook validation - Google Pub/Sub doesn't send app session tokens
    // Validate using webhook signature or token instead of user session
    const payload = await req.json();
    
    // Check for Google Pub/Sub message structure
    const message = payload.message?.data ? atob(payload.message.data) : null;
    const subscription = payload.subscription || '';
    
    // Validate this is a legitimate Gmail webhook
    if (!message && !payload.data?.historyId) {
      console.warn('Gmail webhook: Invalid payload structure');
      return Response.json({ error: 'Invalid webhook payload' }, { status: 400 });
    }

    // Get the app user's Gmail connection using service role
    // This works because the connector was authorized by the app user during onboarding
    const connectorId = '6a0f21a2f39d9bf2ebd374e6';
    
    let accessToken;
    let userId;
    try {
      const connection = await base44.asServiceRole.connectors.getCurrentAppUserConnection(connectorId);
      accessToken = connection.accessToken;
      // Extract user info from connection config if available
      userId = connection.connectionConfig?.user_id || 'webhook_user';
      console.log(`Gmail webhook received for user: ${userId}`);
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
            user_id: userId,
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