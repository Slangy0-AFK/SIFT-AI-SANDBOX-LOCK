import React from 'react';
import { ArrowRight } from 'lucide-react';

// How a buyer applies the key in their own model or test setup. The steps and
// the endpoint both come from the server, so this page, the confirmation email
// and the downloaded file always say the same thing.
export default function LicenseHowTo({ instructions = [], endpoint }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="font-heading text-sm font-semibold">How to apply your key</p>
      <ol className="mt-4 space-y-3">
        {instructions.map((line, index) => (
          <li key={line} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
            <span className="font-mono text-xs text-primary">{index + 1}</span>
            <span>{line}</span>
          </li>
        ))}
      </ol>

      {endpoint && (
        <div className="mt-5 rounded-lg border border-border bg-background/60 p-4">
          <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            What your setup sends <ArrowRight className="h-3 w-3" />
          </p>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed text-foreground">
{`POST ${endpoint}
{"action": "validate", "key": "your key here",
 "model": "the one model this key is for",
 "deployment_id": "the deployment it runs on"}`}
          </pre>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            The first activation is the lock: the key works with that one model from then on and is never moved to another. A second,
            different model is refused with &ldquo;This key is already locked to another model.&rdquo; A different model needs a new key
            from a new purchase.
          </p>
        </div>
      )}
    </div>
  );
}