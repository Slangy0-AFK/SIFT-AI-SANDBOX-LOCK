import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { spendCredit } from '../../shared/creditGuard.ts';

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
      // Each reply costs an integration credit. Counted before the call so a
      // loop stops at the cap.
      if (!(await spendCredit(base44, 'support_chat', user.id))) {
        return Response.json({ reply: "The support chat has reached today's limit. Please try again tomorrow." });
      }
      const reply = await core.InvokeLLM({
        prompt: `You are the SIFT AI support assistant. Answer concisely. SIFT AI offers browser device diagnostics, AlienVault OTX reputation checks, SIFT AI's own rogue-AI checklist, email and SMS threat analysis, an embeddable human-verification widget, a developer scan API, IP allowlists and data retention settings. VirusTotal checks are NOT offered: they are unavailable because the free VirusTotal Public API must not be used in a commercial product, so never describe a VirusTotal check as something SIFT AI does or will do.\n\nUser question: ${text}`,
      });
      return Response.json({ reply });
    }

    if (action === 'feedback') {
      const text = String(message || '').slice(0, 5000);
      if (!text.trim()) return Response.json({ error: 'Feedback required' }, { status: 400 });
      if (!(await spendCredit(base44, 'support_email', user.id))) {
        return Response.json({ error: "Today's message limit is reached. Please try again tomorrow." }, { status: 429 });
      }
      // Read server-side from the app's own configuration. It is never returned
      // to the caller and never appears on a page.
      const ownerEmail = Deno.env.get('ADMIN_EMAIL');
      if (!ownerEmail) {
        console.error('[appSupport] ADMIN_EMAIL is not set: feedback email not sent');
        return Response.json({ error: 'Feedback is not configured yet. Please try again later.' }, { status: 500 });
      }
      await core.SendEmail({
        to: ownerEmail,
        subject: 'SIFT AI user feedback',
        body: `<p>From: ${esc(user.email)}</p><p>${esc(text)}</p>`,
        category: 'transactional',
      });
      return Response.json({ ok: true });
    }

    if (action === 'account_deletion') {
      if (!(await spendCredit(base44, 'support_email', user.id))) {
        return Response.json({ error: "Today's message limit is reached. Please try again tomorrow." }, { status: 429 });
      }
      const ownerEmail = Deno.env.get('ADMIN_EMAIL');
      if (!ownerEmail) {
        console.error('[appSupport] ADMIN_EMAIL is not set: deletion request email not sent');
        return Response.json({ error: 'Deletion requests are not configured yet. Please try again later.' }, { status: 500 });
      }
      await core.SendEmail({
        to: ownerEmail,
        subject: 'SIFT AI account deletion request',
        body: `User ${esc(user.email)} (ID: ${esc(user.id)}) has requested full account deletion from SIFT AI.`,
        category: 'transactional',
      });
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('appSupport error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});