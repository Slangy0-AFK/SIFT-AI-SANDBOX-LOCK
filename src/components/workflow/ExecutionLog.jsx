import React from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, SkipForward, Loader2 } from 'lucide-react';

const STATUS_META = {
  success: { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/20' },
  failed:  { icon: XCircle,      color: 'text-red-400',   bg: 'bg-red-400/10',   border: 'border-red-400/20' },
  skipped: { icon: SkipForward,  color: 'text-muted-foreground', bg: 'bg-secondary', border: 'border-border' },
  running: { icon: Loader2,      color: 'text-primary',   bg: 'bg-primary/10',   border: 'border-primary/20' },
};

export default function ExecutionLog({ executions = [] }) {
  if (executions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="font-mono text-[10px] text-muted-foreground">No executions yet. Policies will fire automatically when matching events occur.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
      {executions.map((exec) => {
        const meta = STATUS_META[exec.status] || STATUS_META.skipped;
        const Icon = meta.icon;
        let actionsLog = [];
        try { actionsLog = JSON.parse(exec.actions_log || '[]'); } catch {}

        return (
          <motion.div key={exec.id} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
            className={`p-3 rounded-lg border ${meta.border} ${meta.bg}`}>
            <div className="flex items-center gap-2 mb-1.5">
              <Icon className={`w-3.5 h-3.5 ${meta.color} ${exec.status === 'running' ? 'animate-spin' : ''}`} />
              <span className="font-mono text-[11px] font-semibold text-foreground">{exec.policy_name}</span>
              <Badge className={`font-mono text-[8px] ml-auto border ${meta.border} ${meta.color} bg-transparent`}>
                {exec.status.toUpperCase()}
              </Badge>
              <span className="font-mono text-[8px] text-muted-foreground">
                {new Date(exec.created_date).toLocaleTimeString()}
              </span>
            </div>
            {actionsLog.length > 0 && (
              <div className="space-y-1 ml-5">
                {actionsLog.map((a, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <span className="font-mono text-[8px] text-primary mt-0.5">↳</span>
                    <span className="font-mono text-[8px] text-muted-foreground">{a.message}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}