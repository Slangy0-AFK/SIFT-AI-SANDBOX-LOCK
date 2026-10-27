import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle, Send, ThumbsUp, ThumbsDown, Lightbulb, ChevronDown, ChevronUp, Loader2, CheckCircle, Ticket, Scale } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import TicketList from '@/components/support/TicketList';
import SubmitTicketForm from '@/components/support/SubmitTicketForm';
import useScannerUnlocks from '@/hooks/useScannerUnlocks';

const FAQS = [
  { q: 'What is SIFT AI?', a: 'SIFT AI is a personal checker for rogue or unauthorised AI on the devices you own. Its main tool is the Phone Scanner, which checks the app, permission screen, link, hash or message you bring to it.' },
  { q: 'Can it scan my whole phone?', a: 'No. It is a website, not an app on your phone, and a browser cannot look through a whole device by itself. It checks the single item you upload or paste, one at a time.' },
  { q: 'What do "nothing known against it", "Unknown" and "Flagged" mean?', a: 'Nothing known against it means no checker we use has anything bad on record for that item today, which is not a promise about tomorrow. Unknown means there is not enough information either way, so we say so instead of guessing. Flagged means something is on record, and you get the evidence and the next step.' },
  { q: 'What do I get with Pro?', a: 'Reusable scan profiles, re-checks of items that were flagged, PDF reports of your checks, and priority help. My Devices, your history and your allowlist and blocklist are free for everyone. The one-time Device Check is for when you want a person to look closely at a flagged item or a whole device, and it comes with a full written fix plan.' },
  { q: 'I paid and a tier is still locked', a: 'Submit a ticket with the payment topic using the form at the top of this page. A tier unlocks as soon as the payment is confirmed, so tell us the email you paid with and we will look it up.' },
];

export default function SupportCenter({ submitFormOnPage = false }) {
  // The assistant is part of Pro. Everyone else is offered the ticket box in the
  // same card, or a pointer to the form already on this page.
  const { isPro } = useScannerUnlocks();
  const chatLocked = !isPro;
  const [user, setUser] = useState(null);
  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I\'m the SIFT AI assistant. Ask me anything about your checks, your devices, or how to use the platform.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading || !user) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);
    const { data } = await base44.functions.invoke('appSupport', { action: 'support_chat', message: userMsg });
    const reply = data.reply;
    setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    setLoading(false);
  };

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
    <div className="space-y-6">
      <div>
        <h2 className="font-mono text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-4">Support Center</h2>

        {/* AI Chatbot */}
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="font-mono text-xs tracking-wider flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-primary" /> {chatLocked ? 'MESSAGE THE SIFT AI TEAM' : 'AI SUPPORT ASSISTANT'}
              </CardTitle>
              {!chatLocked && (
                <Button size="sm" variant="outline" className="font-mono text-xs" onClick={() => setChatOpen(o => !o)}>
                  {chatOpen ? 'Minimize' : 'Open Chat'}
                </Button>
              )}
            </div>
          </CardHeader>
          {chatLocked && (
            <CardContent className="pt-0">
              {submitFormOnPage ? (
                <p className="font-mono text-xs leading-relaxed text-muted-foreground">
                  The AI assistant is part of the Pro subscription. The Submit a Support Ticket form above goes straight to the SIFT AI team,
                  and a person reads every one.
                </p>
              ) : (
                <>
                  <p className="mb-3 font-mono text-xs leading-relaxed text-muted-foreground">
                    The AI assistant is part of the Pro subscription. Leave your message here and it goes straight to the SIFT AI team, with
                    the reply coming by email.
                  </p>
                  <SubmitTicketForm page="Support" compact />
                </>
              )}
            </CardContent>
          )}
          <AnimatePresence>
            {chatOpen && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                <CardContent className="pt-0">
                  <div className="h-64 overflow-y-auto bg-secondary/30 rounded-xl p-3 space-y-3 mb-3">
                    {messages.map((m, i) => (
                      <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-xl px-3 py-2 font-mono text-[11px] leading-relaxed ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-foreground'}`}>
                          {m.content}
                        </div>
                      </div>
                    ))}
                    {loading && (
                      <div className="flex justify-start">
                        <div className="bg-card border border-border rounded-xl px-3 py-2 flex items-center gap-2">
                          <Loader2 className="w-3 h-3 text-primary animate-spin" />
                          <span className="font-mono text-xs text-muted-foreground">Thinking...</span>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && sendMessage()}
                      placeholder="Ask about your checks, setup or a payment..."
                      className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 font-mono text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <Button size="icon" onClick={sendMessage} disabled={loading || !input.trim()}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </div>

      {/* FAQ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-mono text-xs tracking-wider flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-primary" /> FREQUENTLY ASKED QUESTIONS
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {FAQS.map((faq, i) => (
            <div key={i} className="border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors text-left"
              >
                <span className="font-mono text-[11px] font-semibold text-foreground">{faq.q}</span>
                {expandedFaq === i ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
              </button>
              <AnimatePresence>
                {expandedFaq === i && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="px-4 pb-3 font-mono text-xs text-muted-foreground leading-relaxed border-t border-border pt-3">{faq.a}</div>
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
          <CardTitle className="font-mono text-xs tracking-wider flex items-center gap-2">
            <ThumbsUp className="w-4 h-4 text-primary" /> SEND FEEDBACK
          </CardTitle>
        </CardHeader>
        <CardContent>
          {feedbackSent ? (
            <div className="flex items-center gap-3 py-4 justify-center">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="font-mono text-sm text-green-400">Thank you for your feedback!</span>
            </div>
          ) : (
            <div className="space-y-3">
              <textarea
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                placeholder="Share your experience, report an issue, or suggest a feature..."
                rows={4}
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 font-mono text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-muted-foreground">Rate your experience:</span>
                  <button className="hover:text-primary transition-colors text-muted-foreground"><ThumbsUp className="w-4 h-4" /></button>
                  <button className="hover:text-destructive transition-colors text-muted-foreground"><ThumbsDown className="w-4 h-4" /></button>
                </div>
                <Button size="sm" onClick={submitFeedback} disabled={!feedback.trim()} className="font-mono text-xs">
                  Submit Feedback
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ticket list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-mono text-xs tracking-wider flex items-center gap-2">
            <Ticket className="w-4 h-4 text-primary" /> YOUR SUPPORT TICKETS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 font-mono text-xs text-muted-foreground">
            New tickets are sent with the Submit a Support Ticket form at the top of this page. Everything you have sent is listed here.
          </p>
          <TicketList user={user} />
        </CardContent>
      </Card>

      {/* Policy Center */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-mono text-xs tracking-wider flex items-center gap-2">
            <Scale className="w-4 h-4 text-primary" /> POLICY CENTER
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-mono text-xs text-muted-foreground mb-4">Review your compliance and regulatory agreements.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { title: 'Terms of Service', href: '/terms' },
              { title: 'Privacy Policy', href: '/privacy-policy' },
              { title: 'Refund Policy', href: '/refund-policy' },
            ].map((policy, i) => (
              <a key={i} href={policy.href} className="flex items-center justify-between p-3 rounded-xl border border-border hover:border-primary/50 hover:bg-secondary/50 transition-colors">
                <span className="font-mono text-xs font-medium">{policy.title}</span>
                <ChevronDown className="w-4 h-4 text-muted-foreground -rotate-90" />
              </a>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}