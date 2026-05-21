import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import {
  Mail, Link, Shield, AlertTriangle, CheckCircle2, XCircle,
  Loader2, Search, ShieldAlert, Globe, FileWarning, Eye,
  Cpu, Wifi, Lock, Zap, Bug, Server
} from 'lucide-react';

const THREAT_CATEGORIES = [
  {
    icon: Mail, label: 'Phishing / Email', color: 'text-orange-400',
    description: 'Deceptive emails stealing credentials or delivering malware'
  },
  {
    icon: Link, label: 'Malicious URLs', color: 'text-red-400',
    description: 'Links to malware, exploit kits, or credential harvesting pages'
  },
  {
    icon: Bug, label: 'Malware & Ransomware', color: 'text-destructive',
    description: 'Software designed to damage, encrypt, or exfiltrate data'
  },
  {
    icon: Cpu, label: 'AI / Agent Attacks', color: 'text-purple-400',
    description: 'Autonomous bots & LLM-based adversarial agents'
  },
  {
    icon: Wifi, label: 'Network Intrusion', color: 'text-yellow-400',
    description: 'Unauthorized access via port scanning, MITM, or sniffing'
  },
  {
    icon: Server, label: 'DDoS / Volumetric', color: 'text-blue-400',
    description: 'Flooding attacks to overwhelm infrastructure'
  },
  {
    icon: Lock, label: 'Brute Force / Credential', color: 'text-primary',
    description: 'Password spraying, stuffing, and MFA bypass attempts'
  },
  {
    icon: Globe, label: 'Supply Chain', color: 'text-green-400',
    description: 'Compromised third-party software or hardware components'
  },
  {
    icon: Eye, label: 'Social Engineering', color: 'text-pink-400',
    description: 'Manipulation tactics targeting human psychology'
  },
  {
    icon: FileWarning, label: 'Zero-Day Exploits', color: 'text-accent',
    description: 'Unknown vulnerabilities with no existing patch'
  },
  {
    icon: Zap, label: 'Insider Threats', color: 'text-amber-400',
    description: 'Malicious or negligent actions by trusted users'
  },
  {
    icon: ShieldAlert, label: 'Firmware / Hardware', color: 'text-cyan-400',
    description: 'Low-level attacks targeting device firmware or chips'
  },
];

function ThreatMatrix() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-mono text-xs tracking-wider flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" /> THREAT COVERAGE MATRIX
        </CardTitle>
        <p className="font-mono text-[9px] text-muted-foreground tracking-wide">
          All known cyber threat vectors monitored by PiBand
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {THREAT_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <div key={cat.label} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/40 border border-border/50">
                <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${cat.color}`} />
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`font-mono text-[10px] font-bold ${cat.color}`}>{cat.label}</span>
                    <Badge variant="outline" className="font-mono text-[7px] text-green-400 border-green-400/30">COVERED</Badge>
                  </div>
                  <p className="font-mono text-[9px] text-muted-foreground mt-0.5 leading-relaxed">{cat.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function VerdictBadge({ verdict }) {
  const config = {
    PHISHING: { color: 'text-destructive border-destructive/40 bg-destructive/10', icon: XCircle },
    MALICIOUS: { color: 'text-destructive border-destructive/40 bg-destructive/10', icon: XCircle },
    SUSPICIOUS: { color: 'text-amber-400 border-amber-400/40 bg-amber-400/10', icon: AlertTriangle },
    CLEAN: { color: 'text-green-400 border-green-400/40 bg-green-400/10', icon: CheckCircle2 },
  }[verdict] || { color: 'text-muted-foreground border-border', icon: Shield };
  const Icon = config.icon;
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border font-mono text-sm font-bold ${config.color}`}>
      <Icon className="w-4 h-4" /> {verdict}
    </div>
  );
}

function FindingRow({ finding }) {
  const severityColor = {
    critical: 'text-destructive', high: 'text-orange-400',
    medium: 'text-amber-400', info: 'text-green-400'
  }[finding.severity] || 'text-muted-foreground';
  return (
    <div className="flex items-start gap-2 p-2 rounded bg-secondary/30 border border-border/40">
      <span className={`font-mono text-[9px] font-bold uppercase mt-0.5 flex-shrink-0 ${severityColor}`}>
        [{finding.severity}]
      </span>
      <span className="font-mono text-[10px] text-foreground">{finding.detail}</span>
    </div>
  );
}

