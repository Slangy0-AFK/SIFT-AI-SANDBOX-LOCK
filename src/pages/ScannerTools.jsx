import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import useScannerUnlocks from '@/hooks/useScannerUnlocks';
import ProTools from '@/components/scanner/ProTools';
import DeviceCheckForm from '@/components/scanner/DeviceCheckForm';
import FullAuditForm from '@/components/scanner/FullAuditForm';

const LOGO = 'https://media.base44.com/images/public/6a0db3181169f42924052c0d/650b247a7_amazon.PNG';

const TIERS = [
  { id: 'pro', label: 'Pro' },
  { id: 'device_check', label: 'Device Check' },
  { id: 'full_audit', label: 'Full Device Audit' },
];

export default function ScannerTools() {
  const { unlocked, isLoading } = useScannerUnlocks();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-3">
            <img src={LOGO} alt="SiftAI" className="h-8 w-auto rounded-sm object-contain" />
            <span className="font-mono text-xs tracking-widest text-muted-foreground">DEVICE TOOLS</span>
          </Link>
          <Link to="/plans">
            <Button size="sm" variant="outline" className="font-mono text-xs">Plans</Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-10 px-4 py-12">
        <div>
          <h1 className="font-mono text-2xl font-bold tracking-wide text-foreground">Your device tools</h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            The manual checks are free. What is unlocked for your account is listed below, and anything still locked can be
            bought on the plans page.
          </p>
          {!isLoading && (
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs">Free</Badge>
              {TIERS.map((tier) => (
                <Badge
                  key={tier.id}
                  variant={unlocked.has(tier.id) ? 'default' : 'outline'}
                  className="font-mono text-xs"
                >
                  {tier.label} {unlocked.has(tier.id) ? '· unlocked' : '· locked'}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <section className="space-y-5">
          <div className="flex items-center gap-2">
            <h2 className="font-mono text-sm font-bold tracking-widest text-foreground">PRO</h2>
            <span className="font-mono text-xs text-muted-foreground">$7 per month</span>
          </div>
          <ProTools unlocked={unlocked.has('pro')} />
        </section>

        <section className="space-y-5">
          <div className="flex items-center gap-2">
            <h2 className="font-mono text-sm font-bold tracking-widest text-foreground">DEVICE CHECK</h2>
            <span className="font-mono text-xs text-muted-foreground">$49 one time</span>
          </div>
          <DeviceCheckForm unlocked={unlocked.has('device_check')} />
        </section>

        <section className="space-y-5">
          <div className="flex items-center gap-2">
            <h2 className="font-mono text-sm font-bold tracking-widest text-foreground">FULL DEVICE AUDIT</h2>
            <span className="font-mono text-xs text-muted-foreground">$99 one time</span>
          </div>
          <FullAuditForm unlocked={unlocked.has('full_audit')} />
        </section>

        <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
          <Shield className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
          <p className="font-mono text-xs leading-relaxed text-muted-foreground">
            No guaranteed detection and no guaranteed results. A scan is a check, not a certificate.
          </p>
        </div>

        <Link to="/plans" className="inline-flex items-center gap-2 font-mono text-xs text-primary hover:underline">
          See every plan <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </main>
    </div>
  );
}