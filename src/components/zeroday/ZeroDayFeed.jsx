import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Zap, Brain, Cpu, Network, Package, HardDrive, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

const TYPE_META = {
  behavioral:       { icon: Brain,       color: 'text-amber-400',  bg: 'bg-amber-400/10',  border: 'border-amber-400/20' },
  polymorphic:      { icon: Zap,         color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20' },
  memory_injection: { icon: Cpu,         color: 'text-red-400',    bg: 'bg-red-400/10',    border: 'border-red-400/20' },
  side_channel:     { icon: Network,     color: 'text-cyan-400',   bg: 'bg-cyan-400/10',   border: 'border-cyan-400/20' },
  supply_chain:     { icon: Package,     color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/20' },
  ai_adversarial:   { icon: Brain,       color: 'text-pink-400',   bg: 'bg-pink-400/10',   border: 'border-pink-400/20' },
  fileless:         { icon: HardDrive,   color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20' },
  firmware:         { icon: Cpu,         color: 'text-blue-400',   bg: 'bg-blue-400/10',   border: 'border-blue-400/20' },
  unknown:          { icon: AlertTriangle, color: 'text-muted-foreground', bg: 'bg-secondary', border: 'border-border' },
};

const SEVERITY_COLORS = {
  info: 'text-blue-400 border-blue-400/20 bg-blue-400/10',
  warning: 'text-amber-400 border-amber-400/20 bg-amber-400/10',
  critical: 'text-red-400 border-red-400/20 bg-red-400/10',
  fatal: 'text-rose-300 border-rose-300/20 bg-rose-300/10',
};

const STATUS_COLORS = {
  detected: 'text-amber-400',
  analyzing: 'text-blue-400',
  contained: 'text-green-400',
  neutralized: 'text-primary',
  escalated: 'text-red-400',
};

export default function ZeroDayFeed({ anomalies = [] }) {
  const [expandedId, setExpandedId] = useState(null);

  return (
    <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
      {anomalies.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="font-mono text-[10px]">No zero-day anomalies detected</span>
        </div>
      ) : (
        <AnimatePresence>
          {anomalies.map((a) => {
            const meta = TYPE_META[a.anomaly_type] || TYPE_META.unknown;
            const Icon = meta.icon;
            const isExpanded = expandedId === a.id;
            return (
              <motion.div key={a.id}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                className={`p-3 rounded-lg border ${meta.border} ${meta.bg} cursor-pointer transition-all`}
                onClick={() => setExpandedId(isExpanded ? null : a.id)}>
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 p-1.5 rounded ${meta.bg} flex-shrink-0`}>
                    <Icon className={`w-3 h-3 ${meta.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-mono text-[10px] font-semibold ${meta.color}`}>
                        {a.anomaly_type?.replace('_', ' ').toUpperCase()}
                      </span>
                      <Badge className={`font-mono text-[8px] border ${SEVERITY_COLORS[a.severity]}`}>
                        {a.severity?.toUpperCase()}
                      </Badge>
                      <span className={`font-mono text-[9px] ${STATUS_COLORS[a.status]}`}>
                        {a.status === 'analyzing' && <Loader2 className="w-2.5 h-2.5 inline animate-spin mr-1" />}
                        {a.status?.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="font-mono text-[9px] text-muted-foreground">{a.source_ip || 'unknown'}</span>
                      {a.confidence_score != null && (
                        <span className="font-mono text-[9px] text-muted-foreground">
                          {a.confidence_score}% confidence
                        </span>
                      )}
                      {a.agent_id && (
                        <span className="font-mono text-[9px] text-primary">Agent #{a.agent_id}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-mono text-[8px] text-muted-foreground">
                      {new Date(a.created_date).toLocaleTimeString()}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 pt-3 border-t border-current/20 space-y-2">
                    {a.payload_hash && (
                      <div className="text-[9px]">
                        <span className="text-muted-foreground">Payload Hash: </span>
                        <span className="font-mono text-foreground break-all">{a.payload_hash}</span>
                      </div>
                    )}
                    {a.encoding_detected && (
                      <div className="text-[9px]">
                        <span className="text-muted-foreground">Encoding: </span>
                        <span className="font-mono text-foreground">{a.encoding_detected.toUpperCase()}</span>
                      </div>
                    )}
                    {a.obfuscation_level != null && (
                      <div className="text-[9px]">
                        <span className="text-muted-foreground">Obfuscation Level: </span>
                        <span className="font-mono text-foreground">{a.obfuscation_level}/10</span>
                      </div>
                    )}
                    {a.mitigation_applied && (
                      <div className="text-[9px]">
                        <span className="text-green-400">↳ Mitigation: </span>
                        <span className="font-mono text-green-400">{a.mitigation_applied}</span>
                      </div>
                    )}
                    {a.notes && (
                      <div className="text-[9px]">
                        <span className="text-muted-foreground">Notes: </span>
                        <span className="font-mono text-foreground">{a.notes}</span>
                      </div>
                    )}
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      )}
    </div>
  );
}