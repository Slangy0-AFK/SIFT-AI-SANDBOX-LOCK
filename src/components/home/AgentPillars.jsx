import React from 'react';
import { Power, Puzzle, Workflow } from 'lucide-react';

// What SIFT AI is about, in the order an agent meets it: the switch, the harness
// around the model, and the puzzles that show how it behaves.
const PILLARS = [
  {
    icon: Power,
    title: 'The killswitch',
    text: 'One switch over every agent you run. While it is on, or while it cannot be read, the answer is stopped: before your model is called and before any code runs, not after.'
  },
  {
    icon: Workflow,
    title: 'The harness',
    text: 'Five gates wrapped around your model: an admission check on the way in, a tool gate before any tool executes, a log written before the action, a loop ceiling, and an output shield on the way back.'
  },
  {
    icon: Puzzle,
    title: 'Eval puzzles',
    text: 'Authored puzzles that test behaviour instead of vibes. Does it take an instruction out of a document, reach for a tool it should not, spend money it should not, or loop on itself? Each puzzle says what it tests and where the result stops.'
  }
];

export default function AgentPillars() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">Three things, and nothing else</h2>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        SIFT AI is not a scanner bolted onto a security brand. It is a switch, a harness and a set of puzzles for the agents you
        already run.
      </p>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {PILLARS.map((pillar) => (
          <div key={pillar.title} className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
              <pillar.icon className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold">{pillar.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{pillar.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}