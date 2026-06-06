import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { AlertTriangle, Shield, Lock, Bell, Zap, Copy } from 'lucide-react';

const TEMPLATES = [
  {
    id: 'zero_day_lockdown',
    name: 'Zero-Day Lockdown',
    description: 'Immediately isolate and contain zero-day threats',
    icon: AlertTriangle,
    color: 'text-destructive',
    policy: {
      name: 'Zero-Day Auto-Lockdown',
      description: 'Automatically lock down systems on zero-day detection',
      trigger_event: 'zero_day_detected',
      priority: 'critical',
      enabled: true,
      conditions: [
        { field: 'severity', operator: '>=', value: 'critical' }
      ],
      actions: [
        { type: 'isolate_threat', params: { redirect_to: 'tarpit' } },
        { type: 'log_event', params: { severity: 'fatal' } },
        { type: 'notify_team', params: { channel: 'urgent' } }
      ]
    }
  },
  {
    id: 'critical_threat_response',
    name: 'Critical Threat Response',
    description: 'Escalate and isolate critical threats with immediate notification',
    icon: Shield,
    color: 'text-amber-400',
    policy: {
      name: 'Critical Threat Auto-Response',
      description: 'Auto-respond to critical threat detections',
      trigger_event: 'threat_critical',
      priority: 'critical',
      enabled: true,
      conditions: [
        { field: 'threat_level', operator: '=', value: 'critical' }
      ],
      actions: [
        { type: 'challenge_paradox', params: {} },
        { type: 'initiate_qrng_cycles', params: { cycles: 3 } },
        { type: 'notify_team', params: { channel: 'urgent' } },
        { type: 'log_event', params: { severity: 'critical' } }
      ]
    }
  },
  {
    id: 'honeypot_analysis',
    name: 'Honeypot Analysis',
    description: 'Capture and analyze honeypot interactions',
    icon: Lock,
    color: 'text-primary',
    policy: {
      name: 'Honeypot Trigger Response',
      description: 'Auto-engage tarpit and log attacker behavior',
      trigger_event: 'honeypot_triggered',
      priority: 'high',
      enabled: true,
      conditions: [],
      actions: [
        { type: 'engage_tarpit', params: { duration_seconds: 300 } },
        { type: 'capture_session_data', params: {} },
        { type: 'log_event', params: { severity: 'warning' } }
      ]
    }
  },
  {
    id: 'agent_alert_escalation',
    name: 'Agent Alert Escalation',
    description: 'Route guardian agent alerts to the security team',
    icon: Bell,
    color: 'text-blue-400',
    policy: {
      name: 'Agent Alert Escalation',
      description: 'Escalate guardian agent alerts to team',
      trigger_event: 'agent_alert',
      priority: 'high',
      enabled: true,
      conditions: [],
      actions: [
        { type: 'log_event', params: { severity: 'warning' } },
        { type: 'notify_team', params: { channel: 'standard' } }
      ]
    }
  },
  {
    id: 'threat_detection_logging',
    name: 'Threat Detection Logging',
    description: 'Log all threat detections for audit trail',
    icon: Zap,
    color: 'text-green-400',
    policy: {
      name: 'Threat Detection Audit Log',
      description: 'Log every threat detection for compliance',
      trigger_event: 'threat_detected',
      priority: 'medium',
      enabled: true,
      conditions: [],
      actions: [
        { type: 'log_event', params: { severity: 'info' } },
        { type: 'archive_threat_data', params: {} }
      ]
    }
  }
];

export default function IncidentResponseTemplates({ onSelectTemplate }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-mono text-sm font-bold text-foreground mb-1">Incident Response Templates</h3>
        <p className="font-mono text-[10px] text-muted-foreground">Start with a pre-configured response workflow</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {TEMPLATES.map((template, idx) => {
          const Icon = template.icon;
          return (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className="border-border/60 hover:border-border transition-all cursor-pointer group"
                onClick={() => onSelectTemplate(template.policy)}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Icon className={`w-5 h-5 flex-shrink-0 ${template.color}`} />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-mono text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                        {template.name}
                      </h4>
                      <p className="font-mono text-[9px] text-muted-foreground mt-0.5">
                        {template.description}
                      </p>
                    </div>
                    <Copy className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary flex-shrink-0 transition-colors" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}