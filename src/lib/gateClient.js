import { base44 } from '@/api/base44Client';

// Seal an action, then check it, through the same demo endpoint the marketplace
// test uses. The action is never executed: only the gates run.
export async function sealedCheck(request, sessionId) {
  const sealed = await base44.functions.invoke('governorDemo', {
    step: 'seal',
    request,
    ...(sessionId ? { session_id: sessionId } : {})
  });
  const seal = sealed.data?.seal;
  if (!seal) throw new Error('The action could not be sealed.');

  const checked = await base44.functions.invoke('governorDemo', {
    step: 'check',
    request,
    seal,
    ...(sessionId ? { session_id: sessionId } : {})
  });
  return checked.data;
}

export const VERDICT_WORDS = {
  pass: 'Allowed to run',
  hold: 'Held for a person',
  block: 'Stopped'
};