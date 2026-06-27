
const req = {
  headers: { get: () => null },
  json: async () => ({})
};
const base44 = {
  auth: { me: async () => null },
  asServiceRole: {}
};
const createClientFromRequest = () => base44;

async function run() {
  try {
    const base44 = createClientFromRequest(req);

    const schedulerSecret = '123';
    const providedSecret = req.headers.get('x-scheduler-secret');
    const isScheduler = schedulerSecret && providedSecret === schedulerSecret;
    const isAutomation = req.headers.get('x-automation-id') != null || req.headers.get('x-entity-automation') != null;

    if (!isScheduler && !isAutomation) {
      const user = await base44.auth.me().catch(() => null);
      if (!user || user.role !== 'admin') {
        return { error: 'Forbidden' };
      }
    }

    const base44Service = base44.asServiceRole;
    return base44Service;
  } catch (error) {
    return { error: error.message };
  }
}
run().then(console.log);
