import React from 'react';
import { Power, Workflow, ScrollText } from 'lucide-react';

// The three promises that hold on the plug-in's own side: it stops, it logs, and
// the log is what proves both.
const GUARANTEES = [
  {
    icon: Power,
    title: 'Kill switch, read first',
    text: 'It is read on every message, before anything else happens. On, or unreadable, the agent stops. It stops before code runs, not after it.'
  },
  {
    icon: Workflow,
    title: 'The full harness, not part of it',
    text: 'All five travel in the plug-in code: an admission check, a tool gate before execution, a log before the action, a loop ceiling, and an output shield on the way back.'
  },
  {
    icon: ScrollText,
    title: 'Auditable agents',
    text: 'Every action gets a log entry written before it happens, carrying the pattern category only and never your message text. If the log cannot be written, the action does not happen. That is what makes it auditable: what was allowed, what was refused, and why it stopped.'
  }
];

export default function AgentGuarantees() {
  return (
    <section className="border-y border-border bg-primary/5">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
          Around your own model: built to stop, log, and prove it
        </h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          The plug-in sits between your model and the world. Three things hold on every message, whether or not anything looks wrong.
        </p>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {GUARANTEES.map((item) => (
            <div key={item.title} className="rounded-2xl border border-border bg-card p-6">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
                <item.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}