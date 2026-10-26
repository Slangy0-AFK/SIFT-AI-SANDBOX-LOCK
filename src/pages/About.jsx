import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Github, ShieldCheck } from 'lucide-react';
import LimitsNote from '@/components/kit/LimitsNote';
import { GITHUB_PROFILE, GRAY_SWAN_PROFILE, OWNER_SITE, REPOS, repoUrl } from '@/lib/kitContent';

const NOT_HERE = [
  'No resume and no private contact details.',
  'No private prompt library.',
  'No Gray Swan private-network challenge prompts.',
  'Nothing that is not already public in the repos.'
];

export default function About() {
  const governor = REPOS.filter((repo) => repo.part === 'Governor');
  const evals = REPOS.filter((repo) => repo.part === 'Eval');
  const calculators = REPOS.filter((repo) => repo.part === 'Calculator');

  return (
    <div className="mx-auto max-w-4xl px-4 py-14">
      <p className="font-heading text-xs uppercase tracking-widest text-primary">About</p>
      <h1 className="mt-3 font-heading text-3xl font-bold tracking-tight sm:text-4xl">Open tools for checking an AI agent before it acts.</h1>
      <p className="mt-4 text-muted-foreground">
        The work behind this kit breaks AI agents on purpose, then writes down what held and what did not. The Agent Control Kit is
        the small, open part
        of that work: gates that run in code, evals you can rerun, and two calculators for sizing a job and setting a floor.
      </p>
      <p className="mt-4 text-muted-foreground">
        The idea is simple. Do not hope the agent behaves. Decide, before it acts, whether this action is allowed, and keep a record
        of the decision that a person can read afterwards.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <a href={GITHUB_PROFILE} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:border-primary/40">
          <Github className="h-4 w-4" />
          GitHub
        </a>
        <a href={GRAY_SWAN_PROFILE} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:border-primary/40">
          Gray Swan Arena profile
          <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
        <a href={OWNER_SITE} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:border-primary/40">
          sift-ai.net
          <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      </div>

      <section className="mt-14">
        <h2 className="font-heading text-xl font-bold tracking-tight">Governor</h2>
        <p className="mt-2 text-sm text-muted-foreground">The gates themselves, written as code rather than as instructions to a model.</p>
        <ul className="mt-4 space-y-3">
          {governor.map((repo) => (
            <li key={repo.name} className="rounded-xl border border-border bg-card p-4">
              <a href={repoUrl(repo.name)} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:text-primary">
                {repo.name}
              </a>
              <p className="mt-1 text-sm text-muted-foreground">{repo.summary}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-heading text-xl font-bold tracking-tight">Evals</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Checks that can be run again by anyone. The results and their limits are both written down.
        </p>
        <ul className="mt-4 space-y-3">
          {evals.map((repo) => (
            <li key={repo.name} className="rounded-xl border border-border bg-card p-4">
              <a href={repoUrl(repo.name)} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:text-primary">
                {repo.name}
              </a>
              <p className="mt-1 text-sm text-muted-foreground">{repo.summary}</p>
            </li>
          ))}
        </ul>
        <Link to="/evals" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
          Read what each eval found
        </Link>
      </section>

      <section className="mt-10">
        <h2 className="font-heading text-xl font-bold tracking-tight">Calculators</h2>
        <ul className="mt-4 space-y-3">
          {calculators.map((repo) => (
            <li key={repo.name} className="rounded-xl border border-border bg-card p-4">
              <a href={repoUrl(repo.name)} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:text-primary">
                {repo.name}
              </a>
              <p className="mt-1 text-sm text-muted-foreground">{repo.summary}</p>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-4 text-sm font-medium">
          <Link to="/sizing-calculator" className="text-primary hover:underline">
            Sizing calculator
          </Link>
          <Link to="/scaler" className="text-primary hover:underline">
            The floor dial, Setting(T)
          </Link>
        </div>
      </section>

      <section className="mt-12 rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <h2 className="font-heading text-lg font-bold">What this is not</h2>
        </div>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>It is not a claim that the kit makes a model smarter, more truthful, or safe in general.</li>
          <li>It is not an independent audit of anyone's system, including the kit's own runs.</li>
          <li>The results are lab and repo test results from authored scenarios, and they are labelled that way everywhere here.</li>
        </ul>
      </section>

      <section className="mt-8 rounded-xl border border-border bg-card p-6">
        <h2 className="font-heading text-lg font-bold">Not published here</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          {NOT_HERE.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-muted-foreground">
          To get in touch about an audit of your own agent, use the booking form on the{' '}
          <Link to="/pricing" className="text-primary hover:underline">
            pricing page
          </Link>
          . Your request stays private to your account.
        </p>
      </section>

      <LimitsNote className="mt-8">
        Everything published on this site is already public in the repos above. If you want to check a claim, open the repo and run
        the test yourself.
      </LimitsNote>
    </div>
  );
}