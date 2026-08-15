import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let user = await base44.auth.me().catch(() => null);
    
    const schedulerSecret = Deno.env.get('SCHEDULER_SECRET');
    const providedSecret = req.headers.get('x-scheduler-secret') || req.headers.get('x-automation-secret');
    const isScheduler = schedulerSecret && providedSecret === schedulerSecret;
    if (isScheduler) { user = { id: 'scheduler' }; }

    if (!user) { return Response.json({ error: 'Unauthorized' }, { status: 401 }); }

    const body = await req.json();

    // The platform automatically parses the pubsub data and handles auth
    // We just need to read data.new_message_ids
    const messageIds = body.data?.new_message_ids ?? [];
    
    if (messageIds.length === 0) {
      return Response.json({ status: 'ok', processed: 0, threats_found: 0 });
    }

    const connectorId = '6a0f21a2f39d9bf2ebd374e6';
    
    let accessToken;
    try {
      // Connect to the specific user's app connection
      const connection = await base44.asServiceRole.connectors.getCurrentAppUserConnection(connectorId);
      accessToken = connection.accessToken;
    } catch (err) {
      console.error('Gmail webhook connection failed:', err.message);
      return Response.json({ error: 'Connection failed' }, { status: 401 });
    }
    
    const authHeader = { Authorization: `Bearer ${accessToken}` };
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
        
        let msgBody = '';
        if (message.payload.body?.data) {
          const b64 = message.payload.body.data.replace(/-/g, '+').replace(/_/g, '/');
          msgBody = atob(b64);
        } else if (message.payload.parts?.[0]?.body?.data) {
          const b64 = message.payload.parts[0].body.data.replace(/-/g, '+').replace(/_/g, '/');
          msgBody = atob(b64);
        }

        const analysisPrompt = `Analyze this email for phishing, scams, or malicious content.
        
From: ${from}
Subject: ${subject}
Body: ${msgBody.substring(0, 2000)}

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