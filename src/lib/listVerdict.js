// The person's own allowlist and blocklist get the last word, and the result says
// so out loud either way. Kept in one place so every check that can be listed
// behaves the same.
export function applyList(verdict, hit) {
  const note = hit.entry?.note ? ` Your note on it: ${hit.entry.note}` : '';
  if (hit.kind === 'block') {
    return {
      ...verdict,
      level: 'flagged',
      headline: 'On your blocklist',
      lines: [
        `You put ${hit.entry.value} on your blocklist, so it comes back flagged here.`,
        `The checker on its own said: ${verdict.headline}.`
      ],
      next: `Take it off the list if you have changed your mind about it.${note}`,
      list: { kind: 'block', value: hit.entry.value }
    };
  }
  return {
    ...verdict,
    level: 'approved',
    headline: 'On your allowlist',
    lines: [
      `You put ${hit.entry.value} on your allowlist, so your list treats it as approved.`,
      `The checker's own finding, stated plainly: ${verdict.headline}.`
    ],
    next: `Watch it anyway. Your list decides what happens here, not whether the item is genuinely safe.${note}`,
    list: { kind: 'allow', value: hit.entry.value }
  };
}