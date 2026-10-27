import React from 'react';
import { Link } from 'react-router-dom';

const PAGES = [
  ['/', 'Home'],
  ['/scan', 'Device Scanner'],
  ['/devices', 'My Devices'],
  ['/allow-block', 'Allowlist & Blocklist'],
  ['/history', 'Your checks'],
  ['/plans', 'Plans'],
  ['/about', 'About'],
  ['/support', 'Support']
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <p className="font-heading text-sm font-bold">SIFT AI</p>
          <p className="mt-2 text-sm text-muted-foreground">
            A personal checker for rogue and unauthorised AI on the devices you own. The Device Scanner is its main tool.
          </p>
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
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Read this first</p>
          <p className="mt-3 text-sm text-muted-foreground">
            SIFT AI runs in your browser. It checks only the item you upload or paste, never a whole device by itself, and it never
            says a device is clean or safe. A scan is a check, not a certificate.
          </p>
        </div>
      </div>

      <div className="border-t border-border">
        <p className="mx-auto max-w-6xl px-4 py-6 text-xs text-muted-foreground">SIFT AI · 2026</p>
      </div>
    </footer>
  );
}