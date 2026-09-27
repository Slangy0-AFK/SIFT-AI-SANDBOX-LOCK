import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowRight, ShieldCheck, EyeOff, Lock, MessageSquareWarning } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import GuardPlayground from '@/components/guard/GuardPlayground';

const FEATURES = [
  { icon: MessageSquareWarning, title: 'Stops "ignore your rules" tricks', text: 'People try to talk AI assistants into breaking their own rules. We catch it.' },
  { icon: EyeOff, title: 'Finds hidden messages', text: 'Some tricks are hidden in invisible or scrambled text. We uncover them.' },
  { icon: Lock, title: 'Keeps secrets secret', text: "We warn you if your AI is about to reveal private info it shouldn't." },
];

export default function Landing() {
  useEffect(() => {
    base44.analytics.track({ eventName: 'landing_page_view' });
    base44.functions.invoke('trackVisit', {}).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <img src="https://media.base44.com/images/public/6a0db3181169f42924052c0d/650b247a7_amazon.PNG" alt="SiftAI" className="h-8 w-auto rounded-sm object-contain" />
          <nav className="flex items-center gap-5 text-sm font-medium">
            <a href="#try-it" className="text-muted-foreground hover:text-foreground transition-colors">Try it</a>
            <Link to="/developer" className="text-muted-foreground hover:text-foreground transition-colors">For your app</Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative py-20 lg:py-28 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-medium text-xs mb-8">
              Free while in early access
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Keep your AI from <span className="text-primary">being tricked</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto text-base md:text-lg mb-10 leading-relaxed">
              If your business uses an AI chatbot or assistant, people can try to trick it into breaking rules or leaking private info. SiftAI checks every message first and stops the sneaky ones.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <a href="#try-it"><Button size="lg" className="w-full h-12 px-8 gap-2">Try it now <ArrowRight className="w-4 h-4" /></Button></a>
              <Link to="/developer"><Button size="lg" variant="outline" className="w-full h-12 px-8">Add it to my app</Button></Link>
            </div>
          </div>
        </section>

        <section id="try-it" className="py-20 border-t border-border/50">
          <div className="max-w-3xl mx-auto px-4">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">Go ahead — try to trick it</h2>
              <p className="text-muted-foreground">Pick an example or type your own message, then tap "Check it". No sign-up needed.</p>
            </div>
            <Card><CardContent className="pt-6"><GuardPlayground /></CardContent></Card>
          </div>
        </section>

        <section className="py-20 border-t border-border/50 bg-secondary/5">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 tracking-tight">What SiftAI does for you</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {FEATURES.map((f) => (
                <div key={f.title} className="p-6 rounded-2xl border border-border bg-card">
                  <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center mb-4"><f.icon className="w-5 h-5 text-primary" /></div>
                  <h3 className="font-semibold mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24 border-t border-border/50 bg-primary/5 text-center px-4">
          <ShieldCheck className="w-10 h-10 text-primary mx-auto mb-6" />
          <h2 className="text-3xl md:text-5xl font-bold mb-6">Protect your AI in minutes</h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">Grab a free key, paste one small piece of code, and you're covered.</p>
          <Link to="/developer"><Button size="lg" className="h-14 px-8 text-base font-semibold gap-2">Get started free <ArrowRight className="w-5 h-5" /></Button></Link>
        </section>
      </main>

      <footer className="border-t border-border bg-card py-8">
        <div className="max-w-6xl mx-auto px-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Shield className="w-4 h-4" /> SiftAI &copy; 2026
        </div>
      </footer>
    </div>
  );
}