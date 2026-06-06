// Minimal in-memory mock of the Base44 client used by the frontend.
// Purpose: allow local testing without Base44 credits. Not a full SDK.

function makeStore() {
  const items = [];
  return {
    list: async (order = '-created_date', limit = 50) => {
      return items.slice(0, limit);
    },
    filter: async (q = {}) => {
      // naive filter: return all for now
      return items;
    },
    create: async (d) => {
      const id = `${Date.now()}-${Math.floor(Math.random()*1000)}`;
      const rec = { id, ...d, created_date: new Date().toISOString(), updated_date: new Date().toISOString() };
      items.unshift(rec);
      notifySubscribers(rec);
      return rec;
    },
    update: async (id, d) => {
      const idx = items.findIndex(i => i.id === id);
      if (idx === -1) return null;
      items[idx] = { ...items[idx], ...d, updated_date: new Date().toISOString() };
      notifySubscribers(items[idx]);
      return items[idx];
    },
    _items: items,
  };
}

const subscribers = new Map();
function notifySubscribers(data) {
  for (const cb of subscribers.values()) {
    try { cb({ type: 'create', id: data.id, data }); } catch (e) {}
  }
}

function makeEntity(name) {
  const store = makeStore();
  return {
    list: store.list,
    filter: store.filter,
    create: store.create,
    update: store.update,
    subscribe: (cb) => {
      const key = Symbol(name);
      subscribers.set(key, cb);
      return () => subscribers.delete(key);
    }
  };
}

const entities = {
  Threat: makeEntity('Threat'),
  ZeroDayAnomaly: makeEntity('ZeroDayAnomaly'),
  SecurityEvent: makeEntity('SecurityEvent'),
  HoneypotSession: makeEntity('HoneypotSession'),
  FirewallLog: makeEntity('FirewallLog'),
};

// Simple QRNG cycle simulator: when a Threat is created, advance it through
// challenged -> cycle_1 -> cycle_2 -> cycle_3 -> locked/destroyed depending
// on mocked heuristics. This runs in-memory for local testing.
function simulateQRNGForThreat(threat) {
  const id = threat.id;
  const steps = ['challenged', 'cycle_1', 'cycle_2', 'cycle_3', 'locked'];
  let idx = 0;

  const advance = async () => {
    if (idx >= steps.length) return;
    const status = steps[idx];
    try {
      await entities.Threat.update(id, { status, qrng_cycle: idx });
      await entities.SecurityEvent.create({ event_type: 'qrng_cycle', severity: 'warning', details: `Mock QRNG advanced: ${id} → ${status}` });
      // Occasionally create a ZeroDayAnomaly when reaching cycle_2
      if (status === 'cycle_2' && Math.random() > 0.7) {
        await entities.ZeroDayAnomaly.create({ anomaly_signature: `mock-zd-${id}-${Date.now()}`, anomaly_type: 'mock_exploit', severity: 'critical', status: 'detected', source_ip: threat.source_ip });
      }
      // Decide final outcome at lock
      if (status === 'locked') {
        const outcome = Math.random() > 0.6 ? 'destroyed' : 'locked';
        if (outcome === 'destroyed') {
          await entities.Threat.update(id, { status: 'destroyed', threat_level: 'critical' });
          await entities.SecurityEvent.create({ event_type: 'threat_destroyed', severity: 'fatal', details: `Mock threat destroyed: ${id}` });
          await entities.FirewallLog.create({ rule_id: 'mock-auto', rule_name: 'Mock Auto-Block', action_taken: 'blocked', source_ip: threat.source_ip, blocked_reason: 'mock auto destroy' });
        } else {
          await entities.SecurityEvent.create({ event_type: 'threat_locked', severity: 'critical', details: `Mock threat locked: ${id}` });
        }
        return;
      }
    } catch (e) {
      // ignore
    }
    idx += 1;
    // Delay between steps: 1s–4s randomized
    setTimeout(advance, 1000 + Math.floor(Math.random() * 3000));
  };

  // start after small initial delay
  setTimeout(advance, 800 + Math.floor(Math.random() * 1200));
}

const mockStrikes = { human: 0, agent: 0 };

function incrementMockStrike(type = 'human') {
  mockStrikes[type] = (mockStrikes[type] || 0) + 1;
  return mockStrikes[type];
}

