import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MessageCircle } from 'lucide-react';
import SubmitTicketForm from '@/components/support/SubmitTicketForm';
import SupportCenter from '@/components/support/SupportCenter';
import HelpCentreSearch from '@/components/support/HelpCentreSearch';
import SupportAutomationPanel from '@/components/support/SupportAutomationPanel';
import HelperAgent from '@/components/scanner/HelperAgent';

export default function Support() {
  // Other pages link here as /support#submit-ticket.
  useEffect(() => {
    if (window.location.hash === '#submit-ticket') {
      document.getElementById('submit-ticket')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-4xl space-y-8 px-4 py-12">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">Support</h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            Submit a ticket below and it goes straight to the SIFT AI team, with an automatic first reply on it right away. The chat
            assistant in the corner is part of Pro; on Free the same button opens a ticket box instead.
          </p>
        </div>

        <section id="submit-ticket" className="scroll-mt-24 rounded-2xl border border-primary/30 bg-card p-6 sm:p-8">
          <SubmitTicketForm page="Support (/support)" />
        </section>

        <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
          <MessageCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
          <p className="text-sm text-muted-foreground">
            Choose <span className="text-foreground">Talk to SIFT AI support</span> in the ticket form if you want your question to go
            straight to the SIFT AI team. Every ticket gets an automatic first reply, and a person on the team reads all of them.
          </p>
        </div>

        <SupportAutomationPanel />

        <HelpCentreSearch />

        <SupportCenter submitFormOnPage />

        <Link to="/scan" className="inline-flex items-center gap-2 font-mono text-xs text-primary hover:underline">
          Back to the Phone Scanner <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </main>

      <HelperAgent page="Support (/support)" />
    </div>
  );
}