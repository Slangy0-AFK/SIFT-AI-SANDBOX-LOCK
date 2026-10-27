import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { PLUGIN_TESTS } from '@/lib/pluginContent';

export default function PluginChecklist() {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
      <h2 className="font-heading text-lg font-semibold">Test checklist</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Run these in a test environment, and read the audit log after each one. Every check should leave exactly one entry, and no
        entry should ever contain a message.
      </p>

      <ul className="mt-4 space-y-3">
        {PLUGIN_TESTS.map((check) => (
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