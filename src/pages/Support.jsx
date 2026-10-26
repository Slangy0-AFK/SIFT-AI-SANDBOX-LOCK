import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MessageCircle } from 'lucide-react';
import SupportCenter from '@/components/support/SupportCenter';
import HelperAgent from '@/components/scanner/HelperAgent';

export default function Support() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-4xl space-y-8 px-4 py-12">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">Support</h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            The Help / Ask button in the corner answers plain questions about your own result and can open a ticket in one click,
            signed in or not. Below that is the fuller support centre and the questions people ask most.
          </p>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
          <MessageCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
          <p className="text-sm text-muted-foreground">
            Choose <span className="text-foreground">Talk to Doug</span> in the ticket form if you want your question to go straight
            to the person who runs SIFT AI. Every ticket gets an automatic first reply, and a human reads all of them.
          </p>
        </div>

        <SupportCenter />

        <Link to="/scan" className="inline-flex items-center gap-2 font-mono text-xs text-primary hover:underline">
          Back to the Phone Scanner <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </main>

      <HelperAgent page="Support (/support)" />
    </div>
  );
}