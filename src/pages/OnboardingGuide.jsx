import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowRight, Shield, Zap, Lock, Bug, Skull, CreditCard, User, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const modules = [
  { icon: Shield, title: 'Command Center', path: '/dashboard', desc: 'Real-time threat monitoring dashboard', color: 'text-primary' },
  { icon: Zap, title: 'Attack Simulator', path: '/attack-sim', desc: 'Test defenses with simulated attacks', color: 'text-amber-400' },
  { icon: Lock, title: 'Firewall', path: '/firewall', desc: 'Configure security rules', color: 'text-accent' },
  { icon: Bug, title: 'Zero-Day Center', path: '/zero-day', desc: 'Detect unknown threats', color: 'text-green-400' },
  { icon: Skull, title: 'Threat Log', path: '/threat-log', desc: 'Review all detected threats', color: 'text-destructive' },
  { icon: User, title: 'Profile', path: '/profile', desc: 'Manage account & security', color: 'text-primary' },
  { icon: CreditCard, title: 'Subscription', path: '/subscription', desc: 'Upgrade plan & billing', color: 'text-green-400' },
  { icon: Settings, title: 'Settings', path: '/settings', desc: 'System configuration', color: 'text-muted-foreground' },
];

export default function OnboardingGuide() {
  const navigate = useNavigate();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-mono text-xl font-bold tracking-wider text-foreground">GETTING STARTED</h1>
        <p className="font-mono text-[10px] text-muted-foreground tracking-widest mt-1">
          QUICK START GUIDE · EXPLORE FEATURES
        </p>
      </div>

      {/* Welcome Card */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
              <CheckCircle className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-mono text-sm font-bold text-foreground">WELCOME TO SIFT-AI QUANTUM SHIELD</h3>
              <p className="font-mono text-[10px] text-muted-foreground mt-1 leading-relaxed">
                Your security dashboard is now fully configured. Start by exploring the Command Center to see real-time threat monitoring, 
                then try the Attack Simulator to test your defenses.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {modules.map((m, i) => (
          <Card
            key={i}
            className="border-border hover:border-primary/40 transition-all cursor-pointer group"
            onClick={() => navigate(m.path)}
          >
            <CardContent className="pt-5 pb-5">
              <div className="text-center">
                <m.icon className={`w-8 h-8 ${m.color} mx-auto mb-3 group-hover:scale-110 transition-transform`} />
                <p className="font-mono text-[11px] font-bold text-foreground">{m.title}</p>
                <p className="font-mono text-[9px] text-muted-foreground mt-1">{m.desc}</p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-3 font-mono text-[9px] text-primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(m.path);
                  }}
                >
                  Open <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-xs tracking-wider">QUICK TIPS</CardTitle>
          <CardDescription className="font-mono text-[9px]">Get the most out of SIFT-AI</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-secondary/30 border border-border rounded-lg p-4">
              <h4 className="font-mono text-[10px] font-bold text-foreground mb-2">1. Start with Dashboard</h4>
              <p className="font-mono text-[9px] text-muted-foreground leading-relaxed">
                The Command Center shows all active threats, security events, and system status at a glance.
              </p>
            </div>
            <div className="bg-secondary/30 border border-border rounded-lg p-4">
              <h4 className="font-mono text-[10px] font-bold text-foreground mb-2">2. Test with Simulator</h4>
              <p className="font-mono text-[9px] text-muted-foreground leading-relaxed">
                Use the Attack Simulator to generate test threats and see how the Base Chain pipeline processes them.
              </p>
            </div>
            <div className="bg-secondary/30 border border-border rounded-lg p-4">
              <h4 className="font-mono text-[10px] font-bold text-foreground mb-2">3. Configure Firewall</h4>
              <p className="font-mono text-[9px] text-muted-foreground leading-relaxed">
                Set up custom firewall rules to block, allow, or rate-limit specific IP addresses and ports.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-xs tracking-wider">FEATURE CHECKLIST</CardTitle>
          <CardDescription className="font-mono text-[9px]">Track your progress</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              'View Command Center dashboard',
              'Run Attack Simulator',
              'Configure firewall rules',
              'Review threat log',
              'Set up MFA (Settings)',
              'Create workflow automation',
              'Upgrade subscription (optional)',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                <span className="font-mono text-[10px] text-foreground">{item}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}