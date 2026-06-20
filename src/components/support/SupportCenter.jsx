import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle, Send, ThumbsUp, ThumbsDown, Lightbulb, ChevronDown, ChevronUp, Loader2, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const FAQS = [
  { q: 'How does the Paradox Lock protect my device?', a: 'The Paradox Lock presents unsolvable logical challenges to AI bots and autonomous agents. Bots fail due to deterministic logic limitations, while humans pass naturally — effectively locking out automated attackers.' },
  { q: 'What is QRNG?', a: 'QRNG (Quantum Random Number Generation) introduces true randomness into security cycles, making it impossible for attackers to predict challenge patterns or replay attacks.' },
  { q: 'How do I add more devices?', a: 'Upgrade to the Pro or Enterprise plan to register additional devices. Pro allows up to 5 devices, Enterprise supports multiple users each with 5 devices.' },
  { q: 'What happens when a threat is destroyed?', a: 'A destroyed threat has been fully neutralized through the multi-cycle QRNG process. Its signatures are logged in the Base Chain for audit purposes.' },
];

const REMEDIATIONS = [
  { icon: ShieldCheck, title: 'Enable Paradox Lock', desc: 'Activate the Paradox Gate to block all autonomous agent intrusions in real time.', severity: 'critical' },
  { icon: AlertTriangle, title: 'Increase QRNG Cycles', desc: 'Raise your QRNG cycle count to 3+ in Settings for stronger entropy-based threat neutralization.', severity: 'warning' },
  { icon: Lightbulb, title: 'Configure Mirror Environment', desc: 'Route suspicious traffic to a honeypot to capture attacker methods without exposing real assets.', severity: 'info' },
  { icon: ShieldCheck, title: 'Review Threat Log', desc: 'Regularly audit your threat log to identify patterns and adjust defense policies accordingly.', severity: 'info' },
];

const severityStyle = {
  critical: 'text-red-400 bg-red-400/10 border-red-400/20',
  warning: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  info: 'text-primary bg-primary/10 border-primary/20',
};

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
    const reply = await base44.integrations.Core.InvokeLLM({
      prompt: `You are the SIFT-AI Quantum Shield AI support assistant. Answer the user's question helpfully and concisely. Context: SIFT-AI is a cybersecurity platform featuring Base Chain pipeline, Paradox Lock (AI bot blocker), QRNG cycles, Mirror Environment (honeypots/tarpits), Zero-Day detection, and workflow automation.\n\nUser question: ${userMsg}`,
    });
    setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    setLoading(false);
  };

  const submitFeedback = async () => {
    if (!feedback.trim() || !user) return;
    await base44.integrations.Core.SendEmail({
      to: 'support@sift-ai-shield.app',
      subject: 'SIFT-AI User Feedback',
      body: feedback,
    });
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
              <Button size="sm" variant="outline" className="font-mono text-[10px]" onClick={() => setChatOpen(o => !o)}>
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
                          <span className="font-mono text-[10px] text-muted-foreground">Thinking...</span>
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

      {/* Remediations */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-mono text-xs tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" /> RECOMMENDED REMEDIATIONS
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {REMEDIATIONS.map((r, i) => (
            <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${severityStyle[r.severity]}`}>
              <r.icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-mono text-[11px] font-semibold">{r.title}</div>
                <div className="font-mono text-[10px] opacity-80 mt-0.5 leading-relaxed">{r.desc}</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

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
                    <div className="px-4 pb-3 font-mono text-[10px] text-muted-foreground leading-relaxed border-t border-border pt-3">{faq.a}</div>
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
                  <span className="font-mono text-[10px] text-muted-foreground">Rate your experience:</span>
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
    </div>
  );
}