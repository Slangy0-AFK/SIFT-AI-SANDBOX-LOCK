import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { trustedClientAddress } from '../../shared/clientAddress.ts';
import { automationState } from '../../shared/supportHarness.ts';
import {
  ATTEMPT_LIMIT,
  BLOCK_KIND,
  SHIELD_GATES,
  screenMessage,
  shieldReply
} from '../../shared/chatBotShield.ts';

// The filter in front of both chat bots, served as its own endpoint. The bots call
// the same layer directly (base44/shared/chatBotShield.ts), so there is one
// implementation and no second copy:
//
//   scannerHelper  — the in-app helper, before it answers or files a ticket
//   appSupport     — the support assistant, before it answers
//
// Nothing here ever returns a pattern, a rule, a prompt or a piece of a message: a
// refused message gets one short plain refusal, and the detail goes to the owner's
// log only. 'status' is for the owner alone.

const rows = (page) => (Array.isArray(page) ? page : page?.items || []);

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || 'screen');

    if (action === 'screen') {
      const text = String(body.text || '').slice(0, 4000);
      if (!text.trim()) return Response.json({ error: 'text is required' }, { status: 400 });

      const screened = await screenMessage(base44, {
        action: String(body.on_action || 'answer').slice(0, 40),
        bot: String(body.bot || 'endpoint').slice(0, 20),
        text,
        toolOutput: String(body.tool_output || '').slice(0, 4000),
        userId: user.id,
        clientKey: trustedClientAddress(req),
        ticketId: String(body.ticket_id || '').slice(0, 64),
        ticketNumber: String(body.ticket_number || '').slice(0, 32)
      });

      return Response.json(
        screened.ok
          ? { allowed: true, gate: screened.gate, message_id: screened.message_id }
          : { allowed: false, gate: screened.gate, message_id: screened.message_id, reply: screened.reply }
      );
    }

    if (action === 'shield_reply') {
      const reply = String(body.reply || '').slice(0, 6000);
      if (!reply.trim()) return Response.json({ error: 'reply is required' }, { status: 400 });

      const shielded = await shieldReply(base44, {
        action: String(body.on_action || 'answer').slice(0, 40),
        bot: String(body.bot || 'endpoint').slice(0, 20),
        reply,
        canary: String(body.canary || '').slice(0, 64),
        messageId: String(body.message_id || '').slice(0, 64),
        userId: user.id,
        clientKey: trustedClientAddress(req)
      });

      // held is returned; the reasons and the matched patterns are not.
      return Response.json({ text: shielded.text, held: shielded.held, signed_by: 'SIFT AI team' });
    }

    if (action === 'status') {
      // The owner alone sees how the filter is doing. Categories and counts only:
      // no message text is ever stored by this layer, so none can be shown.
      if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

      const state = await automationState(base44);
      const today = new Date().toISOString().slice(0, 10);
      const counted = rows(
        await base44.asServiceRole.entities.DailyCounter.filter({ kind: BLOCK_KIND, bucket: today })
      );
      const byCaller = {};
      counted.forEach((row) => {
        byCaller[row.owner_key] = (byCaller[row.owner_key] || 0) + 1;
      });

      const recent = rows(await base44.asServiceRole.entities.SupportAudit.list('-created_date', 25))
        .filter((row) => SHIELD_GATES.includes(row.gate))
        .slice(0, 5)
        .map((row) => ({
          id: row.id,
          at: row.created_date,
          message_id: row.message_id || '',
          gate: row.gate,
          decision: row.decision,
          reason: row.reason,
          bot: row.detail || ''
        }));

      return Response.json({
        paused: state.paused === true,
        reason: state.reason || '',
        attempt_limit: ATTEMPT_LIMIT,
        refused_today: byCaller,
        recent
      });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[chatBotShield] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}