function resetMockStrike(type = 'human') {
  mockStrikes[type] = 0;
}

const functions = {
  invoke: async (name, payload) => {
    if (name === 'threatDetectionEngine') {
      return { data: { processed: 0, action: 'mocked', ...payload } };
    }

    if (name === 'autoBlockIp') {
      await entities.FirewallLog.create({
        rule_id: 'mock-auto',
        action_taken: 'blocked',
        source_ip: payload?.source_ip || 'unknown',
        blocked_reason: payload?.reason || 'mock',
      });
      await entities.SecurityEvent.create({ event_type: 'auto_blacklist', severity: 'fatal', details: `Mock auto-block ${payload?.source_ip}` });
      return { success: true };
    }

    if (name === 'theologicalMFA') {
      const action = payload?.action;

      if (action === 'get_challenge') {
        return {
          data: {
            challenge: 'Do you accept? Answer Yes or No.',
          },
        };
      }

      if (action === 'simulate') {
        const isHuman = payload?.corridor === 'human';
        return {
          data: {
            success: isHuman,
            corridor: payload?.corridor || 'human',
            message: isHuman
              ? 'Mock simulation: human corridor passed.'
              : 'Mock simulation: agent corridor requires a 64+ character ZKP proof.',
            strikes: isHuman ? 0 : 1,
            details: isHuman
              ? 'Use the human corridor form to test TOTP and response handling.'
              : 'Enter a minimal ZKP string to simulate agent verification.',
          },
        };
      }

      if (action === 'human_authenticate') {
        const totpValid = payload?.totp_code === '123456';
        const responseValid = typeof payload?.response === 'string' && payload.response.trim().length > 0;

        if (totpValid && responseValid) {
          resetMockStrike('human');
          return {
            data: {
              success: true,
              corridor: 'human',
              message: 'Mock human passport authenticated successfully.',
              qrng_otp: '7a8f2c1d',
            },
          };
        }

        const strike = incrementMockStrike('human');
        const result = {
          success: false,
          strike,
          message: responseValid ? 'Invalid MFA code.' : 'Invalid challenge response.',
          delay_ms: 500 * strike,
        };
        if (strike >= 3) {
          result.locked = true;
          result.reason = 'Mock lockout engaged after 3 failed human authentication attempts.';
          result.restoration = 'Reset the mock state to continue testing.';
        }
        return { data: result };
      }

      if (action === 'agent_authenticate') {
        const proof = payload?.agent_zkp;
        const proofValid = typeof proof === 'string' && proof.length >= 64;

        if (proofValid) {
          resetMockStrike('agent');
          return {
            data: {
              success: false,
              corridor: 'agent',
              message: 'Mock ZKP received. Pending oracle consensus verification.',
              required: 'A valid decentralized proof is queued for review.',
            },
          };
        }

        const strike = incrementMockStrike('agent');
        const result = {
          success: false,
          strike,
          message: 'Agent corridor requires a valid cryptographic ZKP proof.',
          delay_ms: 500 * strike,
        };
        if (strike >= 3) {
          result.locked = true;
          result.reason = 'Mock agent lockout engaged on repeated invalid proof attempts.';
          result.restoration = 'Reset the mock state to continue testing.';
        }
        return { data: result };
      }

      return { data: { error: 'Unknown theologicalMFA action', action, payload } };
    }

    return { data: payload };
  },
};

const base44Mock = {
  entities: {
    Threat: entities.Threat,
    ZeroDayAnomaly: entities.ZeroDayAnomaly,
    SecurityEvent: entities.SecurityEvent,
    HoneypotSession: entities.HoneypotSession,
    FirewallLog: entities.FirewallLog,
    list: async () => [],
  },
  functions,
  asServiceRole: {
    entities: {
      Threat: entities.Threat,
      ZeroDayAnomaly: entities.ZeroDayAnomaly,
      SecurityEvent: entities.SecurityEvent,
      HoneypotSession: entities.HoneypotSession,
      FirewallLog: entities.FirewallLog,
    }
  }
};

export default base44Mock;

// Hook threat creation to start QRNG simulation
try {
  const orig = entities.Threat.create;
  entities.Threat.create = async (d) => {
    const rec = await orig(d);
    try { simulateQRNGForThreat(rec); } catch (e) {}
    return rec;
  };
} catch (e) {}
