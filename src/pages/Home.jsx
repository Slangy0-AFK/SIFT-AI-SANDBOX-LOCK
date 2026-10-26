import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  FileText,
  Globe,
  ListChecks,
  MessageCircle,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  Smartphone,
  Ticket
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import LimitsNote from '@/components/kit/LimitsNote';
import { SCANNER_PLANS } from '@/lib/scannerPlans';

const CHECKS = [
  {
    icon: Smartphone,
    title: 'An app you do not remember installing',
    text: 'Paste the app name, or upload a screenshot of the app details screen.'
  },
  {
    icon: ListChecks,
    title: 'A permission list',
    text: 'Upload the permissions screen. We point out the ones that do not fit what the app is supposed to do.'
  },
  {
    icon: FileText,
    title: 'A message that felt wrong',
    text: 'Paste the text or the email. We look for the usual scam and impersonation patterns.'
  },
  {
    icon: Globe,
    title: 'A link or a file hash',
    text: 'Paste the link, the domain or the hash, and we look up what is already known about it.'
  }
];

const VERDICTS = [
  {
    icon: ShieldCheck,
    label: 'Approved',
    tone: 'text-emerald-400',
    text: 'Nothing is known against it. Keep it, and we can watch it for changes.'
  },
  {
    icon: ShieldQuestion,
    label: 'Unknown',
    tone: 'text-amber-400',
    text: 'Not enough is known either way. We say so, instead of guessing.'
  },
  {
    icon: ShieldAlert,
    label: 'Flagged',
    tone: 'text-destructive',
    text: 'Something is known against it. You get the evidence, and the next step to take.'
  }
];

const STEPS = [
  'Upload or paste the thing you are unsure about.',
  'SIFT AI checks it and gives you a verdict in plain language.',
  'You decide: allow it, block and remove it, or put it on watch.'
];

export default function Home() {
  return (
    <div>
      <section className="border-b border-border bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center lg:py-24">
          <span className="font-mono text-xs tracking-[0.3em] text-primary">SIFT AI</span>
          <h1 className="mt-4 font-heading text-3xl font-bold tracking-tight sm:text-5xl">Find the AI you did not install.</h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
            SIFT AI is a personal checker for rogue and unauthorised AI on the devices you already own. Its main tool is the Phone
            Scanner: upload or paste the app, the permission screen, the link or the message you are unsure about, and get a verdict
            you can act on.
          </p>

          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/scan">
              <Button size="lg" className="w-full gap-2 sm:w-auto">
                <ScanLine className="h-4 w-4" />
                Start a free check
              </Button>
            </Link>
            <Link to="/plans">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                See what it costs
              </Button>
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {['No card needed to start', 'Verdicts in plain language', 'Your scans stay yours'].map((line) => (
              <span key={line} className="rounded-md border border-border bg-secondary/30 px-2.5 py-1 text-xs text-muted-foreground">
                {line}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-primary/5">
        <div className="mx-auto max-w-4xl px-4 py-10">
          <LimitsNote>
            SIFT AI is a website, not an app on your phone. A browser cannot look through a whole phone by itself. The Phone Scanner
            checks only the item you upload or paste, one item at a time, and it never claims a device is clean or safe. A scan is a
            check, not a certificate.
          </LimitsNote>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">What you can bring to it</h2>
        <p className="mt-2 text-muted-foreground">Four things people usually want a second opinion on.</p>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {CHECKS.map((item) => (
            <div key={item.title} className="rounded-2xl border border-border bg-card p-6">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
                <item.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-secondary/5">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">Three answers, never a guess</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {VERDICTS.map((verdict) => (
              <div key={verdict.label} className="rounded-2xl border border-border bg-card p-6">
                <verdict.icon className={`h-5 w-5 ${verdict.tone}`} />
                <h3 className="mt-4 font-semibold">{verdict.label}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{verdict.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">How it goes</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <div key={step} className="rounded-2xl border border-border bg-card p-6">
              <span className="font-mono text-xs text-primary">STEP {index + 1}</span>
              <p className="mt-3 text-sm text-muted-foreground">{step}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-secondary/5">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">Free to start, paid when you want more</h2>
              <p className="mt-2 text-muted-foreground">The everyday checks cost nothing. The paid tiers are for watching over time, or for a careful second look at something that already came up.</p>
            </div>
            <Link to="/plans" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
              All plans <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {SCANNER_PLANS.map((plan) => (
              <div key={plan.id} className={`rounded-2xl border bg-card p-6 ${plan.highlight ? 'border-primary/40' : 'border-border'}`}>
                <h3 className="font-heading text-base font-bold">{plan.name}</h3>
                <div className="mt-3 flex items-end gap-1.5">
                  <span className="font-mono text-2xl font-bold">{plan.price}</span>
                  <span className="mb-1 text-xs text-muted-foreground">{plan.cadence}</span>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{plan.blurb}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 px-4 py-16 text-center">
          <MessageCircle className="h-6 w-6 text-primary" />
          <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">Not sure about something?</h2>
          <p className="max-w-2xl text-muted-foreground">
            The helper inside the scanner answers plain questions about your own result. When you want a person, submit a support
            ticket: it goes straight to the SIFT AI team, you get an automatic first reply, and a person reads every one.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link to="/support#submit-ticket">
              <Button className="w-full gap-2 sm:w-auto">
                <Ticket className="h-4 w-4" />
                Submit a support ticket
              </Button>
            </Link>
            <Link to="/scan">
              <Button variant="outline" className="w-full gap-2 sm:w-auto">
                <ScanLine className="h-4 w-4" />
                Open the Phone Scanner
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}