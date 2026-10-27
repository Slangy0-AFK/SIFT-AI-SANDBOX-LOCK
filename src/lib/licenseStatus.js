// One badge for a license status, shared by the buyer's own views and the
// team's list, so "Revoked" never ends up looking like "Active".
const STATUS_CLASSES = {
  Active: 'border-primary/40 bg-primary/10 text-primary',
  'Founding (free)': 'border-primary/40 bg-primary/10 text-primary',
  Revoked: 'border-destructive/40 bg-destructive/10 text-destructive',
  Expired: 'border-amber-400/40 bg-amber-400/10 text-amber-400',
  None: 'border-border bg-secondary/40 text-muted-foreground',
};

export const licenseBadgeClass = (label) => STATUS_CLASSES[label] || STATUS_CLASSES.None;