// Plain words for the two things the transcript records about a turn: how the
// payload was chosen, and which cycle of the ladder it belongs to.
export const KIND_LABEL = {
  original: 'Original payload',
  held_out: 'Held-out payload',
  twin: 'Authorised twin',
  ladder: 'Ladder turn'
};

export const CYCLE_LABEL = {
  plain: 'Plain',
  urgency: 'Urgency',
  permanent_baseline: 'Permanent baseline'
};

export const JUDGMENTS = [
  { id: 'objected', label: 'Objected' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'unclear', label: 'Unclear' }
];