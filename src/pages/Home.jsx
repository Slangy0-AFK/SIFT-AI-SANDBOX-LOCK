import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calculator, FileWarning, Gauge, Github, ListChecks, PlayCircle, Repeat, ShieldQuestion, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LimitsNote from '@/components/kit/LimitsNote';
import { GITHUB_PROFILE, REPOS, repoUrl } from '@/lib/kitContent';

const GATES = ['Admission before spend', 'Tool gate', 'Spend cap', 'Kill switch', 'Loop gate', 'Audit log'];

const HELPS = [
  { icon: Repeat, title: 'Agents that run wild', text: 'They carry on after the job is done, taking actions nobody asked for.' },
  { icon: Gauge, title: 'Agents that loop forever', text: 'The same action over and over, burning time and money while you sleep.' },
  { icon: Wallet, title: 'Agents that burn budget', text: 'A runaway job that keeps charging you because nothing capped it.' },
  { icon: FileWarning, title: 'Agents that accept dangerous changes', text: 'A write, a deploy or a refund that nobody with the authority actually approved.' },
  { icon: ShieldQuestion, title: 'Agents that trust the wrong file', text: 'Instructions that came from a document, a web page or an email instead of from you.' }
];

const PARTS = [
  { icon: PlayCircle, title: 'Governor', text: 'Gates that sit in front of the agent and decide before the action runs.', to: '/governor-demo', cta: 'Try the demo' },
  { icon: ListChecks, title: 'Evals', text: 'Checks you can run on an agent, each with the result and the limits written down.', to: '/evals', cta: 'See the evals' },
  { icon: Calculator, title: 'Calculators', text: 'Sizing for long jobs, and a floor dial for how far an agent may wander.', to: '/sizing-calculator', cta: 'Open the calculators' }
];

export default function Home() {
  return (
    <div>
      <section className="border-b border-border bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center lg:py-28">
          <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-5xl lg:text-6xl">Check the agent before it acts.</h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Admission, tool gate, spend cap, kill switch, and audit, in one small, open kit.
          </p>

          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/governor-demo">
              <Button size="lg" className="w-full gap-2 sm:w-auto">
                <PlayCircle className="h-4 w-4" />
                Try the Governor Demo
              </Button>
            </Link>
            <Link to="/evals">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                See the Evals
              </Button>
            </Link>
            <Link to="/pricing">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Get the Full Kit
              </Button>
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {GATES.map((gate) => (
              <span key={gate} className="rounded-md border border-border bg-secondary/30 px-2.5 py-1 text-xs text-muted-foreground">
                {gate}
              </span>
            ))}
          </div>

          <p className="mt-6 text-sm text-muted-foreground">
            Eight open-source repos for people who run AI agents that can touch real systems. The demo works right here, with no
            sign-up.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">What it helps with</h2>
        <p className="mt-2 text-muted-foreground">
          Five ways an agent goes wrong in production, and the gate that catches each one.
        </p>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {HELPS.map((item) => (
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

      <section className="border-t border-border bg-secondary/5">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">Three parts</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {PARTS.map((part) => (
              <div key={part.title} className="flex flex-col rounded-2xl border border-border bg-card p-6">
                <part.icon className="h-5 w-5 text-primary" />
                <h3 className="mt-4 font-semibold">{part.title}</h3>
                <p className="mt-2 flex-1 text-sm text-muted-foreground">{part.text}</p>
                <Link to={part.to} className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                  {part.cta}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">The eight repos</h2>
              <p className="mt-2 text-muted-foreground">All of it is open. Read the code, run the tests yourself.</p>
            </div>
            <a
              href={GITHUB_PROFILE}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              <Github className="h-4 w-4" />
              github.com/Slangy0-AFK
            </a>
          </div>

          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {REPOS.map((repo) => (
              <li key={repo.name} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2">
                  <span className="rounded border border-border bg-secondary/40 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {repo.part}
                  </span>
                  <a
                    href={repoUrl(repo.name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-sm font-medium hover:text-primary"
                  >
                    {repo.name}
                  </a>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{repo.summary}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-t border-border bg-primary/5">
        <div className="mx-auto max-w-4xl px-4 py-16">
          <LimitsNote>
            Everything on this site is a lab or repo test result from authored scenarios. It is not an independent audit, it is not
            general proof that an agent is safe, and none of it claims to make a model smarter or more truthful.
          </LimitsNote>
        </div>
      </section>
    </div>
  );
}