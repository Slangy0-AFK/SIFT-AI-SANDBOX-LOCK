import React, { useState } from 'react';
import { CheckCircle2, XCircle, AlertCircle, ArrowLeft, ClipboardList, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

const CHECKLIST = [
  {
    category: 'Privacy Policy',
    items: [
      { label: 'Privacy policy exists and is accessible via a live URL', status: 'pass', note: 'Available at /privacy-policy in-app' },
      { label: 'Privacy policy linked from Google Play Store listing', status: 'action', note: 'Add your /privacy-policy URL to Play Console → Store Listing → Privacy Policy URL' },
      { label: 'Privacy policy linked from within the app', status: 'pass', note: 'Accessible from Settings page' },
      { label: 'Data collection practices disclosed (account, device, security data)', status: 'pass', note: 'Covered in Privacy Policy §2' },
      { label: 'Data usage and sharing disclosed', status: 'pass', note: 'Covered in Privacy Policy §3–4' },
      { label: 'Third-party services identified (Google Play, Base44)', status: 'pass', note: 'Covered in Privacy Policy §9' },
      { label: 'User rights disclosed (access, modify, delete)', status: 'pass', note: 'Covered in Privacy Policy §7' },
      { label: "Children's privacy statement included", status: 'pass', note: 'Covered in Privacy Policy §8' },
    ],
  },
  {
    category: 'Data Safety Form (Play Console)',
    items: [
      { label: 'Data Safety section completed in Play Console', status: 'action', note: 'Go to Play Console → App Content → Data Safety and declare: email, device ID, purchase data' },
      { label: 'Data collection declared: Account info (email)', status: 'action', note: 'Declare in Data Safety form' },
      { label: 'Data collection declared: Device identifiers', status: 'action', note: 'Declare device fingerprint collection' },
      { label: 'Data collection declared: App interactions (analytics)', status: 'action', note: 'Declare usage/analytics events' },
      { label: 'Data collection declared: Financial info (purchase tokens)', status: 'action', note: 'Declare Google Play purchase token storage' },
      { label: 'Data encryption in transit confirmed (HTTPS)', status: 'pass', note: 'All API calls use HTTPS/TLS' },
      { label: 'Data deletion option available to users', status: 'pass', note: 'Data deletion request available in Settings → Account Management' },
    ],
  },
  {
    category: 'Terms of Service',
    items: [
      { label: 'Terms of Service document exists', status: 'pass', note: 'Available at /terms in-app' },
      { label: 'Subscription billing terms clearly stated', status: 'pass', note: 'Covered in ToS §4' },
      { label: 'Permitted/prohibited use cases defined', status: 'pass', note: 'Covered in ToS §3' },
      { label: 'Limitation of liability clause included', status: 'pass', note: 'Covered in ToS §9' },
      { label: 'Account termination policy stated', status: 'pass', note: 'Covered in ToS §10' },
    ],
  },
  {
    category: 'In-App Billing (Google Play)',
    items: [
      { label: 'Google Play Billing used for in-app purchases (no external payment links)', status: 'pass', note: 'Using Google Play Billing exclusively for subscriptions' },
      { label: 'Subscription price clearly shown before purchase', status: 'action', note: 'Ensure plan pricing is visible on Subscription page before user confirms purchase' },
      { label: 'Free tier clearly differentiated from paid tiers', status: 'pass', note: 'Free/Pro/Enterprise tiers are distinct on Subscription page' },
      { label: 'No external payment links within the app', status: 'pass', note: 'All billing goes through Google Play' },
    ],
  },
  {
    category: 'App Content & Security',
    items: [
      { label: 'App content rating submitted in Play Console', status: 'action', note: 'Complete the content rating questionnaire in Play Console → App Content → Content Rating' },
      { label: 'App targets a professional/enterprise audience (not children)', status: 'pass', note: 'AEGIS is a cybersecurity SaaS for professionals' },
      { label: 'Sensitive permissions justified (if any)', status: 'pass', note: 'No dangerous/sensitive Android permissions required' },
      { label: 'No malware, deceptive behavior, or unauthorized data access', status: 'pass', note: 'All data access is user-initiated and authorized' },
    ],
  },
  {
    category: 'Authentication & Account Management',
    items: [
      { label: 'Users can create and manage accounts', status: 'pass', note: 'Auth handled by Base44 platform' },
      { label: 'Account deletion mechanism available', status: 'pass', note: 'Account deletion available in Settings → Account Management' },
      { label: 'Login is secure and not storing plain-text passwords', status: 'pass', note: 'Auth managed by Base44 — no password storage in app' },
    ],
  },
];

const STATUS_CONFIG = {
  pass: { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/20', label: 'PASS' },
  action: { icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/20', label: 'ACTION NEEDED' },
  fail: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20', label: 'FAIL' },
};

export default function ComplianceChecklist() {
  const [expanded, setExpanded] = useState({});

  const allItems = CHECKLIST.flatMap(c => c.items);
  const passes = allItems.filter(i => i.status === 'pass').length;
  const actions = allItems.filter(i => i.status === 'action').length;
  const fails = allItems.filter(i => i.status === 'fail').length;
  const score = Math.round((passes / allItems.length) * 100);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Link to="/settings" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-primary" />
          <h1 className="font-mono text-xl font-bold tracking-wider text-foreground">GOOGLE PLAY COMPLIANCE</h1>
        </div>
      </div>
      <p className="font-mono text-[10px] text-muted-foreground tracking-widest">
        AEGIS QUANTUM SHIELD · PLAY STORE READINESS CHECKLIST
      </p>

      {/* Score */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 text-center col-span-1">
          <div className={`font-mono text-3xl font-bold ${score >= 80 ? 'text-green-400' : score >= 60 ? 'text-amber-400' : 'text-red-400'}`}>{score}%</div>
          <div className="font-mono text-[9px] text-muted-foreground mt-1 tracking-wide">COMPLIANCE SCORE</div>
        </div>
        <div className="bg-card border border-green-400/20 rounded-xl p-4 text-center">
          <div className="font-mono text-2xl font-bold text-green-400">{passes}</div>
          <div className="font-mono text-[9px] text-muted-foreground mt-1 tracking-wide">PASSED</div>
        </div>
        <div className="bg-card border border-amber-400/20 rounded-xl p-4 text-center">
          <div className="font-mono text-2xl font-bold text-amber-400">{actions}</div>
          <div className="font-mono text-[9px] text-muted-foreground mt-1 tracking-wide">ACTIONS NEEDED</div>
        </div>
        <div className="bg-card border border-red-400/20 rounded-xl p-4 text-center">
          <div className="font-mono text-2xl font-bold text-red-400">{fails}</div>
          <div className="font-mono text-[9px] text-muted-foreground mt-1 tracking-wide">FAILED</div>
        </div>
      </div>

      {/* Action Items Banner */}
      {actions > 0 && (
        <div className="bg-amber-400/10 border border-amber-400/30 rounded-xl p-4">
          <p className="font-mono text-xs text-amber-400 font-bold mb-1">⚡ {actions} ACTIONS REQUIRED BEFORE PUBLISHING</p>
          <p className="font-mono text-[10px] text-muted-foreground">
            Items marked "ACTION NEEDED" must be completed in Google Play Console or in-app before submission.
            Click any item to see details.
          </p>
        </div>
      )}

      {/* Checklist */}
      <div className="space-y-4">
        {CHECKLIST.map((category) => (
          <div key={category.category} className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border">
              <h2 className="font-mono text-xs font-bold text-foreground tracking-wider uppercase">{category.category}</h2>
            </div>
            <div className="divide-y divide-border">
              {category.items.map((item, idx) => {
                const cfg = STATUS_CONFIG[item.status];
                const Icon = cfg.icon;
                const key = `${category.category}-${idx}`;
                return (
                  <div key={key} className="px-5 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => setExpanded(e => ({ ...e, [key]: !e[key] }))}>
                    <div className="flex items-start gap-3">
                      <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${cfg.color}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-xs text-foreground">{item.label}</p>
                        {expanded[key] && (
                          <p className={`font-mono text-[10px] mt-1.5 px-2 py-1.5 rounded border ${cfg.bg} ${cfg.color}`}>
                            {item.note}
                          </p>
                        )}
                      </div>
                      <Badge className={`font-mono text-[9px] border flex-shrink-0 ${cfg.bg} ${cfg.color}`}>
                        {cfg.label}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Links */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <h2 className="font-mono text-xs font-bold text-foreground tracking-wider uppercase">Official Resources</h2>
        <div className="space-y-2">
          {[
            { label: 'Google Play Developer Policy Center', url: 'https://play.google.com/about/developer-content-policy/' },
            { label: 'Play Console — Data Safety Form', url: 'https://play.google.com/console' },
            { label: 'Google Play Billing Requirements', url: 'https://support.google.com/googleplay/android-developer/answer/10281818' },
            { label: 'Account Deletion Requirements', url: 'https://support.google.com/googleplay/android-developer/answer/13327111' },
          ].map(link => (
            <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 font-mono text-[10px] text-primary hover:underline">
              <ExternalLink className="w-3 h-3" /> {link.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}