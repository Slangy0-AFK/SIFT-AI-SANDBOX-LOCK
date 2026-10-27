import React from 'react';

// What a key unlocks and the terms that come with it. Shown on the plans page
// before anything is bought, and again on the buyer's own license page.
export default function LicenseTerms({ unlocks, terms = [], heading = 'License terms' }) {
  if (!unlocks && terms.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      {unlocks && (
        <>
          <p className="font-heading text-sm font-semibold">What the key unlocks</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{unlocks}</p>
        </>
      )}

      {terms.length > 0 && (
        <>
          <p className="mt-5 font-heading text-sm font-semibold">{heading}</p>
          <ul className="mt-3 space-y-2">
            {terms.map((line) => (
              <li key={line} className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
                <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}