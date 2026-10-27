import React from 'react';
import { Link } from 'react-router-dom';
import { Ban, ScanLine, ShieldAlert, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STEPS = [
  {
    icon: ScanLine,
    title: 'Send it to the Phone Scanner',
    text: 'Submit a link, a domain, a file hash or a message you want checked.'
  },
  {
    icon: ShieldAlert,
    title: 'It gets checked',
    text: 'The item is run against public threat feeds and a rogue-AI checklist.'
  },
  {
    icon: Users,
    title: 'You get a clear result',
    text: 'Approved, Unknown or Flagged, with a record of what was actually checked.'
  }
];

const VERDICTS = ['Approved', 'Unknown', 'Flagged'];

const NOT_THIS = [
  'Not a replacement for antivirus.',
  'Not a full device scan.',
  'Not a guarantee that a device is safe.',
  'It never asks for passwords, keys, IMEI, serial numbers, phone numbers or payment details to run a check.'
];

export default function About() {
  return (
    <div>
      <section className="mx-auto max-w-4xl px-4 py-14 sm:py-16">
        <p className="font-heading text-xs uppercase tracking-widest text-primary">About</p>
        <h1 className="mt-3 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
          A simple check before you trust something.
        </h1>
        <p className="mt-4 text-muted-foreground">
          SIFT AI is a personal checker for rogue and unauthorised AI on the devices you already own. It is built for normal people
          who want to check something suspicious before they trust it.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link to="/scan">
            <Button size="lg" className="w-full gap-2 sm:w-auto">
              <ScanLine className="h-4 w-4" />
              Start a free check
            </Button>
          </Link>
          <Link to="/support">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              Get help
            </Button>
          </Link>
        </div>
      </section>

      <section className="border-y border-border bg-secondary/5">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:py-14">
          <h2 className="font-heading text-2xl font-bold tracking-tight">The problem it solves</h2>
          <p className="mt-3 text-muted-foreground">
            AI tools, extensions, links and messages are everywhere now, and it is hard to tell what is legitimate and what is not.
            SIFT AI gives you a simple check before you act.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-12 sm:py-14">
        <h2 className="font-heading text-2xl font-bold tracking-tight">How it works</h2>

        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <div key={step.title} className="rounded-2xl border border-border bg-card p-6">
              <span className="font-mono text-xs text-primary">STEP {index + 1}</span>
              <h3 className="mt-3 font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{step.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {VERDICTS.map((verdict) => (
            <span key={verdict} className="rounded-md border border-border bg-secondary/30 px-2.5 py-1 text-xs text-muted-foreground">
              {verdict}
            </span>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-card p-6">
          <h3 className="font-heading text-base font-bold">What a check does not do</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>It does not scan a whole phone on its own.</li>
            <li>It does not watch a device in real time.</li>
            <li>It does not guarantee that a device is clean. “No hits in the checks run” means no hits in those checks, not a guarantee.</li>
          </ul>
        </div>
      </section>

      <section className="border-y border-border bg-secondary/5">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:py-14">
          <h2 className="font-heading text-2xl font-bold tracking-tight">Who it is for</h2>
          <p className="mt-3 text-muted-foreground">
            Anyone worried about a weird app, extension, link or message, and who wants a second opinion before clicking, installing
            or trusting it. You do not need to be technical to use it.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-12 sm:py-14">
        <h2 className="font-heading text-2xl font-bold tracking-tight">What SIFT AI is not</h2>
        <div className="mt-6 rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-2">
            <Ban className="h-4 w-4 text-primary" />
            <h3 className="font-heading text-base font-bold">Said plainly, up front</h3>
          </div>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {NOT_THIS.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto flex max-w-4xl flex-col items-start gap-4 px-4 py-12 sm:py-14">
          <h2 className="font-heading text-2xl font-bold tracking-tight">Support</h2>
          <p className="text-muted-foreground">
            Support comes from the SIFT AI team, under the name SIFT AI support only. No personal names are used. Tickets and help
            articles are on the Support page.
          </p>
          <Link to="/support">
            <Button className="w-full sm:w-auto">Open Support</Button>
          </Link>
          <Link to="/support#submit-ticket" className="text-sm font-medium text-primary hover:underline">
            Or submit a ticket straight away
          </Link>
        </div>
      </section>
    </div>
  );
}