import React from 'react';
import { CheckCircle2 } from 'lucide-react';

const CHECKS = [
  {
    title: 'A normal question passes',
    text: 'It goes through to your model as usual, and the audit log gets one entry with the category none.'
  },
  {
    title: 'A direct override is refused',
    text: 'Something like "ignore all previous instructions": you get one short refusal, your model is never called, and the log entry carries the category only, never the message.'
  },
  {
    title: 'Content pasted in from elsewhere is refused',
    text: 'An instruction hidden inside a document, a quote or a pasted block is refused as pasted_instruction, and the log says nothing more than that.'
  },
  {
    title: 'The switches and the ceiling',
    text: 'Turn SIFT_KILL_SWITCH on and check that nothing runs and the log records the stop. Let a loop run past the step ceiling and check that it stops, logs why, and does not restart itself.'
  }
];

export default function PluginChecklist() {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
      <h2 className="font-heading text-lg font-semibold">Test checklist</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Run these in a test environment, and read the audit log after each one. Every check should leave exactly one entry, and no
        entry should ever contain a message.
      </p>

      <ul className="mt-4 space-y-3">
        {CHECKS.map((check) => (
          <li key={check.title} className="flex items-start gap-3 rounded-xl border border-border bg-background/60 p-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">{check.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{check.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}