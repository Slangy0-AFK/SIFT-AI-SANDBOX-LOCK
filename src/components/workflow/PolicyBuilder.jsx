import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, X } from 'lucide-react';

const TRIGGER_OPTIONS = [
  { value: 'zero_day_detected', label: 'Zero-Day Anomaly Detected' },
  { value: 'threat_detected', label: 'Threat Detected' },
  { value: 'threat_critical', label: 'Critical Threat' },
  { value: 'honeypot_triggered', label: 'Honeypot Triggered' },
  { value: 'agent_alert', label: 'Agent Alert' },
];

const CONDITION_FIELDS = [
  { value: 'severity', label: 'Severity' },
  { value: 'anomaly_type', label: 'Anomaly Type' },
  { value: 'agent_id', label: 'Agent ID' },
  { value: 'environment', label: 'Environment' },
  { value: 'confidence_score', label: 'Confidence Score' },
  { value: 'source_ip', label: 'Source IP' },
];

const CONDITION_OPERATORS = [
  { value: 'equals', label: '= equals' },
  { value: 'not_equals', label: '≠ not equals' },
  { value: 'contains', label: '∋ contains' },
  { value: 'gte', label: '≥ greater or equal' },
  { value: 'lte', label: '≤ less or equal' },
  { value: 'in', label: '∈ is one of (comma-sep)' },
];

const ACTION_TYPES = [
  { value: 'block_ip', label: '🚫 Block Source IP' },
  { value: 'block_ip_range', label: '🔴 Block IP Range (/24)' },
  { value: 'migrate_to_secure', label: '📦 Migrate to Secure Env' },
  { value: 'escalate_to_agent', label: '⚡ Escalate to Agent' },
  { value: 'neutralize', label: '💥 Auto-Neutralize Threat' },
  { value: 'quarantine_environment', label: '🔒 Quarantine Environment' },
  { value: 'create_security_event', label: '📋 Log Security Event' },
  { value: 'send_alert', label: '🔔 Send Alert' },
];

const ACTION_PARAMS = {
  block_ip: [{ key: 'ip', placeholder: 'IP (leave blank to use event IP)' }],
  block_ip_range: [{ key: 'range', placeholder: 'CIDR range (e.g. 192.168.1.0/24)' }],
  migrate_to_secure: [{ key: 'target_env', placeholder: 'Target env: honeypot / mirror / tarpit' }],
  escalate_to_agent: [{ key: 'agent', placeholder: 'Agent name (e.g. SIFT-AI-X)' }],
  create_security_event: [
    { key: 'severity', placeholder: 'Severity: info/warning/critical/fatal' },
    { key: 'message', placeholder: 'Event message' },
  ],
  send_alert: [{ key: 'message', placeholder: 'Alert message' }],
};

const emptyCondition = () => ({ field: 'severity', operator: 'equals', value: '' });
const emptyAction = () => ({ type: 'block_ip', params: {} });

