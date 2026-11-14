import assert from 'node:assert/strict';
import { test } from 'node:test';

await import('../public/plugin/sift-guard.js');
const { createGuard } = globalThis.SiftGuard;
const policy = {
  locked_to: 'model',
  input: [{ category: 'blocked', signature: 'forbidden' }],
  reply: [{ category: 'secret', signature: 'secret' }],
  denied_tools: ['shell']
};
const makeGuard = (extra = {}) => createGuard({
  licenseKey: 'key', model: 'model', deploymentId: 'deployment',
  endpoint: 'https://license.example/check', cacheSeconds: 0.001,
  allowedTools: { lookup: { args: {} } }, killSwitch: false, sink: () => true,
  ...extra
});
const response = (body) => ({ status: 200, text: async () => JSON.stringify(body) });

test('guard blocks untrusted responses, unavailable policy and outages', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  let down = false;
  let badPolicy = false;
  globalThis.fetch = async (_url, request) => {
    assert.equal(request.redirect, 'error');
    if (down) throw new Error('offline');
    const body = JSON.parse(request.body);
    return response(body.action === 'policy'
      ? (badPolicy ? { ...policy, reply: [{ signature: '(' }] } : policy)
      : { status: 'Active', active: true, locked_to: 'model' });
  };
  const guard = makeGuard();
  assert.equal((await guard.ready()).active, true);
  assert.equal((await guard.guardMessage('hello')).allowed, true);
  assert.equal((await guard.guardMessage('forbidden')).allowed, false);
  assert.equal((await guard.filterReply('secret')).clean, false);
  assert.equal((await guard.runTool({ name: 'lookup', handler: () => 'ok' })).result, 'ok');
  down = true;
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal((await guard.guardMessage('hello')).allowed, false);
  let called = false;
  assert.equal((await guard.runTool({ name: 'lookup', handler: () => { called = true; } })).blocked, true);
  assert.equal(called, false);
  assert.equal((await guard.filterReply('hello')).clean, false);
  down = false;
  badPolicy = true;
  assert.equal((await makeGuard().ready()).active, false);
  globalThis.fetch = async () => response({ status: 'Active', active: true, locked_to: 'model', kill_switch: true });
  assert.equal((await makeGuard().ready()).stopped, true);
  assert.equal((await makeGuard({ licenseKey: '' }).guardMessage('hello')).allowed, false);
});

test('guard refuses invalid bindings, expired keys, insecure URLs and unreadable switches', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => response({ status: 'Active', active: true, locked_to: 'other' });
  assert.equal((await makeGuard().guardMessage('hello')).allowed, false);
  globalThis.fetch = async () => response({
    status: 'Active', active: true, locked_to: 'model', expires_at: '2000-01-01T00:00:00Z'
  });
  assert.equal((await makeGuard().ready()).active, false);
  assert.equal((await makeGuard({ endpoint: 'http://license.example/check' }).ready()).active, false);
  const switched = await makeGuard({ killSwitch: 'unexpected' }).ready();
  assert.equal(switched.stopped, true);
  assert.equal(switched.category, 'kill_switch_unreadable');
  const previous = process.env.SIFT_KILL_SWITCH;
  t.after(() => {
    if (previous === undefined) delete process.env.SIFT_KILL_SWITCH;
    else process.env.SIFT_KILL_SWITCH = previous;
  });
  process.env.SIFT_KILL_SWITCH = 'on';
  assert.equal((await makeGuard({ killSwitch: false }).ready()).stopped, true);
});

test('guard rejects invalid cache values and blocks when reply audit fails', async (t) => {
  for (const value of [NaN, -1, 601]) assert.throws(() => makeGuard({ cacheSeconds: value }), RangeError);
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async (_url, request) => response(
    JSON.parse(request.body).action === 'policy'
      ? policy : { status: 'Active', active: true, locked_to: 'model' }
  );
  let auditWorks = true;
  const guard = makeGuard({ sink: () => auditWorks });
  assert.equal((await guard.ready()).active, true);
  auditWorks = undefined;
  assert.equal((await guard.filterReply('hello')).clean, false);
  assert.equal(guard.state().stopped, true);
  const noSink = makeGuard({ sink: undefined });
  assert.equal((await noSink.guardMessage('hello')).category, 'audit_unavailable');
});

test('concurrent validations share a check and recheck the local stop switch', async (t) => {
  const originalFetch = globalThis.fetch;
  const previous = process.env.SIFT_KILL_SWITCH;
  t.after(() => {
    globalThis.fetch = originalFetch;
    if (previous === undefined) delete process.env.SIFT_KILL_SWITCH;
    else process.env.SIFT_KILL_SWITCH = previous;
  });
  delete process.env.SIFT_KILL_SWITCH;
  let checks = 0;
  let policies = 0;
  globalThis.fetch = async (_url, request) => {
    const action = JSON.parse(request.body).action;
    if (action === 'check') checks += 1;
    else policies += 1;
    await new Promise((resolve) => setTimeout(resolve, 10));
    return response(action === 'policy' ? policy : { status: 'Active', active: true, locked_to: 'model' });
  };
  const guard = makeGuard({ cacheSeconds: 600 });
  const results = await Promise.all([guard.ready(), guard.ready(), guard.ready()]);
  assert.ok(results.every((result) => result.active));
  assert.equal(checks, 1);
  assert.equal(policies, 1);

  let release;
  let started;
  const began = new Promise((resolve) => { started = resolve; });
  const wait = new Promise((resolve) => { release = resolve; });
  globalThis.fetch = async (_url, request) => {
    const action = JSON.parse(request.body).action;
    if (action === 'check') { started(); await wait; }
    return response(action === 'policy' ? policy : { status: 'Active', active: true, locked_to: 'model' });
  };
  const stoppedGuard = makeGuard();
  const pending = stoppedGuard.ready();
  await began;
  process.env.SIFT_KILL_SWITCH = 'on';
  release();
  assert.equal((await pending).stopped, true);
});
