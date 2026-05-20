import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { GitBranch, Plus, Play, Trash2, ToggleLeft, ToggleRight, Clock, Zap, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import PolicyBuilder from '../components/workflow/PolicyBuilder';
import ExecutionLog from '../components/workflow/ExecutionLog';
import IncidentResponseTemplates from '../components/workflow/IncidentResponseTemplates';

const PRIORITY_COLORS = {
  low: 'text-muted-foreground border-border',
  medium: 'text-blue-400 border-blue-400/30',
  high: 'text-amber-400 border-amber-400/30',
  critical: 'text-red-400 border-red-400/30',
};

const TRIGGER_LABELS = {
  zero_day_detected: 'Zero-Day Detected',
  threat_detected: 'Threat Detected',
  threat_critical: 'Critical Threat',
  honeypot_triggered: 'Honeypot Triggered',
  agent_alert: 'Agent Alert',
};

export default function WorkflowEngine() {
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [tab, setTab] = useState('policies');
  const [showTemplates, setShowTemplates] = useState(false);
  const queryClient = useQueryClient();

  const { data: policies = [] } = useQuery({
    queryKey: ['workflow-policies'],
    queryFn: () => base44.entities.WorkflowPolicy.list('-created_date', 50),
    initialData: [],
  });

  const { data: executions = [] } = useQuery({
    queryKey: ['workflow-executions'],
    queryFn: () => base44.entities.WorkflowExecution.list('-created_date', 50),
    initialData: [],
    refetchInterval: 5000,
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editingPolicy?.id) return base44.entities.WorkflowPolicy.update(editingPolicy.id, data);
      return base44.entities.WorkflowPolicy.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-policies'] });
      toast.success(editingPolicy?.id ? 'Policy updated' : 'Policy created');
      setShowBuilder(false);
      setEditingPolicy(null);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }) => base44.entities.WorkflowPolicy.update(id, { enabled: !enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workflow-policies'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.WorkflowPolicy.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-policies'] });
      toast.success('Policy deleted');
    },
  });

  // Test-fire a policy manually against mock data
  const testMutation = useMutation({
    mutationFn: async (policy) => {
      let actions = [];
      try { actions = JSON.parse(policy.actions || '[]'); } catch {}
      const mockEvent = { id: null, severity: 'critical', anomaly_type: 'behavioral', source_ip: '10.0.0.1', environment: 'production', confidence_score: 95, agent_id: '12' };
      const { runPoliciesAgainstEvent } = await import('../lib/workflowEngine');
      return runPoliciesAgainstEvent(mockEvent, policy.trigger_event);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-executions'] });
      toast.success('Policy test-fired! Check execution log.');
      setTab('executions');
    },
  });

  const openNew = () => { setEditingPolicy(null); setShowBuilder(true); };
  const openEdit = (p) => {
    let conditions = [], actions = [];
    try { conditions = JSON.parse(p.conditions || '[]'); } catch {}
    try { actions = JSON.parse(p.actions || '[]'); } catch {}
    setEditingPolicy({ ...p, conditions, actions });
    setShowBuilder(true);
  };
  const selectTemplate = (templatePolicy) => {
    let conditions = [], actions = [];
    try { conditions = JSON.parse(JSON.stringify(templatePolicy.conditions || [])); } catch {}
    try { actions = JSON.parse(JSON.stringify(templatePolicy.actions || [])); } catch {}
    setEditingPolicy({ ...templatePolicy, conditions, actions });
    setShowBuilder(true);
    setShowTemplates(false);
  };

  const activePolicies = policies.filter(p => p.enabled).length;
  const totalExecutions = executions.length;
  const successfulExecutions = executions.filter(e => e.status === 'success').length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-mono text-xl font-bold tracking-wider text-foreground">WORKFLOW ENGINE</h1>
          <p className="font-mono text-[10px] text-muted-foreground tracking-widest mt-1">
            IF-THIS-THEN-THAT · SECURITY POLICY AUTOMATION
          </p>
        </div>
        <Button className="font-mono text-xs" onClick={openNew}>
          <Plus className="w-4 h-4 mr-1" /> New Policy
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Policies', value: policies.length, color: 'text-foreground' },
          { label: 'Active Policies', value: activePolicies, color: 'text-green-400' },
          { label: 'Total Executions', value: totalExecutions, color: 'text-primary' },
          { label: 'Successful', value: successfulExecutions, color: 'text-green-400' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4 text-center">
            <div className={`font-mono text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="font-mono text-[9px] text-muted-foreground mt-1 tracking-wide">{s.label.toUpperCase()}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary rounded-lg p-1 w-fit">
        {[{ id: 'policies', label: 'Policies' }, { id: 'executions', label: 'Execution Log' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`font-mono text-[10px] px-4 py-1.5 rounded-md transition-all ${tab === t.id ? 'bg-card text-foreground shadow' : 'text-muted-foreground'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Policies Tab */}
      {tab === 'policies' && (
        <div className="space-y-4">
          <AnimatePresence>
            {showTemplates && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="p-6">
                    <IncidentResponseTemplates onSelectTemplate={selectTemplate} />
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {!showTemplates && policies.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <GitBranch className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <p className="font-mono text-sm text-muted-foreground">No policies yet</p>
                <p className="font-mono text-[10px] text-muted-foreground mt-1">Create your first IF-THEN security policy</p>
                <div className="flex gap-2 justify-center mt-4">
                  <Button className="font-mono text-xs" onClick={() => setShowTemplates(true)}>
                    <Zap className="w-3 h-3 mr-1" /> Use Template
                  </Button>
                  <Button className="font-mono text-xs" variant="outline" onClick={openNew}>
                    <Plus className="w-3 h-3 mr-1" /> Create Custom
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {policies.length > 0 && (
            <Button
              variant="outline"
              className="font-mono text-xs border-primary/20 text-primary"
              onClick={() => setShowTemplates(!showTemplates)}
            >
              <Zap className="w-3 h-3 mr-1" />
              {showTemplates ? 'Hide' : 'Show'} Templates
            </Button>
          )}

          <div className="space-y-3">
            {policies.length > 0 && (
            <AnimatePresence>
              {policies.map(policy => {
                let conditions = [], actions = [];
                try { conditions = JSON.parse(policy.conditions || '[]'); } catch {}
                try { actions = JSON.parse(policy.actions || '[]'); } catch {}
                const prioClass = PRIORITY_COLORS[policy.priority] || PRIORITY_COLORS.medium;

                return (
                  <motion.div key={policy.id} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}>
                    <Card className={`border ${policy.enabled ? 'border-border' : 'border-border/40 opacity-60'}`}>
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-start gap-4">
                          {/* Toggle */}
                          <button onClick={() => toggleMutation.mutate({ id: policy.id, enabled: policy.enabled })}
                            className="mt-0.5 text-muted-foreground hover:text-primary transition-colors">
                            {policy.enabled
                              ? <ToggleRight className="w-5 h-5 text-green-400" />
                              : <ToggleLeft className="w-5 h-5" />}
                          </button>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-sm font-bold text-foreground">{policy.name}</span>
                              <Badge variant="outline" className={`font-mono text-[8px] border ${prioClass}`}>{policy.priority?.toUpperCase()}</Badge>
                              <Badge variant="outline" className="font-mono text-[8px] text-primary border-primary/20 bg-primary/5">
                                {TRIGGER_LABELS[policy.trigger_event] || policy.trigger_event}
                              </Badge>
                            </div>
                            {policy.description && (
                              <p className="font-mono text-[10px] text-muted-foreground mt-1">{policy.description}</p>
                            )}

                            {/* IF → THEN summary */}
                            <div className="flex items-center gap-3 mt-2 flex-wrap">
                              <div className="flex items-center gap-1">
                                <span className="font-mono text-[9px] text-amber-400 font-bold">IF</span>
                                <span className="font-mono text-[9px] text-muted-foreground">
                                  {conditions.length === 0 ? 'always' : conditions.map(c => `${c.field} ${c.operator} "${c.value}"`).join(' AND ')}
                                </span>
                              </div>
                              <span className="font-mono text-[9px] text-muted-foreground/40">→</span>
                              <div className="flex items-center gap-1">
                                <span className="font-mono text-[9px] text-green-400 font-bold">THEN</span>
                                <span className="font-mono text-[9px] text-muted-foreground">
                                  {actions.map(a => a.type?.replace(/_/g, ' ')).join(', ')}
                                </span>
                              </div>
                            </div>

                            {/* Stats */}
                            <div className="flex items-center gap-4 mt-2">
                              <span className="font-mono text-[9px] text-muted-foreground flex items-center gap-1">
                                <Zap className="w-2.5 h-2.5" /> {policy.executions_count || 0} executions
                              </span>
                              {policy.last_triggered && (
                                <span className="font-mono text-[9px] text-muted-foreground flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5" /> {new Date(policy.last_triggered).toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button size="sm" variant="outline" className="font-mono text-[9px] h-7 px-2 border-primary/20 text-primary hover:bg-primary/10"
                              onClick={() => testMutation.mutate(policy)} disabled={testMutation.isPending}>
                              <Play className="w-2.5 h-2.5 mr-1" /> Test
                            </Button>
                            <Button size="sm" variant="outline" className="font-mono text-[9px] h-7 px-2"
                              onClick={() => openEdit(policy)}>Edit</Button>
                            <Button size="icon" variant="ghost" className="w-7 h-7 text-muted-foreground hover:text-destructive"
                              onClick={() => deleteMutation.mutate(policy.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            )}
          </div>
        </div>
      )}

      {/* Executions Tab */}
      {tab === 'executions' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-mono text-xs tracking-wider">EXECUTION HISTORY</CardTitle>
          </CardHeader>
          <CardContent>
            <ExecutionLog executions={executions} />
          </CardContent>
        </Card>
      )}

      {/* Policy Builder Dialog */}
      <Dialog open={showBuilder} onOpenChange={v => { if (!v) { setShowBuilder(false); setEditingPolicy(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm tracking-wider">
              {editingPolicy?.id ? 'EDIT POLICY' : 'NEW SECURITY POLICY'}
            </DialogTitle>
          </DialogHeader>
          <PolicyBuilder
            initial={editingPolicy}
            onSave={saveMutation.mutate}
            onCancel={() => { setShowBuilder(false); setEditingPolicy(null); }}
            saving={saveMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}