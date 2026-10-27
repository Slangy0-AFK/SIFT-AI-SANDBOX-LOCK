import React from 'react';
import { Plug, ShieldCheck } from 'lucide-react';

// What the plug-in is, in the customer's own terms. The wording is deliberate:
// it is a guardrail layer around a model, never a fix for one.
export default function PluginIntro() {
  const points = [
    'One key, one model, one use. The key locks to the first model that activates it, and a second, different model is refused.',
    'It is a guardrail layer around your model. It does not patch, fix, rewrite or retrain your model, and it never touches model weights.',
    'It is your own code, in your own product. SIFT AI does not install it for you and cannot reach inside your setup.',
    'The file carries no detection rules: they arrive with your locked key, so a copy of it on its own does nothing.',
    'A use licence, not ownership: no sharing, no reselling, and no copying the key or the code to a second model.',
    'It never asks for a password, another service\u2019s API key, an IMEI, a serial number or payment details.'
  ];

  return (
    <div>
      <p className="flex items-center gap-2 font-heading text-xs uppercase tracking-widest text-primary">
        <Plug className="h-3.5 w-3.5" /> Download plug-in
      </p>
      <h1 className="mt-3 font-heading text-2xl font-bold tracking-tight sm:text-3xl">
        A guardrail layer around your model.
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        It stops bad instructions reaching your model, and bad outputs leaving it. You copy one file into your own product, set your
        key and the one model it is for, and call it before your model runs.
      </p>

      <ul className="mt-5 grid gap-2 sm:grid-cols-2">
        {points.map((line) => (
          <li
            key={line}
            className="flex items-start gap-2 rounded-xl border border-border bg-card p-3 text-xs leading-relaxed text-muted-foreground"
          >
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}