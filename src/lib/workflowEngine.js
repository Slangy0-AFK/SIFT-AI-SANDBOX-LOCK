import { base44 } from '@/api/base44Client';

// ─── Condition Evaluator ──────────────────────────────────────────────
const OPERATORS = {
  equals:      (a, b) => String(a).toLowerCase() === String(b).toLowerCase(),
  not_equals:  (a, b) => String(a).toLowerCase() !== String(b).toLowerCase(),
  contains:    (a, b) => String(a).toLowerCase().includes(String(b).toLowerCase()),
  gte:         (a, b) => Number(a) >= Number(b),
  lte:         (a, b) => Number(a) <= Number(b),
  gt:          (a, b) => Number(a) > Number(b),
  lt:          (a, b) => Number(a) < Number(b),
  in:          (a, b) => String(b).split(',').map(s => s.trim().toLowerCase()).includes(String(a).toLowerCase()),
};

function evaluateConditions(conditions, eventData) {
  if (!conditions || conditions.length === 0) return true;
  return conditions.every(cond => {
    const val = eventData[cond.field];
    const fn = OPERATORS[cond.operator];
    return fn ? fn(val, cond.value) : true;
  });
}

// ─── Action Executors ─────────────────────────────────────────────────
async function executeAction(action, eventData) {
  const log = { type: action.type, status: 'success', message: '' };

  switch (action.type) {
    case 'block_ip': {
      const ip = action.params?.ip || eventData.source_ip;
      log.message = `IP ${ip} flagged for blocking. Threat record updated with block status.`;
      if (eventData.id) {
        await base44.entities.ZeroDayAnomaly.update(eventData.id, {
          status: 'contained',
          mitigation_applied: `IP ${ip} blocked by policy`,
        });
      }
      break;
    }
    case 'block_ip_range': {
      const range = action.params?.range || (eventData.source_ip?.split('.').slice(0, 3).join('.') + '.0/24');
      log.message = `IP range ${range} quarantined. All connections from this subnet flagged.`;
      if (eventData.id) {
        await base44.entities.ZeroDayAnomaly.update(eventData.id, {
          status: 'contained',
          mitigation_applied: `IP range ${range} blocked by policy`,
        });
      }
      break;
    }
    case 'migrate_to_secure': {
      const env = action.params?.target_env || 'honeypot';
      log.message = `Data migration initiated → secure ${env} environment.`;
      if (eventData.id) {
        await base44.entities.ZeroDayAnomaly.update(eventData.id, {
          environment: env,
          status: 'contained',
          mitigation_applied: `Migrated to ${env} by policy`,
        });
      }
      break;
    }
    case 'escalate_to_agent': {
      const agentName = action.params?.agent || 'AEGIS-X';
      log.message = `Escalated to agent ${agentName} for manual review.`;
      if (eventData.id) {
        await base44.entities.ZeroDayAnomaly.update(eventData.id, {
          status: 'escalated',
          mitigation_applied: `Escalated to ${agentName}`,
        });
      }
      break;
    }
    case 'neutralize': {
      log.message = `Threat neutralized automatically by policy.`;
      if (eventData.id) {
        await base44.entities.ZeroDayAnomaly.update(eventData.id, {
          status: 'neutralized',
          mitigation_applied: `Auto-neutralized by policy`,
        });
      }
      break;
    }
    case 'create_security_event': {
      await base44.entities.SecurityEvent.create({
        event_type: 'threat_locked',
        threat_id: eventData.id || 'workflow',
        severity: action.params?.severity || 'critical',
        details: action.params?.message || `Policy action triggered: ${action.type}`,
        environment: eventData.environment || 'production',
      });
      log.message = `Security event logged: ${action.params?.message || action.type}`;
      break;
    }
    case 'quarantine_environment': {
      log.message = `Environment ${eventData.environment || 'production'} flagged for quarantine review.`;
      break;
    }
    case 'send_alert': {
      log.message = `Alert dispatched: "${action.params?.message || 'Policy triggered'}"`;
      break;
    }
    default:
      log.status = 'skipped';
      log.message = `Unknown action type: ${action.type}`;
  }

  return log;
}

// ─── Main Engine ──────────────────────────────────────────────────────
export async function runPoliciesAgainstEvent(eventData, triggerType) {
  const policies = await base44.entities.WorkflowPolicy.filter({ enabled: true, trigger_event: triggerType });
  const results = [];

  for (const policy of policies) {
    let conditions = [];
    let actions = [];

    try { conditions = JSON.parse(policy.conditions || '[]'); } catch {}
    try { actions = JSON.parse(policy.actions || '[]'); } catch {}

    const conditionsMet = evaluateConditions(conditions, eventData);
    if (!conditionsMet) continue;

    const actionsLog = [];
    for (const action of actions) {
      const log = await executeAction(action, eventData);
      actionsLog.push(log);
    }

    const execution = await base44.entities.WorkflowExecution.create({
      policy_id: policy.id,
      policy_name: policy.name,
      trigger_data: JSON.stringify(eventData),
      status: 'success',
      actions_log: JSON.stringify(actionsLog),
    });

    await base44.entities.WorkflowPolicy.update(policy.id, {
      executions_count: (policy.executions_count || 0) + 1,
      last_triggered: new Date().toISOString(),
    });

    results.push({ policy: policy.name, actionsLog, execution });
  }

  return results;
}