export default function PolicyBuilder({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial || {
    name: '',
    description: '',
    trigger_event: 'zero_day_detected',
    priority: 'medium',
    enabled: true,
    conditions: [],
    actions: [emptyAction()],
  });

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const addCondition = () => setField('conditions', [...form.conditions, emptyCondition()]);
  const removeCondition = (i) => setField('conditions', form.conditions.filter((_, idx) => idx !== i));
  const updateCondition = (i, k, v) => setField('conditions', form.conditions.map((c, idx) => idx === i ? { ...c, [k]: v } : c));

  const addAction = () => setField('actions', [...form.actions, emptyAction()]);
  const removeAction = (i) => setField('actions', form.actions.filter((_, idx) => idx !== i));
  const updateAction = (i, k, v) => setField('actions', form.actions.map((a, idx) => idx === i ? { ...a, [k]: v } : a));
  const updateActionParam = (i, k, v) => setField('actions', form.actions.map((a, idx) => idx === i ? { ...a, params: { ...a.params, [k]: v } } : a));

  const handleSave = () => onSave({
    ...form,
    conditions: JSON.stringify(form.conditions),
    actions: JSON.stringify(form.actions),
  });

  const sel = 'font-mono text-[10px]';

  return (
    <div className="space-y-5">
      {/* Basic info */}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase mb-1 block">Policy Name *</label>
          <Input className={sel} placeholder="e.g. Block Critical Zero-Day IP Range" value={form.name} onChange={e => setField('name', e.target.value)} />
        </div>
        <div>
          <label className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase mb-1 block">Trigger Event</label>
          <Select value={form.trigger_event} onValueChange={v => setField('trigger_event', v)}>
            <SelectTrigger className={sel}><SelectValue /></SelectTrigger>
            <SelectContent>{TRIGGER_OPTIONS.map(o => <SelectItem key={o.value} value={o.value} className={sel}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <label className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase mb-1 block">Priority</label>
          <Select value={form.priority} onValueChange={v => setField('priority', v)}>
            <SelectTrigger className={sel}><SelectValue /></SelectTrigger>
            <SelectContent>
              {['low', 'medium', 'high', 'critical'].map(p => <SelectItem key={p} value={p} className={sel}>{p.toUpperCase()}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2">
          <label className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase mb-1 block">Description</label>
          <Input className={sel} placeholder="What does this policy do?" value={form.description || ''} onChange={e => setField('description', e.target.value)} />
        </div>
      </div>

      {/* Conditions */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase flex items-center gap-2">
            IF Conditions
            <Badge variant="outline" className="font-mono text-[8px]">{form.conditions.length === 0 ? 'always' : `${form.conditions.length} rule${form.conditions.length > 1 ? 's' : ''}`}</Badge>
          </label>
          <Button size="sm" variant="outline" className="font-mono text-[9px] h-6 px-2" onClick={addCondition}>
            <Plus className="w-2.5 h-2.5 mr-1" /> Add Condition
          </Button>
        </div>
        {form.conditions.length === 0 && (
          <p className="font-mono text-[9px] text-muted-foreground italic px-1">No conditions — policy runs on every trigger event.</p>
        )}
        <div className="space-y-2">
          {form.conditions.map((cond, i) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/40 border border-border">
              <Select value={cond.field} onValueChange={v => updateCondition(i, 'field', v)}>
                <SelectTrigger className={`${sel} w-32 h-7`}><SelectValue /></SelectTrigger>
                <SelectContent>{CONDITION_FIELDS.map(o => <SelectItem key={o.value} value={o.value} className={sel}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={cond.operator} onValueChange={v => updateCondition(i, 'operator', v)}>
                <SelectTrigger className={`${sel} w-36 h-7`}><SelectValue /></SelectTrigger>
                <SelectContent>{CONDITION_OPERATORS.map(o => <SelectItem key={o.value} value={o.value} className={sel}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
              <Input className={`${sel} flex-1 h-7`} placeholder="value" value={cond.value} onChange={e => updateCondition(i, 'value', e.target.value)} />
              <Button size="icon" variant="ghost" className="w-6 h-6 text-muted-foreground hover:text-destructive" onClick={() => removeCondition(i)}>
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase">THEN Actions</label>
          <Button size="sm" variant="outline" className="font-mono text-[9px] h-6 px-2" onClick={addAction}>
            <Plus className="w-2.5 h-2.5 mr-1" /> Add Action
          </Button>
        </div>
        <div className="space-y-2">
          {form.actions.map((action, i) => (
            <div key={i} className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
              <div className="flex items-center gap-2">
                <Select value={action.type} onValueChange={v => updateAction(i, 'type', v)}>
                  <SelectTrigger className={`${sel} flex-1 h-7`}><SelectValue /></SelectTrigger>
                  <SelectContent>{ACTION_TYPES.map(o => <SelectItem key={o.value} value={o.value} className={sel}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
                {form.actions.length > 1 && (
                  <Button size="icon" variant="ghost" className="w-6 h-6 text-muted-foreground hover:text-destructive" onClick={() => removeAction(i)}>
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
              {(ACTION_PARAMS[action.type] || []).map(param => (
                <Input key={param.key} className={`${sel} h-7`} placeholder={param.placeholder}
                  value={action.params?.[param.key] || ''}
                  onChange={e => updateActionParam(i, param.key, e.target.value)} />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex gap-2 pt-2 border-t border-border">
        <Button className="font-mono text-xs flex-1" onClick={handleSave} disabled={!form.name || saving}>
          {saving ? 'Saving...' : 'Save Policy'}
        </Button>
        <Button variant="outline" className="font-mono text-xs" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}