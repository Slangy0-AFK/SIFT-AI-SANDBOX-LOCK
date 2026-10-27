import React from 'react';
import { Braces, FileCode2, Puzzle, Power } from 'lucide-react';
import ProductCard from '@/components/market/ProductCard';
import KillswitchTest from '@/components/market/KillswitchTest';
import HarnessTest from '@/components/market/HarnessTest';
import EvalBundleTest from '@/components/market/EvalBundleTest';
import LimitsNote from '@/components/kit/LimitsNote';

export default function Marketplace() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      <p className="font-heading text-xs uppercase tracking-widest text-primary">Marketplace</p>
      <h1 className="mt-3 font-heading text-3xl font-bold tracking-tight sm:text-4xl">Four products, one place to test them.</h1>
      <p className="mt-4 max-w-3xl text-muted-foreground">
        The killswitch stops an agent before code runs. Two harnesses sit around it, one for JavaScript and one for Python. The
        eval puzzle bundle is where you put a model through the awkward cases. Every product has a test button, and every result
        tells you what ran and what it ran on.
      </p>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <ProductCard
          icon={Power}
          name="Killswitch"
          tag="Stop switch"
          blurb="One switch over everything your agent can do, read before any code runs."
          points={['Fails closed: unreadable count as on', 'Stops the action, not the reply', 'Every decision lands in your log']}
          to="/governor-demo"
          cta="Open the full demo"
        >
          <KillswitchTest />
        </ProductCard>

        <ProductCard
          icon={Braces}
          name="Harness · JavaScript"
          tag="Harness"
          blurb="sift-guard.js wraps the model on the way in and every tool call on the way out."
          points={['Admission, tool gate, log, loop ceiling, output shield', 'Rules load from your license, never in the file', 'Node, Bun and the browser']}
          to="/plugin"
          cta="See the setup"
        >
          <HarnessTest />
        </ProductCard>

        <ProductCard
          icon={FileCode2}
          name="Harness · Python"
          tag="Harness"
          blurb="sift_guard.py, the same five gates for a Python service or a notebook."
          points={['Same rules, same verdicts as the JavaScript harness', 'No dependencies beyond the standard library', 'Works with any model client']}
          to="/plugin"
          cta="See the setup"
        >
          <HarnessTest />
        </ProductCard>
      </div>

      <div className="mt-6">
        <ProductCard
          icon={Puzzle}
          name="Eval puzzles · one bundle"
          tag="Bundle · 5 puzzles"
          blurb="Five authored scenarios that try to make a model misbehave, with a verdict from plain code rather than another model."
          points={['Direct override, pasted-injection, tool misuse, spend, loop', 'A model dropdown on every puzzle, so two models can be compared', 'Every result labelled with the puzzle and the model it ran on']}
          to="/evals"
          cta="Read what each puzzle tests"
        >
          <EvalBundleTest />
        </ProductCard>
      </div>

      <LimitsNote className="mt-10">
        Nothing here scores a model or certifies an agent. A pass is a check on one answer from one run, and the harness only holds
        where you place it.
      </LimitsNote>
    </div>
  );
}