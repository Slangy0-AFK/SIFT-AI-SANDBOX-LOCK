import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Webhook from automation (event payload)
    const payload = await req.json();
    const { event, data } = payload;

    if (!data || !data.id || data.status === 'resolved') {
      return Response.json({ success: true, message: 'Nothing to resolve' });
    }

    const prompt = `You are a helpful automated support agent for SIFT-AI. A user submitted the following ticket:\nTitle: ${data.title}\nDescription: ${data.description}\n\nPlease provide a helpful, concise resolution or guide to solve their issue.`;

    const reply = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt });

    await base44.asServiceRole.entities.SupportTicket.update(data.id, {
      status: 'resolved',
      agent_response: reply
    });

    return Response.json({ success: true, resolved: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});