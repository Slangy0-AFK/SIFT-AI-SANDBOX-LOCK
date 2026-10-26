import React, { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, MessageCircle, Send, Ticket, X } from 'lucide-react';
import HelperTicketForm from './HelperTicketForm';

const QUICK = [
  'What does my verdict mean?',
  'Should I uninstall it?',
  'I paid and nothing unlocked',
  'Something is flagged and I am worried'
];

// A small in-app helper. It answers from the user's own current result and the
// app's help articles only. It never asks for passwords, codes or device
// identifiers, and anything it cannot answer becomes a support ticket.
export default function HelperAgent({ page, context = '' }) {
  const [open, setOpen] = useState(false);
  const [showTicket, setShowTicket] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        'Hello. I can explain the result you are looking at and what to do next, in plain words. I will never ask for a password, a code, a card number, a phone number or a serial number.'
    }
  ]);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open, showTicket]);

  const ask = async (question) => {
    const text = String(question || '').trim();
    if (!text || busy) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setBusy(true);
    try {
      const { data } = await base44.functions.invoke('scannerHelper', {
        action: 'ask',
        question: text,
        page,
        context
      });
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data?.reply || data?.error || 'I could not answer that one. Open a ticket and a person will take it.' }
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            err.response?.data?.error ||
            'I could not reach the helper just now. Use "Open a ticket" below and a person will pick it up.'
        }
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full border border-primary/40 bg-primary px-4 py-3 text-xs font-semibold text-primary-foreground shadow-lg"
        >
          <MessageCircle className="h-4 w-4" />
          Help / Ask
        </button>
      )}

      {open && (
        <div className="fixed bottom-5 right-5 z-40 flex h-[520px] w-[min(92vw,380px)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <p className="font-mono text-xs font-bold tracking-wide">SIFT AI HELPER</p>
              <p className="text-[11px] text-muted-foreground">Plain answers about your own result</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-secondary/20 p-3">
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-2 text-xs leading-relaxed ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border bg-card text-foreground'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> thinking…
              </div>
            )}
            <div ref={endRef} />
          </div>

          {showTicket ? (
            <HelperTicketForm page={page} context={context} onClose={() => setShowTicket(false)} />
          ) : (
            <div className="border-t border-border p-3">
              <div className="mb-2 flex flex-wrap gap-1.5">
                {QUICK.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => ask(prompt)}
                    className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
              <div className="flex items-end gap-2">
                <Textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  rows={2}
                  placeholder="Ask about your result…"
                  className="text-xs"
                />
                <Button size="sm" onClick={() => ask(input)} disabled={busy} className="h-11">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTicket(true)}
                className="mt-2 w-full gap-2 font-mono text-xs"
              >
                <Ticket className="h-3.5 w-3.5 text-primary" />
                Submit a support ticket
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );
}