function EmailAnalyzer() {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sender, setSender] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const analyze = async () => {
    setLoading(true);
    setResult(null);
    const res = await base44.functions.invoke('phishingAnalyzer', {
      action: 'analyze_email', subject, body, sender
    });
    setResult(res.data);
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-mono text-xs tracking-wider flex items-center gap-2">
          <Mail className="w-4 h-4 text-orange-400" /> PHISHING EMAIL ANALYZER
        </CardTitle>
        <p className="font-mono text-[9px] text-muted-foreground">Paste email content to scan for phishing indicators</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <input
          className="w-full bg-background border border-border rounded-lg px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
          placeholder="Sender email (e.g. noreply@suspicious-domain.xyz)"
          value={sender}
          onChange={e => setSender(e.target.value)}
        />
        <input
          className="w-full bg-background border border-border rounded-lg px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
          placeholder="Email subject line"
          value={subject}
          onChange={e => setSubject(e.target.value)}
        />
        <textarea
          className="w-full bg-background border border-border rounded-lg px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 h-28 resize-none"
          placeholder="Paste email body content here..."
          value={body}
          onChange={e => setBody(e.target.value)}
        />
        <Button className="w-full font-mono text-xs" onClick={analyze} disabled={loading || (!subject && !body)}>
          {loading ? <><Loader2 className="w-3 h-3 mr-2 animate-spin" />Analyzing...</> : <><Search className="w-3 h-3 mr-2" />Analyze for Phishing</>}
        </Button>

        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              <div className="flex items-center justify-between">
                <VerdictBadge verdict={result.verdict} />
                <div className="font-mono text-xs text-muted-foreground">
                  Risk Score: <span className={`font-bold ${result.riskScore >= 70 ? 'text-destructive' : result.riskScore >= 40 ? 'text-amber-400' : 'text-green-400'}`}>
                    {result.riskScore}/100
                  </span>
                </div>
              </div>
              <div className="space-y-1.5">
                {result.findings?.map((f, i) => <FindingRow key={i} finding={f} />)}
              </div>
              {result.urlsFound?.length > 0 && (
                <div className="p-2 rounded bg-secondary/30 border border-border/40">
                  <p className="font-mono text-[9px] text-muted-foreground mb-1">URLs found in email:</p>
                  {result.urlsFound.map((u, i) => (
                    <p key={i} className="font-mono text-[9px] text-primary truncate">{u}</p>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

function UrlAnalyzer() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const analyze = async () => {
    setLoading(true);
    setResult(null);
    const res = await base44.functions.invoke('phishingAnalyzer', { action: 'analyze_url', url });
    setResult(res.data);
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-mono text-xs tracking-wider flex items-center gap-2">
          <Link className="w-4 h-4 text-red-400" /> URL THREAT SCANNER
        </CardTitle>
        <p className="font-mono text-[9px] text-muted-foreground">Check any URL for malicious indicators</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <input
            className="flex-1 bg-background border border-border rounded-lg px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
            placeholder="https://suspicious-link.example.com/login"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && url && analyze()}
          />
          <Button size="sm" className="font-mono text-xs" onClick={analyze} disabled={loading || !url}>
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
          </Button>
        </div>

        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
              <div className="flex items-center justify-between">
                <VerdictBadge verdict={result.verdict} />
                <div className="font-mono text-xs text-muted-foreground">
                  Risk: <span className={`font-bold ${result.riskScore >= 70 ? 'text-destructive' : result.riskScore >= 40 ? 'text-amber-400' : 'text-green-400'}`}>
                    {result.riskScore}/100
                  </span>
                </div>
              </div>
              <div className="space-y-1.5">
                {result.findings?.map((f, i) => <FindingRow key={i} finding={f} />)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

export default function ThreatIntelligence() {
  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="font-mono text-xl font-bold tracking-wider text-foreground">THREAT INTELLIGENCE</h1>
        <p className="font-mono text-[10px] text-muted-foreground tracking-widest mt-1">
          FULL-SPECTRUM CYBER THREAT DETECTION & ANALYSIS
        </p>
      </div>

      <ThreatMatrix />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <EmailAnalyzer />
        <UrlAnalyzer />
      </div>
    </div>
  );
}