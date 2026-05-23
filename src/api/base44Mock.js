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

const functions = {
  invoke: async (name, payload) => {
    // Minimal behavior: return payload wrapped
    if (name === 'threatDetectionEngine') {
      return { data: { processed: 0, action: 'mocked', ...payload } };
    }
    if (name === 'autoBlockIp') {
      // create a firewall log and security event
      await entities.FirewallLog.create({ rule_id: 'mock-auto', action_taken: 'blocked', source_ip: payload?.source_ip || 'unknown', blocked_reason: payload?.reason || 'mock' });
      await entities.SecurityEvent.create({ event_type: 'auto_blacklist', severity: 'fatal', details: `Mock auto-block ${payload?.source_ip}` });
      return { success: true };
    }
    return { data: payload };
  }
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
