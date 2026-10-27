import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

// The two pages anyone can read without an account.
const PUBLIC_PAGES = [
  ['/', 'Home'],
  ['/about', 'About']
];

// Everything else belongs to an account, so it is only listed once you have one.
const APP_PAGES = [
  ['/governor-demo', 'The killswitch'],
  ['/plugin', 'The harness'],
  ['/evals', 'Eval puzzles'],
  ['/plans', 'Plans'],
  ['/support', 'Support']
];

export default function SiteFooter() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    base44.auth
      .isAuthenticated()
      .then((yes) => setSignedIn(Boolean(yes)))
      .catch(() => setSignedIn(false));
  }, []);

  return (
    <footer className="border-t border-border bg-card/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <p className="font-heading text-sm font-bold">SIFT AI</p>
          <p className="mt-2 text-sm text-muted-foreground">
            A killswitch, a harness and a set of eval puzzles for the agents you run. Agent control, not a device scanner.
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pages</p>
          <ul className="mt-3 space-y-2 text-sm">
            {PUBLIC_PAGES.map(([to, label]) => (
              <li key={to}>
                <Link to={to} className="text-muted-foreground transition-colors hover:text-foreground">
                  {label}
                </Link>
              </li>
            ))}
            {signedIn &&
              APP_PAGES.map(([to, label]) => (
                <li key={to}>
                  <Link to={to} className="text-muted-foreground transition-colors hover:text-foreground">
                    {label}
                  </Link>
                </li>
              ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Read this first</p>
          <p className="mt-3 text-sm text-muted-foreground">
            A gate that passes a puzzle is a check, not a certificate, and nothing here promises how an agent will behave. The rest
            of the site opens once you create an account.
          </p>
        </div>
      </div>

      <div className="border-t border-border">
        <p className="mx-auto max-w-6xl px-4 py-6 text-xs text-muted-foreground">SIFT AI · 2026</p>
      </div>
    </footer>
  );
}