import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle, Send, ThumbsUp, ThumbsDown, Lightbulb, ChevronDown, ChevronUp, Loader2, CheckCircle, AlertTriangle, ShieldCheck, Download, FileText, Ticket, BookOpen, Scale } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

const FAQS = [
  { q: 'What is SIFT AI?', a: 'SIFT AI is a personal checker for rogue or unauthorised AI on the devices you own. Its main tool is the Phone Scanner, which checks the app, permission screen, link, hash or message you bring to it.' },
  { q: 'Can it scan my whole phone?', a: 'No. It is a website, not an app on your phone, and a browser cannot look through a whole device by itself. It checks the single item you upload or paste, one at a time.' },
  { q: 'What do "nothing known against it", "Unknown" and "Flagged" mean?', a: 'Nothing known against it means no checker we use has anything bad on record for that item today, which is not a promise about tomorrow. Unknown means there is not enough information either way, so we say so instead of guessing. Flagged means something is on record, and you get the evidence and the next step.' },
  { q: 'What do I get with Pro?', a: 'Saved device profiles, re-checks of items that were flagged, PDF reports of your checks, and priority help. The one-time Device Check and Full Device Audit are for when you want a person to look closely at one item or a whole device.' },
  { q: 'I paid and a tier is still locked', a: 'Open a ticket with the Help / Ask button and choose the payment topic. A tier unlocks as soon as the payment is confirmed, so tell us the email you paid with and we will look it up.' },
];

export default function SupportCenter() {
  const [user, setUser] = useState(null);
  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I\'m the SIFT-AI AI assistant. Ask me anything about your security setup, threats, or how to use the platform.' }
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
    await base44.functions.invoke('appSupport', { action: 'feedback', message: feedback });
    setFeedbackSent(true);
    toast.success('Feedback submitted — thank you!');
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
                <MessageCircle className="w-4 h-4 text-primary" /> AI SUPPORT ASSISTANT
              </CardTitle>
              <Button size="sm" variant="outline" className="font-mono text-xs" onClick={() => setChatOpen(o => !o)}>
                {chatOpen ? 'Minimize' : 'Open Chat'}
              </Button>
            </div>
          </CardHeader>
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
                      placeholder="Ask about threats, features, setup..."
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

      {/* Ticket Mitigation Center */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-mono text-xs tracking-wider flex items-center gap-2">
            <Ticket className="w-4 h-4 text-primary" /> AUTOMATED TICKET MITIGATION
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TicketManager user={user} />
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
              { title: 'Data Processing Agreement', href: '#' },
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

function TicketManager({ user }) {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const { data: tickets, refetch } = useQuery({
    queryKey: ['support_tickets', user?.id],
    queryFn: () => base44.entities.SupportTicket.filter({}, '-created_date', 50),
    enabled: !!user,
    refetchInterval: 5000,
  });

  const submitTicket = async () => {
    if (!title.trim() || !desc.trim() || !user) return;
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('scannerHelper', {
        action: 'open_ticket',
        topic: 'other',
        message: `${title.trim()}\n\n${desc.trim()}`,
        page: 'Support centre',
      });
      if (data?.error) throw new Error(data.error);
      toast.success('Ticket submitted. The first reply is already on it, and a person reads every one.');
      setTitle('');
      setDesc('');
      refetch();
    } catch (e) {
      toast.error('Failed to submit ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3 bg-secondary/20 p-4 rounded-xl border border-border">
        <h4 className="font-mono text-xs font-semibold text-foreground">Submit a New Ticket</h4>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Issue Title"
          className="w-full bg-secondary border border-border rounded-lg px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <textarea
          value={desc}
          onChange={e => setDesc(e.target.value)}
          placeholder="Describe the issue..."
          rows={3}
          className="w-full bg-secondary border border-border rounded-lg px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
        />
        <Button size="sm" onClick={submitTicket} disabled={!title.trim() || !desc.trim() || loading || !user} className="font-mono text-xs">
          {loading ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Send className="w-3 h-3 mr-2" />}
          Submit for Auto-Resolution
        </Button>
      </div>

      <div className="space-y-3">
        <h4 className="font-mono text-xs font-semibold text-foreground">Your Tickets</h4>
        {!tickets?.length ? (
          <p className="font-mono text-xs text-muted-foreground">No tickets submitted yet.</p>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
            {tickets.map(t => (
              <div key={t.id} className="p-3 rounded-xl border border-border bg-card space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold">{t.title}</span>
                  <span className={`font-mono text-[10px] px-2 py-0.5 rounded-full uppercase ${t.status === 'resolved' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
                    {t.status}
                  </span>
                </div>
                <p className="font-mono text-xs text-muted-foreground line-clamp-2">{t.description}</p>
                {t.agent_response && (
                  <div className="mt-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                    <p className="font-mono text-[10px] text-primary font-semibold mb-1 uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Automated Resolution
                    </p>
                    <p className="font-mono text-xs text-foreground whitespace-pre-wrap">{t.agent_response}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}