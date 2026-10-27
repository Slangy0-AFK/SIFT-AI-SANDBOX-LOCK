import React from 'react';
import { AlertTriangle } from 'lucide-react';

const STEPS = [
  'Copy the file into your product, next to the code that calls your model.',
  'Set SIFT_LICENSE_KEY to your SIFT AI license key. Your own copy of it is on your license page.',
  'Call the guard before your model sees a message, and around every tool your model asks for. Both files show this at the top.',
  'Tell it which tools your product is allowed to run, and with which arguments, so the tool gate has something to check against.',
  'Test it in a test environment first, with the checklist below, before it goes anywhere near real traffic.'
];

// Plain-language setup. The note about who does the installing is the point:
// nothing here is installed for the customer.
export default function PluginSetup() {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
      <h2 className="font-heading text-lg font-semibold">Setting it up</h2>
      <ol className="mt-4 space-y-3">
        {STEPS.map((line, index) => (
          <li key={line} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
            <span className="font-mono text-xs text-primary">{index + 1}</span>
            <span>{line}</span>
          </li>
        ))}
      </ol>

      <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4">
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
        <p className="text-xs leading-relaxed text-amber-400">
          Base44 does not install this into your product for you — you or your developer copy it in. It works with an internet
          connection to validate the key.
        </p>
      </div>
    </section>
  );
}