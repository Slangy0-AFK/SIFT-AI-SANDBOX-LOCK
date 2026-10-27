import React from 'react';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EvalCard from '@/components/kit/EvalCard';
import LimitsNote from '@/components/kit/LimitsNote';
import useKitAccess from '@/hooks/useKitAccess';
import { EVALS } from '@/lib/kitContent';

export default function Evals() {
  const { paid, admin, loading } = useKitAccess();
  const unlocked = paid || admin;

  return (
    <div className="mx-auto max-w-5xl px-4 py-14">
      <p className="font-heading text-xs uppercase tracking-widest text-primary">Evals</p>
      <h1 className="mt-3 font-heading text-3xl font-bold tracking-tight sm:text-4xl">Checks you can run on an agent.</h1>
      <p className="mt-4 max-w-3xl text-muted-foreground">
        Five evals from the kit. Each one says what it tests, what the transcript showed, and where the result stops being
        useful. The scenarios are authored, so a reply being refused is one reply, not a certificate.
      </p>

      <LimitsNote className="mt-8">
        These are lab and repo test results, not general proof. Repo selftests and validators show that the checks behave as
        written. They do not score a model, and they do not establish that an agent is safe.
      </LimitsNote>

      {!loading && !unlocked && (
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-secondary/20 p-4">
          <Lock className="h-4 w-4 text-primary" />
          <p className="text-sm text-muted-foreground">
            You are seeing the summary of each eval. The full report for each one comes with the Full Kit.
          </p>
          <Link to="/pricing" className="ml-auto">
            <Button size="sm" variant="outline">
              See the Full Kit
            </Button>
          </Link>
        </div>
      )}

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        {EVALS.map((item) => (
          <EvalCard key={item.repo} item={item} paid={unlocked} />
        ))}
      </div>

      <div className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-6">
        <div>
          <p className="font-heading text-base font-semibold">Every eval can be run from here</p>
          <p className="mt-1 text-sm text-muted-foreground">
            The results described here come from those transcripts. Run the behaviour test yourself to produce a fresh one, or
            open the Governor Demo to watch the same checks decide on an action.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/behaviour-test">
            <Button size="sm" variant="outline">
              Run the behaviour test
            </Button>
          </Link>
          <Link to="/governor-demo">
            <Button size="sm" variant="outline">
              Open the Governor Demo
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}