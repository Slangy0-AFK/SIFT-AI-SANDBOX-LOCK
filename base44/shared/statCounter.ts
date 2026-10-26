// The numbers the public pages show (device checks run, demo tries) are moved by
// whoever does the action. Visits are already counted once per address per day in
// trackVisit; the action counters are capped here, so one account cannot move a
// public number as far as it likes in a day.
//
// The increment is recorded before it is applied, so a loop stops at the ceiling
// instead of overshooting it. Running out never blocks the thing the person came
// for: they still get their check, the public number simply stops moving.
export const STAT_CAPS = {
  // Device checks counted on the public number, per account, per day.
  device_scan: { user: 100, scheduler: 500 },
  // Demo tries and breaches counted on the public number, per account, per day.
  paradox_try: { user: 50, scheduler: 500 },
};

const dayKey = () => new Date().toISOString().slice(0, 10);

const rows = (page) => (Array.isArray(page) ? page : page?.items || []);

// True when this increment may move the counter. A caller with no account has
// nothing stable to count against, so it shares one ceiling with every other
// anonymous caller and a rotating identity cannot buy a fresh allowance.
export async function countStat(base44, kind, user, isScheduler) {
  const caps = STAT_CAPS[kind];
  if (!caps) return true;

  const ownerKey = isScheduler ? 'scheduler' : user?.id ? `user:${user.id}` : 'guest';
  const cap = isScheduler ? caps.scheduler : caps.user;

  try {
    // The query is handed in on its own: in this runtime a second options
    // argument (a limit, a sort) comes back as an empty result, so the count is
    // taken from the rows themselves. Only the day's rows for this one caller
    // are ever read.
    const counted = rows(await base44.asServiceRole.entities.DailyCounter.filter({
      kind,
      owner_key: ownerKey,
      bucket: dayKey()
    }));
    if (counted.length >= cap) return false;

    await base44.asServiceRole.entities.DailyCounter.create({ kind, owner_key: ownerKey, bucket: dayKey() });
    return true;
  } catch (error) {
    // A counter is never worth failing a check over: if the store cannot be
    // read, the action goes ahead and the number stays where it is.
    console.warn(`[statCounter] ${kind} increment not counted:`, error && error.message);
    return false;
  }
}