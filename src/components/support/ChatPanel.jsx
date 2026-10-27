import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowRight, Loader2, MessageCircle, Send, Ticket } from 'lucide-react';
import SubmitTicketForm from '@/components/support/SubmitTicketForm';
import useScannerUnlocks from '@/hooks/useScannerUnlocks';

const QUICK = [
  'What does my verdict mean?',
  'Something is flagged and I am worried',
  'I paid and a tier is still locked',
  'Can SIFT AI scan my whole phone?'
];

const GREETING =
  'Hello, this is the SIFT AI team. Ask me about your own check, your devices or how the app works, and I will answer in plain words. I never ask for a password, a one-time code, a card number, a phone number or a serial number.';

// The chat bot itself, in one place: the signed-in chat entry under My Tools and
// the support page both show this same panel, so there is one chat and not two.
// Pro opens it, and a founding place opens it too because a place is Pro granted
// free rather than sold. Everyone else gets the ticket box, which is the one
// route to a person.
export default function ChatPanel({ page = 'Chat', heightClass = 'h-80', submitFormOnPage = false }) {
  const { isPro, isLoading } = useScannerUnlocks();
  const [messages, setMessages] = useState([{ role: 'assistant', content: GREETING }]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [showTicket, setShowTicket] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, busy, showTicket]);

  const ask = async (question) => {
    const text = String(question || '').trim();
    if (!text || busy) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setBusy(true);
    try {
      const { data } = await base44.functions.invoke('appSupport', { action: 'support_chat', message: text });
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data?.reply || data?.error || 'I could not answer that one. Open a ticket and a person will take it.'
        }
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            error?.response?.data?.reply ||
            'I could not reach the assistant just now. Open a support ticket below and a person will pick it up.'
        }
      ]);
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Checking what your account can use…
      </div>
    );
  }

  if (!isPro) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-secondary/40 p-4">
          <p className="text-sm font-medium text-foreground">Chat is part of Pro</p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            The first 50 accounts get Pro free as founding members, and a founding place opens this chat straight away. Otherwise, leave
            your message below and it goes to the SIFT AI team, with the reply coming by email.
          </p>
          <Link to="/plans" className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
            See what each tier includes <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {submitFormOnPage ? (
          <p className="text-sm text-muted-foreground">Use the ticket form on this page: a person reads every one.</p>
        ) : (
          <SubmitTicketForm page={page} compact />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className={`${heightClass} space-y-3 overflow-y-auto rounded-xl border border-border bg-secondary/20 p-3`}>
        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                message.role === 'user' ? 'bg-primary text-primary-foreground' : 'border border-border bg-card text-foreground'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> SIFT AI team is answering…
          </div>
        )}
        <div ref={endRef} />
      </div>

      {showTicket ? (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setShowTicket(false)}
            className="text-xs font-medium text-primary hover:underline"
          >
            Back to the chat
          </button>
          <SubmitTicketForm page={page} compact />
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5">
            {QUICK.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => ask(prompt)}
                className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                {prompt}
              </button>
            ))}
          </div>
          <div className="flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  ask(input);
                }
              }}
              rows={2}
              placeholder="Ask about your own check…"
              className="text-sm"
            />
            <Button size="lg" onClick={() => ask(input)} disabled={busy || !input.trim()} aria-label="Send">
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowTicket(true)} className="w-full gap-2">
            <Ticket className="h-3.5 w-3.5 text-primary" /> Open a support ticket instead
          </Button>
        </>
      )}

      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <MessageCircle className="h-3 w-3" /> Every reply comes from the SIFT AI team, never a person's name.
      </p>
    </div>
  );
}