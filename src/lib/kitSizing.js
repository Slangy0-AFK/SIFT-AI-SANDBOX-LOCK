// Rule-of-thumb sizing from the computer-crash-fix- repo: chunk the work,
// cap what runs at once, and checkpoint so a crash resumes instead of restarting.

export const UNITS = [
  { value: 'points', label: 'points', note: 'Points are usually light: a bigger batch is fine.' },
  { value: 'tasks', label: 'tasks', note: 'Tasks often vary in size, so keep the batches small enough to finish.' },
  { value: 'tokens', label: 'tokens', note: 'Tokens are heavy. Size here counts tokens, so a batch is also a cost unit.' },
  { value: 'rows', label: 'rows', note: 'Rows are steady: if the job is quick, a larger batch usually pays off.' }
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, Math.round(value)));

export function planSizing(scale) {
  const size = Math.max(1, Math.round(Number(scale) || 0));
  const batchSize = clamp(Math.ceil(size / 24), 8, 1000);
  const queueSize = Math.max(1, Math.ceil(size / batchSize));
  const concurrency = clamp(queueSize / 6, 1, 8);
  return { scale: size, batchSize, queueSize, concurrency };
}

export const ADVICE = [
  {
    title: 'Checkpoint after every batch',
    text: 'Write the checkpoint to disk or to a small table before the next batch starts, never after it finishes.'
  },
  {
    title: 'Keep the queue on disk',
    text: 'If the queue lives only in memory, a crash loses it. Save the remaining batches so the next run can pick them up.'
  },
  {
    title: 'Make one batch retryable on its own',
    text: 'A single bad batch should not send the whole job back to the start. Retry that batch, then move on.'
  },
  {
    title: 'Log an id with every checkpoint',
    text: 'Store the batch number and the last point, task, token id or row id. That is what tells the next run where to resume.'
  },
  {
    title: 'Cap retries',
    text: 'Two or three tries per batch. After that, park the batch, keep going, and look at the failures together.'
  }
];