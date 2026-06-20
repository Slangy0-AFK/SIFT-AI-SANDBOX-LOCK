import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Bug, AlertTriangle, Cpu, Mail, ShieldAlert, ChevronDown } from 'lucide-react';

const typeMeta = {
  threat: { label: 'Threat', icon: AlertTriangle, color: 'text-accent bg-accent/10 border-accent/20' },
  event: { label: 'Event', icon: Shield, color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  zeroday: { label: 'Zero-Day', icon: Bug, color: 'text-purple-400 bg-purple-400/10 border-purple-400/20' },
  email_threat: { label: 'Email Threat', icon: Mail, color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  scan_session: { label: 'Scan Session', icon: Cpu, color: 'text-green-400 bg-green-400/10 border-green-400/20' },
  honeypot: { label: 'Mirror Session', icon: Bug, color: 'text-violet-400 bg-violet-400/10 border-violet-400/20' },
  firewall_log: { label: 'Firewall', icon: ShieldAlert, color: 'text-teal-400 bg-teal-400/10 border-teal-400/20' },
};

const feedFilters = [
  { id: 'all', label: 'All' },
  { id: 'threat', label: 'Threats' },
  { id: 'zeroday', label: 'Zero-Day' },
  { id: 'firewall_log', label: 'Firewall' },
  { id: 'email_threat', label: 'Email' },
  { id: 'scan_session', label: 'Scans' },
  { id: 'honeypot', label: 'Mirror' },
  { id: 'event', label: 'Events' },
];

function getTimestamp(item) {
  return new Date(item.created_date || item.created_at || item.updated_date || Date.now()).getTime();
}

function normalizeSeverity(value) {
  const key = String(value || 'info').toLowerCase();
  if (['critical', 'fatal', 'high'].includes(key)) return 'critical';
  if (['medium', 'warning', 'alert'].includes(key)) return 'medium';
  if (['low', 'info', 'notice'].includes(key)) return 'low';
  if (['blocked', 'blocked-outbound', 'blocked-inbound'].includes(key)) return 'blocked';
  return 'info';
}

function getSeverityBadge(severity) {
  const normalized = normalizeSeverity(severity);
  switch (normalized) {
    case 'critical':
      return 'bg-red-500/10 text-destructive border border-destructive/20';
    case 'medium':
      return 'bg-amber-500/10 text-amber-400 border border-amber-400/20';
    case 'low':
      return 'bg-emerald-500/10 text-emerald-400 border border-emerald-400/20';
    case 'blocked':
      return 'bg-teal-500/10 text-teal-400 border border-teal-400/20';
    default:
      return 'bg-slate-500/10 text-slate-300 border border-slate-500/20';
  }
}

function formatEvent(item) {
  const source = item.source_ip || item.origin || item.sender || 'unknown source';
  const environment = item.environment ? ` · ${item.environment}` : '';

  switch (item.type) {
    case 'threat':
      return {
        title: `THREAT · ${(item.threat_level || item.status || 'unknown').toUpperCase()}`,
        detail: `${source}${environment}`,
        severity: item.threat_level || item.status || 'unknown',
        meta: `agent: ${item.agent_type || 'unknown'} · status: ${item.status || 'detected'}`,
      };
    case 'zeroday':
      return {
        title: `ZERO-DAY · ${(item.anomaly_type || 'unknown').replace(/_/g, ' ').toUpperCase()}`,
        detail: `${source}${environment}`,
        severity: item.severity || 'critical',
        meta: `signature: ${item.anomaly_signature || item.anomaly_type || 'unknown'}`,
      };
    case 'email_threat':
      return {
        title: `EMAIL THREAT · ${(item.status || 'unknown').toUpperCase()}`,
        detail: `${item.sender || source}${environment}`,
        severity: item.status || 'unknown',
        meta: `subject: ${item.subject || 'no subject'}`,
      };
    case 'scan_session':
      return {
        title: `SCAN SESSION · ${(item.status || 'running').toUpperCase()}`,
        detail: `${source}${environment}`,
        severity: item.status || 'running',
        meta: `session: ${item.session_type || 'device scan'}`,
      };
    case 'honeypot':
      return {
        title: `MIRROR SESSION · ${(item.status || 'active').toUpperCase()}`,
        detail: `${source}${environment}`,
        severity: item.status || 'active',
        meta: `policy: ${item.policy_id || 'unknown'}`,
      };
    case 'firewall_log':
      return {
        title: `FIREWALL · ${(item.action_taken || 'blocked').toUpperCase()}`,
        detail: `${source}${environment}`,
        severity: item.action_taken || 'blocked',
        meta: item.blocked_reason || item.rule_name || 'auto-block',
      };
    case 'event':
    default:
      return {
        title: `${(item.event_type || 'security_event').replace(/_/g, ' ').toUpperCase()}`,
        detail: `${item.details || item.description || 'no details'}${environment}`,
        severity: item.severity || 'info',
        meta: `event type: ${item.event_type || 'security_event'}`,
      };
  }
}

export default function CustomerThreatFeed({ threats = [], events = [], anomalies = [], emailThreats = [], scanSessions = [], honeypots = [], firewallLogs = [] }) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [isOpen, setIsOpen] = useState(false);
  const feedItems = useMemo(() => {
    const items = [];

    threats.forEach((item) => items.push({
      id: `threat-${item.id}`,
      type: 'threat',
      created_date: item.created_date || item.created_at,
      ...item,
    }));

    anomalies.forEach((item) => items.push({
      id: `zeroday-${item.id}`,
      type: 'zeroday',
      created_date: item.created_date || item.created_at,
      ...item,
    }));

    emailThreats.forEach((item) => items.push({
      id: `email-${item.id}`,
      type: 'email_threat',
      created_date: item.created_date || item.created_at,
      ...item,
    }));

    scanSessions.forEach((item) => items.push({
      id: `scan-${item.id}`,
      type: 'scan_session',
      created_date: item.created_date || item.created_at,
      ...item,
    }));

    honeypots.forEach((item) => items.push({
      id: `honeypot-${item.id}`,
      type: 'honeypot',
      created_date: item.created_date || item.created_at,
      ...item,
    }));

    firewallLogs.forEach((item) => items.push({
      id: `firewall-${item.id}`,
      type: 'firewall_log',
      created_date: item.created_date || item.created_at,
      ...item,
    }));

    events.forEach((item) => items.push({
      id: `event-${item.id}`,
      type: 'event',
      created_date: item.created_date || item.created_at,
      ...item,
    }));

    return items
      .sort((a, b) => getTimestamp(b) - getTimestamp(a));
  }, [threats, events, anomalies, emailThreats, scanSessions, honeypots, firewallLogs]);

  const filteredItems = useMemo(
    () => feedItems.filter((item) => activeFilter === 'all' || item.type === activeFilter),
    [feedItems, activeFilter]
  );

  const titleCount = filteredItems.length;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 border-b border-border hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <div className="text-left">
            <h3 className="font-mono text-xs font-semibold tracking-wider">LIVE CUSTOMER THREAT FEED</h3>
            <p className="font-mono text-[9px] text-muted-foreground mt-0.5">{titleCount} activities · Click to {isOpen ? 'collapse' : 'expand'}</p>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <>
          <div className="px-5 py-3 border-b border-border">
            <div className="flex flex-wrap gap-2">
              {feedFilters.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setActiveFilter(filter.id)}
                  className={`rounded-full px-3 py-1 text-[10px] font-semibold tracking-wide transition ${activeFilter === filter.id ? 'bg-primary text-primary-foreground border border-primary' : 'bg-secondary text-muted-foreground border border-border hover:bg-secondary/80'}`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto">
        <AnimatePresence>
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center">
              <Shield className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="font-mono text-xs text-muted-foreground">Collecting live security signals for the selected filter...</p>
            </div>
          ) : (
            filteredItems.slice(0, 50).map((item, index) => {
              const meta = typeMeta[item.type] || typeMeta.event;
              const Icon = meta.icon;
              const eventText = formatEvent(item);
              const severityClass = getSeverityBadge(eventText.severity);
              return (
                <motion.div
                  key={item.id || index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-start gap-3 px-5 py-3 border-b border-border/50 hover:bg-secondary/30 transition-colors"
                >
                  <div className={`p-1.5 rounded-md border ${meta.color} mt-0.5`}>
                    <Icon className="w-3 h-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[10px] font-semibold text-foreground">{eventText.title}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold tracking-wide uppercase ${severityClass}`}>{(eventText.severity || 'INFO').toString().toUpperCase()}</span>
                      <span className="font-mono text-[8px] text-muted-foreground uppercase">{meta.label}</span>
                    </div>
                    <p className="font-mono text-[9px] text-muted-foreground mt-1 truncate">{eventText.detail}</p>
                    {eventText.meta && <p className="font-mono text-[8px] text-muted-foreground mt-1 truncate">{eventText.meta}</p>}
                  </div>
                  <span className="font-mono text-[9px] text-muted-foreground whitespace-nowrap">
                    {new Date(getTimestamp(item)).toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                  </span>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
          </div>
        </>
      )}
    </div>
  );
}