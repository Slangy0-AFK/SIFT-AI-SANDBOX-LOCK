import React from 'react';
import { MessageCircle } from 'lucide-react';
import ChatPanel from '@/components/support/ChatPanel';

// The chat bot's own page, reached from its entry in the tools sidebar.
export default function Chat() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/40 px-3 py-1">
          <MessageCircle className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium text-muted-foreground">SIFT AI team</span>
        </div>
        <h1 className="mt-3 font-heading text-2xl font-bold tracking-tight sm:text-3xl">Chat with SIFT AI</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Ask about the check you just ran, what a verdict means, or what to do next. Answers come from your own result and the help
          articles, in plain words, and anything I cannot answer becomes a support ticket a person reads.
        </p>
      </header>

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        <ChatPanel page="Chat" heightClass="h-[24rem]" />
      </section>
    </div>
  );
}