import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const esc = (s: string) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, message } = await req.json();
    const core = base44.asServiceRole.integrations.Core;

    if (action === 'support_chat') {
      const text = String(message || '').slice(0, 2000);
      if (!text.trim()) return Response.json({ error: 'Message required' }, { status: 400 });
      const reply = await core.InvokeLLM({
        prompt: `You are the Sift-AI support assistant. Answer concisely. Sift-AI offers browser device diagnostics, VirusTotal/AlienVault reputation lookups, email and SMS threat analysis, an embeddable human-verification widget, a developer scan API, IP allowlists and data retention settings.\n\nUser question: ${text}`,
      });
      return Response.json({ reply });
    }

    if (action === 'feedback') {
      const text = String(message || '').slice(0, 5000);
      if (!text.trim()) return Response.json({ error: 'Feedback required' }, { status: 400 });
      await core.SendEmail({
        to: 'support@sift-ai-shield.app',
        subject: 'SIFT-AI User Feedback',
        body: `<p>From: ${esc(user.email)}</p><p>${esc(text)}</p>`,
      });
      return Response.json({ ok: true });
    }

    if (action === 'account_deletion') {
      await core.SendEmail({
        to: 'privacy@sift-ai-security.app',
        subject: 'Account Deletion Request',
        body: `User ${esc(user.email)} (ID: ${esc(user.id)}) has requested full account deletion from Sift-AI.`,
      });
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('appSupport error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});