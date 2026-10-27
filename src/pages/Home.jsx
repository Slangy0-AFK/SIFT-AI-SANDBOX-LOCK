import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock, Gauge, ListChecks, Lock, Power, Puzzle, ScrollText, ShieldCheck, Workflow } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LimitsNote from '@/components/kit/LimitsNote';
import AgentGuarantees from '@/components/home/AgentGuarantees';
import AgentPillars from '@/components/home/AgentPillars';
import { SCANNER_PLANS } from '@/lib/scannerPlans';

const GATES = [
  {
    icon: ListChecks,
    title: 'Admission',
    text: 'The instruction is weighed before it reaches the model: where it came from, what it asks for, and whether a document is trying to give orders.'
  },
  {
    icon: Lock,
    title: 'Tool gate',
    text: 'Every tool call is decided before it executes. A tool the agent should not reach is refused, and the refusal is what your code sees.'
  },
  {
    icon: ScrollText,
    title: 'Log before the action',
    text: 'The entry is written before the action happens, carrying the pattern category and never your message text. If the log cannot be written, the action does not happen.'
  },
  {
    icon: Gauge,
    title: 'Loop ceiling',
    text: 'An agent that keeps calling itself is stopped at the ceiling, so a run cannot quietly spend an afternoon or a budget.'
  },
  {
    icon: ShieldCheck,
    title: 'Output shield',
    text: 'What comes back is checked on the way out, so a bad answer or a leaked instruction does not reach the person or the next tool.'
  }
];

const STEPS = [
  {
    title: 'Create an account',
    text: 'An account is what holds your runs, your license key and anything you buy. Nothing else on this site opens until you are logged in.'
  },
  {
    title: 'Put the harness around your model',
    text: 'One small plug-in, JavaScript or Python, reads the killswitch and the gates on every message and every tool call.'
  },
  {
    title: 'Run the puzzles and read the log',
    text: 'Work through the eval puzzles, watch each gate decide, and keep the log that shows what was allowed, what was refused, and why it stopped.'
  }
];

export default function Home() {
  return (
    <div>
      <div className="border-b border-primary/30 bg-primary/10">
        <div className="mx-auto flex max-w-4xl items-center justify-center gap-2 px-4 py-2.5 text-center">
          <Clock className="h-3.5 w-3.5 shrink-0 text-primary" />
          <p className="font-mono text-[11px] tracking-wide text-foreground">
            COMING SOON — SIFT AI is not open yet. Accounts, plans and the tools open at launch.
          </p>
        </div>
      </div>

      <section className="border-b border-border bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center lg:py-24">
          <span className="font-mono text-xs tracking-[0.3em] text-primary">SIFT AI · AGENT CONTROL</span>
          <h1 className="mt-4 font-heading text-3xl font-bold tracking-tight sm:text-5xl">
            A killswitch for the agents you run.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Your agent already has tools, a budget and a way to read the internet. SIFT AI puts a switch over it, a harness around
            it, and a set of eval puzzles in front of it — so it stops before code runs, logs before it acts, and shows you how it
            behaves before you leave it alone with anything.
          </p>

          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/register">
              <Button size="lg" className="w-full gap-2 sm:w-auto">
                <Power className="h-4 w-4" />
                Create an account
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                I already have one
              </Button>
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {['Free to create an account', 'Nothing to install to look around', 'You decide what your agent may touch'].map((line) => (
              <span key={line} className="rounded-md border border-border bg-secondary/30 px-2.5 py-1 text-xs text-muted-foreground">
                {line}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-primary/5">
        <div className="mx-auto max-w-4xl px-4 py-10">
          <LimitsNote
            items={[
              'Nothing here scores a model or certifies an agent. Passing a puzzle is a check, not a certificate.',
              'SIFT AI does not change, patch or rewrite your model. It sits in front of it and around its tools.',
              'The harness only holds where you place it: before the model on the way in, and around every tool call.',
              'It never asks for your password, an API key for another service, or payment details to run a check.',
            ]}
          />
        </div>
      </section>

      <AgentPillars />

      <section className="border-y border-border bg-secondary/5">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">The five gates around your agent</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Every message and every tool call passes through the same five decisions. All five travel in the plug-in code, so the
            harness is complete or it is not installed.
          </p>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {GATES.map((gate) => (
              <div key={gate.title} className="rounded-2xl border border-border bg-card p-6">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
                  <gate.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold">{gate.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{gate.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">How it goes</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <div key={step.title} className="rounded-2xl border border-border bg-card p-6">
              <span className="font-mono text-xs text-primary">STEP {index + 1}</span>
              <h3 className="mt-3 font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      <AgentGuarantees />

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2">
                <Puzzle className="h-5 w-5 text-primary" />
                <h2 className="font-heading text-2xl font-bold tracking-tight">Eval puzzles, not promises</h2>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Each puzzle is an authored scenario with a right answer the harness can check: an instruction hidden in a document,
                a tool the agent should refuse, a spend it should question, a loop it should break. You get what it tests, what the
                run found, and where the result stops being useful.
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                The puzzles and the killswitch demo open with your account. Buying stays inside the account too, so the key and the
                receipt are always yours.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-3">
              <Link to="/register">
                <Button className="w-full gap-2">
                  <Workflow className="h-4 w-4" />
                  Create an account
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" className="w-full">
                  Log in
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-secondary/5">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">Free to start, paid when you want more</h2>
              <p className="mt-2 max-w-2xl text-muted-foreground">
                The killswitch and the puzzles cost nothing. The paid tiers are for keeping an agent under watch, or for a careful
                written look at one that already worried you.
              </p>
            </div>
            <Link to="/login" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
              Sign in for plans <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
          <Power className="h-6 w-6 text-primary" />
          <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">Start with the switch</h2>
          <p className="max-w-2xl text-muted-foreground">
            Create an account, put the harness around one model, and watch the gates decide. If something still looks wrong, the
            support box inside your account reaches the SIFT AI team.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link to="/register">
              <Button className="w-full sm:w-auto">Create an account</Button>
            </Link>
            <Link to="/about">
              <Button variant="outline" className="w-full sm:w-auto">
                Read about it first
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}