import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, ChevronDown, ChevronUp, Lightbulb, MessageCircle, Scale, ThumbsDown, ThumbsUp, Ticket } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import TicketList from '@/components/support/TicketList';
import ChatPanel from '@/components/support/ChatPanel';
import useScannerUnlocks from '@/hooks/useScannerUnlocks';

const FAQS = [
  { q: 'What is SIFT AI?', a: 'SIFT AI is a personal checker for rogue or unauthorised AI on the devices you own. Its main tool is the Phone Scanner, which checks the app, permission screen, link, hash or message you bring to it.' },
  { q: 'Can it scan my whole phone?', a: 'No. It is a website, not an app on your phone, and a browser cannot look through a whole device by itself. It checks the single item you upload or paste, one at a time.' },
  { q: 'What do "nothing known against it", "Unknown" and "Flagged" mean?', a: 'Nothing known against it means no checker we use has anything bad on record for that item today, which is not a promise about tomorrow. Unknown means there is not enough information either way, so we say so instead of guessing. Flagged means something is on record, and you get the evidence and the next step.' },
  { q: 'What do I get with Pro?', a: 'Reusable scan profiles, re-checks of items that were flagged, PDF reports of your checks, and priority help. My Devices, your history and your allowlist and blocklist are free for everyone. The one-time Device Check is for when you want a person to look closely at a flagged item or a whole device, and it comes with a full written fix plan.' },
  { q: 'I paid and a tier is still locked', a: 'Submit a ticket with the payment topic using the form at the top of this page. A tier unlocks as soon as the payment is confirmed, so tell us the email you paid with and we will look it up.' },
];

export default function SupportCenter({ submitFormOnPage = false }) {
  // The chat bot is part of Pro. A founding place is Pro granted free, so it opens
  // the chat too. Everyone else is offered the ticket box, which is the one route
  // to a person.
  const { isPro } = useScannerUnlocks();
  const chatLocked = !isPro;
  const [user, setUser] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const submitFeedback = async () => {
    if (!feedback.trim() || !user) return;
    try {
      await base44.functions.invoke('appSupport', { action: 'feedback', message: feedback });
      setFeedbackSent(true);
      toast.success('Feedback submitted — thank you!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'The feedback did not go through. Please try again later.');
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Support centre</h2>

        {/* Chat bot */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <MessageCircle className="h-4 w-4 text-primary" /> {chatLocked ? 'Message the SIFT AI team' : 'Chat with SIFT AI'}
              </CardTitle>
              {!chatLocked && (
                <Button size="sm" variant="outline" onClick={() => setChatOpen((open) => !open)}>
                  {chatOpen ? 'Minimize' : 'Open chat'}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {chatLocked ? (
              <ChatPanel page="Support" submitFormOnPage={submitFormOnPage} />
            ) : (
              <AnimatePresence initial={false}>
                {chatOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <ChatPanel page="Support" />
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </CardContent>
        </Card>
      </div>

      {/* FAQ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Lightbulb className="h-4 w-4 text-primary" /> Frequently asked questions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {FAQS.map((faq, i) => (
            <div key={i} className="overflow-hidden rounded-xl border border-border">
              <button
                onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-secondary/50"
              >
                <span className="text-sm font-medium text-foreground">{faq.q}</span>
                {expandedFaq === i ? (
                  <ChevronUp className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                )}
              </button>
              <AnimatePresence initial={false}>
                {expandedFaq === i && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                    <p className="border-t border-border px-4 pb-3 pt-3 text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Feedback */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <ThumbsUp className="h-4 w-4 text-primary" /> Send feedback
          </CardTitle>
        </CardHeader>
        <CardContent>
          {feedbackSent ? (
            <div className="flex items-center justify-center gap-3 py-4">
              <CheckCircle className="h-5 w-5 text-emerald-400" />
              <span className="text-sm text-emerald-400">Thank you for your feedback.</span>
            </div>
          ) : (
            <div className="space-y-3">
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Share your experience, report an issue, or suggest a feature..."
                rows={4}
                className="w-full resize-none rounded-xl border border-border bg-secondary/40 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">Rate your experience</span>
                  <button className="text-muted-foreground transition-colors hover:text-primary" aria-label="Good">
                    <ThumbsUp className="h-4 w-4" />
                  </button>
                  <button className="text-muted-foreground transition-colors hover:text-destructive" aria-label="Bad">
                    <ThumbsDown className="h-4 w-4" />
                  </button>
                </div>
                <Button size="sm" onClick={submitFeedback} disabled={!feedback.trim()}>
                  Send
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tickets */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Ticket className="h-4 w-4 text-primary" /> Your support tickets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            New tickets are sent with the ticket form at the top of this page. Everything you have sent is listed here.
          </p>
          <TicketList user={user} />
        </CardContent>
      </Card>

      {/* Policies */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Scale className="h-4 w-4 text-primary" /> Policies
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">Review your compliance and regulatory agreements.</p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {[
              { title: 'Terms of Service', href: '/terms' },
              { title: 'Privacy Policy', href: '/privacy-policy' },
              { title: 'Refund Policy', href: '/refund-policy' },
            ].map((policy, i) => (
              <a
                key={i}
                href={policy.href}
                className="flex items-center justify-between rounded-xl border border-border p-3 transition-colors hover:border-primary/50 hover:bg-secondary/50"
              >
                <span className="text-sm font-medium">{policy.title}</span>
                <ChevronDown className="h-4 w-4 -rotate-90 text-muted-foreground" />
              </a>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}