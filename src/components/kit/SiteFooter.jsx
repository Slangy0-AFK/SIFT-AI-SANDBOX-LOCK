import React from 'react';
import { Link } from 'react-router-dom';
import { GRAY_SWAN_PROFILE, OWNER_SITE } from '@/lib/kitContent';

const PAGES = [
  ['/', 'Home'],
  ['/governor-demo', 'Governor Demo'],
  ['/evals', 'Evals'],
  ['/sizing-calculator', 'Sizing Calculator'],
  ['/scaler', 'Setting(T) Calculator'],
  ['/pricing', 'Pricing'],
  ['/about', 'About']
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-heading text-sm font-bold">Agent Control Kit</p>
          <p className="mt-2 text-sm text-muted-foreground">Open tools for checking an AI agent before it acts.</p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pages</p>
          <ul className="mt-3 space-y-2 text-sm">
            {PAGES.map(([to, label]) => (
              <li key={to}>
                <Link to={to} className="text-muted-foreground transition-colors hover:text-foreground">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Elsewhere</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <a
                href={GRAY_SWAN_PROFILE}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                Gray Swan Arena profile
              </a>
            </li>
            <li>
              <a
                href={OWNER_SITE}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                sift-ai.net
              </a>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Read this first</p>
          <p className="mt-3 text-sm text-muted-foreground">
            The results on this site are lab and repo test results. They are authored scenarios, not an independent audit and not
            general proof of safety.
          </p>
        </div>
      </div>

      <div className="border-t border-border">
        <p className="mx-auto max-w-6xl px-4 py-6 text-xs text-muted-foreground">Agent Control Kit · 2026</p>
      </div>
    </footer>
  );
}