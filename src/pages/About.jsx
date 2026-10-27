import React from 'react';
import { Link } from 'react-router-dom';
import { Ban, Gauge, Lock, Power, Puzzle, ScrollText, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AgentPillars from '@/components/home/AgentPillars';

const PROBLEM = [
  'An agent reads a page, a ticket or an attachment, and takes what it finds as an instruction.',
  'It reaches for a tool it was never meant to use, and the tool does what it is told.',
  'It runs in a loop, and the spend grows while nobody is watching.',
  'The action happens, and only afterwards does anyone ask why it happened.'
];

const NOT_THIS = [
  'Not a model, and not a replacement for one.',
  'Not a patch: it does not change, rewrite or fine-tune your agent.',
  'Not a score. A puzzle that passes is a check, not a certificate that an agent is safe.',
  'Not a guarantee. It never promises that an agent will behave, only that a decision was made and written down.',
  'It never asks for passwords, keys for another service, IMEI, serial numbers or payment details to run a check.'
];

const GATES = [
  { icon: Lock, title: 'Admission', text: 'Is this a request, or a document trying to give orders?' },
  { icon: ShieldCheck, title: 'Tool gate', text: 'May this agent reach this tool at all, right now?' },
  { icon: ScrollText, title: 'Log first', text: 'Is the entry written before the action is allowed to happen?' },
  { icon: Gauge, title: 'Loop ceiling', text: 'Has this agent already gone round too many times?' }
];

export default function About() {
  return (
    <div>
      <section className="mx-auto max-w-4xl px-4 py-14 sm:py-16">
        <p className="font-heading text-xs uppercase tracking-widest text-primary">About</p>
        <h1 className="mt-3 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
          A switch and a harness for agents that act on their own.
        </h1>
        <p className="mt-4 text-muted-foreground">
          SIFT AI is agent control: a killswitch that answers before anything runs, a harness of five gates around your model, and
          eval puzzles that test how an agent behaves rather than how good its answers look.
        </p>
        <p className="mt-3 text-muted-foreground">
          What you walk away with each time: a decision on the action in front of you, a log entry written before it happened, and a
          puzzle result that says what was tested and where that result stops being useful.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
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
      </section>

      <section className="border-y border-border bg-secondary/5">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:py-14">
          <h2 className="font-heading text-2xl font-bold tracking-tight">The problem it solves</h2>
          <p className="mt-3 text-muted-foreground">
            An agent with tools is useful because it can do things on its own. That is also the whole risk: the decision to act is
            made somewhere nobody can see, and by the time the action is visible it has already run.
          </p>
          <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
            {PROBLEM.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      </section>

      <AgentPillars />

      <section className="border-y border-border bg-secondary/5">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:py-14">
          <h2 className="font-heading text-2xl font-bold tracking-tight">How the harness decides</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {GATES.map((gate) => (
              <div key={gate.title} className="rounded-2xl border border-border bg-card p-6">
                <gate.icon className="h-5 w-5 text-primary" />
                <h3 className="mt-3 font-semibold">{gate.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{gate.text}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-sm text-muted-foreground">
            Two answers come back: allowed, or stopped, with the gate that made the call. The switch is read first on every message,
            so a run can be ended without touching your code, and an unreadable switch counts as stopped.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-12 sm:py-14">
        <h2 className="font-heading text-2xl font-bold tracking-tight">The puzzles</h2>
        <p className="mt-3 text-muted-foreground">
          Behaviour is what matters, so the puzzles are scenarios with checkable outcomes: an instruction planted in a document, a
          tool the agent should refuse, a spend it should question, an action it should log before taking. Each one is run and
          written up the same way, so two runs can be compared instead of argued about.
        </p>
        <div className="mt-6 flex items-center gap-2 rounded-2xl border border-border bg-card p-6">
          <Puzzle className="h-4 w-4 shrink-0 text-primary" />
          <p className="text-sm text-muted-foreground">
            The puzzles and the killswitch demo, together with everything you have run, sit inside your account.
          </p>
        </div>
      </section>

      <section className="border-y border-border bg-secondary/5">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:py-14">
          <h2 className="font-heading text-2xl font-bold tracking-tight">Who it is for</h2>
          <p className="mt-3 text-muted-foreground">
            Anyone shipping an agent that can spend money, send messages, touch a database or call another service — and anyone who
            has to answer the question "what stopped it?" afterwards. You do not need to be an ML engineer to use it, but you do need
            to be able to place one plug-in in front of your model.
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
            Support comes from the SIFT AI team, under the name SIFT AI support only. No personal names are used. Tickets, help
            articles and your own run history open once you are signed in.
          </p>
          <Link to="/register">
            <Button className="w-full sm:w-auto">Create an account</Button>
          </Link>
          <Link to="/login" className="text-sm font-medium text-primary hover:underline">
            Or log in to an account you already have
          </Link>
        </div>
      </section>
    </div>
  );
}