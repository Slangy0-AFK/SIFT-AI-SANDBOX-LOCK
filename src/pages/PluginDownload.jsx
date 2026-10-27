import React from 'react';
import { Link } from 'react-router-dom';
import { Key } from 'lucide-react';
import PluginIntro from '@/components/plugin/PluginIntro';
import PluginDownloads from '@/components/plugin/PluginDownloads';
import PluginSetup from '@/components/plugin/PluginSetup';
import PluginChecklist from '@/components/plugin/PluginChecklist';
import PluginKillSwitch from '@/components/plugin/PluginKillSwitch';

// The plug-in: the integration code a buyer copies into their own product, how
// to set it up, and how to test it before it goes near real traffic.
export default function PluginDownload() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-4xl space-y-8 px-4 py-12">
        <PluginIntro />
        <PluginDownloads />
        <PluginSetup />
        <PluginChecklist />

        <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          <p className="flex items-center gap-2 font-heading text-sm font-semibold">
            <Key className="h-4 w-4 text-primary" /> Your key
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            The key that goes into SIFT_LICENSE_KEY comes with a paid plan, and the first 50 accounts get one free with a founding
            place. It is applied to your account automatically, and your own copy of it is on your license page.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/license">
              <span className="font-mono text-xs font-medium text-primary underline underline-offset-4">Open my license</span>
            </Link>
            <Link to="/plans">
              <span className="ml-4 font-mono text-xs font-medium text-primary underline underline-offset-4">See plans</span>
            </Link>
          </div>
        </section>

        <PluginKillSwitch />
      </main>
    </div>
  );
}