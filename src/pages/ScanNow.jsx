import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Shield, ShieldAlert, ScanLine, ArrowRight, Upload, MessageSquare, Wrench } from 'lucide-react';
import FreeScan from '@/components/scanner/FreeScan';
import RecentChecks from '@/components/scanner/RecentChecks';
import HelperAgent from '@/components/scanner/HelperAgent';
import { HONEST_NOTE } from '@/lib/scannerPlans';
import AlienVaultWidget from '@/components/scanner/AlienVaultWidget';

const TIERS = [
  {
    icon: Upload,
    name: 'Free',
    price: '$0',
    text: 'The everyday checks: a link, a domain, a hash or a message, plus your own history.'
  },
  {
    icon: Shield,
    name: 'Pro',
    price: '$7 / month',
    text: 'Saved device profiles, re-checks of flagged items, PDF reports and priority help.'
  },
  {
    icon: ShieldAlert,
    name: 'Device Check',
    price: '$49 once',
    text: 'A careful second look at one flagged item, with the evidence and a fix list.'
  },
  {
    icon: Wrench,
    name: 'Full Device Audit',
    price: '$99 once',
    text: 'A written review of a device: the app list, the network destinations and every flagged item.'
  }
];

export default function ScanNow() {
  const [authed, setAuthed] = useState(null);

  useEffect(() => {
    base44.auth
      .isAuthenticated()
      .then((value) => setAuthed(value))
      .catch(() => setAuthed(false));
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-5xl space-y-10 px-4 py-12">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">Phone Scanner</h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            Bring the thing you are unsure about: a link, a domain, a file hash, a message, an app name or a permission screen. You
            get one of three answers: nothing is known against it, unknown, or flagged with the evidence.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {['Runs in your browser', 'Nothing is installed on your phone', 'Your checks stay on your account'].map((line) => (
              <span key={line} className="rounded-md border border-border bg-secondary/30 px-2.5 py-1 font-mono text-xs text-muted-foreground">
                {line}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4">
          <p className="font-mono text-xs leading-relaxed text-amber-400">
            Please read this: SIFT AI is a website, not an app on your phone, and a browser cannot look through a whole phone by
            itself. It checks only the single item you upload or paste. It never claims a device is clean or safe, and it never
            needs your passwords, one-time codes, card details, phone number, IMEI or serial numbers.
          </p>
        </div>

        {authed === false && (
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-heading text-base font-bold">A free account keeps it yours</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              The checks run on your own account, so your history stays yours and nobody else can see it. An account is free, takes
              a moment, and no card is needed.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link to="/register">
                <Button className="font-mono text-xs">Create a free account</Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" className="font-mono text-xs">I already have one</Button>
              </Link>
            </div>
          </div>
        )}

        <section className="space-y-5">
          <h2 className="font-heading text-sm font-bold tracking-widest">CHECK SOMETHING NOW</h2>
          <FreeScan isAuthed={authed === true} />
          {authed === true && <RecentChecks />}
        </section>

        {authed === true && (
          <section className="space-y-5">
            <h2 className="font-heading text-sm font-bold tracking-widest">CHECK AN INDICATOR IN DEPTH</h2>
            <AlienVaultWidget />
          </section>
        )}

        <section className="space-y-5">
          <h2 className="font-heading text-sm font-bold tracking-widest">WHEN YOU WANT MORE</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TIERS.map((tier) => (
              <div key={tier.name} className="rounded-2xl border border-border bg-card p-5">
                <tier.icon className="h-5 w-5 text-primary" />
                <h3 className="mt-3 font-heading text-sm font-bold">{tier.name}</h3>
                <p className="font-mono text-xs text-muted-foreground">{tier.price}</p>
                <p className="mt-3 text-sm text-muted-foreground">{tier.text}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/plans">
              <Button className="gap-2 font-mono text-xs">
                See the plans <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
            {authed === true && (
              <Link to="/scanner">
                <Button variant="outline" className="gap-2 font-mono text-xs">
                  <ScanLine className="h-3.5 w-3.5" /> Your device tools
                </Button>
              </Link>
            )}
          </div>
        </section>

        <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
          <MessageSquare className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
          <p className="text-sm text-muted-foreground">
            Stuck on a result or a payment? Use the Help / Ask button in the corner. It answers from your own result and the app's
            help pages, and it can open a support ticket for you in one click.
          </p>
        </div>

        <p className="font-mono text-xs leading-relaxed text-muted-foreground">{HONEST_NOTE}</p>
      </main>

      <HelperAgent page="Phone Scanner (/scan)" />
    </div>
  );
}