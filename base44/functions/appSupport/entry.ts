import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { admit, admitSpend, audit } from '../../shared/supportHarness.ts';
import { HELP_ARTICLES, helpBlock, searchHelp } from '../../shared/supportHelp.ts';

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

      // The harness decides before anything is said or spent: the tool gate, the
      // owner's kill switch and the audit log. A refusal stops the reply and
      // points the person at the ticket form.
      const admitted = await admit(base44, {
        action: 'support_chat',
        actor: 'agent',
        detail: 'support hub chat message'
      });
      if (!admitted.ok) {
        return Response.json({
          reply: 'The automatic support chat is switched off right now. Please use the ticket form on this page and a person will pick it up.',
          paused: true,
          gate: admitted.gate
        });
      }

      // Each reply costs an integration credit. Counted before the call so a
      // loop stops at the cap.
      if (!(await admitSpend(base44, 'support_chat', user.id, { action: 'support_chat' }))) {
        return Response.json({ reply: "The support chat has reached today's limit. Please try again tomorrow." });
      }

      // Grounded in the same help articles as the helper, the ticket automation
      // and the support agent. There is no second copy of the answers.
      const matched = searchHelp(text, 3);
      const articles = matched.length ? matched : HELP_ARTICLES.slice(0, 3);

      const reply = await core.InvokeLLM({
        prompt: `You are the SIFT AI support assistant, helping a non-technical person with SIFT AI, a browser-based checker for rogue or unauthorised AI.

Rules you must follow:
- Answer only from the help articles below. If they do not cover it, say so plainly and point the person at the ticket form on the support page.
- Never state or imply that a device, app, link or message is clean, safe or guaranteed. A check is a check, not a certificate.
- Never invent a threat-intelligence or scan result, a price, a refund or a payout date.
- VirusTotal checks are not offered here: the free VirusTotal Public API must not be used in a commercial product, so never describe a VirusTotal check as something SIFT AI does or will do.
- Never ask for a password, one-time code, API key, card or bank number, phone number, IMEI or serial number.
- Never name any individual: you are the SIFT AI support team.
- Keep it short, plain and calm, with no jargon.

Help articles:
${helpBlock(articles)}

The person asks: ${text}`,
      });

      await audit(base44, {
        action: 'support_chat',
        gate: 'outcome',
        decision: 'completed',
        reason: 'answered from the help articles',
        actor: 'agent'
      });

      return Response.json({ reply });
    }

    if (action === 'feedback') {
      const text = String(message || '').slice(0, 5000);
      if (!text.trim()) return Response.json({ error: 'Feedback required' }, { status: 400 });
      if (!(await admitSpend(base44, 'support_email', user.id, { action: 'feedback' }))) {
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
        from_name: 'SIFT AI Support',
        subject: 'SIFT AI user feedback',
        body: `<p>From: ${esc(user.email)}</p><p>${esc(text)}</p>`,
        category: 'transactional',
      });
      return Response.json({ ok: true });
    }

    if (action === 'account_deletion') {
      if (!(await admitSpend(base44, 'support_email', user.id, { action: 'account_deletion' }))) {
        return Response.json({ error: "Today's message limit is reached. Please try again tomorrow." }, { status: 429 });
      }
      const ownerEmail = Deno.env.get('ADMIN_EMAIL');
      if (!ownerEmail) {
        console.error('[appSupport] ADMIN_EMAIL is not set: deletion request email not sent');
        return Response.json({ error: 'Deletion requests are not configured yet. Please try again later.' }, { status: 500 });
      }
      await core.SendEmail({
        to: ownerEmail,
        from_name: 'SIFT AI Support',
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