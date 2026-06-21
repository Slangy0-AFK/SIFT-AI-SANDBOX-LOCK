import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Activity, Bug, ArrowRight, ShieldCheck, Loader2, ShieldAlert, Terminal, Zap, Lock, ScanLine, CheckCircle2, Users } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';

import PublicScanner from '@/components/scanner/PublicScanner';

export default function Landing() {
  const [visitCount, setVisitCount] = useState(null);

  useEffect(() => {
    const recordVisit = async () => {
      try {
        const res = await base44.functions.invoke('trackVisit', {});
        if (res.data?.visits) {
          setVisitCount(res.data.visits);
        }
      } catch (e) {
        console.error('Failed to track visit');
      }
    };
    recordVisit();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Shield className="w-6 h-6 text-primary" />
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            </div>
            <span className="font-mono font-bold tracking-wider text-sm">SIFT-AI</span>
          </div>
          
          <nav className="hidden md:flex items-center gap-6 font-mono text-xs">
            <Link to="/mirror-demo" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
              <Activity className="w-3 h-3" /> Mirror Demo
            </Link>
            <Link to="/about" className="text-muted-foreground hover:text-primary transition-colors">About</Link>
            <Link to="/contact" className="text-muted-foreground hover:text-primary transition-colors">Contact</Link>
          </nav>
          
          <div className="flex items-center gap-3">
            <Link to="/login" className="hidden sm:block">
              <Button variant="ghost" size="sm" className="font-mono text-xs">Login</Button>
            </Link>
            <Link to="/register">
              <Button size="sm" className="font-mono text-xs">Get Protected</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden py-20 lg:py-32">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
          
          <div className="max-w-7xl mx-auto px-4 relative z-10 flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-mono text-[10px] mb-8 uppercase tracking-widest">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Engine V2.0 Online
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black font-mono tracking-tight mb-6 text-foreground/90 uppercase">
              Autonomous <br className="hidden md:block"/>
              <span className="text-primary">Threat Neutralization</span>
            </h1>
            
            <p className="text-muted-foreground max-w-2xl font-mono text-sm md:text-base mb-10 leading-relaxed">
              Sift-AI Quantum Shield deploys advanced honeypots, tarpits, and AI-driven behavioral analysis to detect, trap, and neutralize zero-day threats before they breach your network.
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4 w-full sm:w-auto">
              <Link to="/mirror-demo?guest=true" className="w-full sm:w-auto">
                <Button size="lg" className="w-full font-mono gap-2 h-12 px-8 shadow-[0_0_20px_rgba(var(--primary),0.3)] hover:shadow-[0_0_30px_rgba(var(--primary),0.5)] transition-all">
                  Launch Mirror Demo <Activity className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/paradox-gate?guest=true" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full font-mono gap-2 h-12 px-8 border-purple-500/50 text-purple-400 hover:bg-purple-500/10 shadow-[0_0_15px_rgba(168,85,247,0.2)] hover:shadow-[0_0_25px_rgba(168,85,247,0.4)] transition-all">
                  Enter Paradox Gate <Lock className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/register" className="w-full sm:w-auto">
                <Button size="lg" variant="secondary" className="w-full font-mono gap-2 h-12 px-8">
                  Start Free Trial <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Public Scanner Section */}
        <section className="py-20 bg-background relative overflow-hidden border-y border-border/50 shadow-[inset_0_0_100px_rgba(var(--primary),0.05)]">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          <div className="max-w-5xl mx-auto px-4 relative z-10">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-black font-mono text-foreground mb-4 tracking-tight uppercase">
                Is Your Device <span className="text-destructive">Compromised?</span>
              </h2>
              <p className="font-mono text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Run our lightweight, AI-powered browser diagnostic to instantly expose hidden tracking scripts, headless automation flags, and environmental anomalies. <strong className="text-foreground">100% Client-Side. No software installation required.</strong>
              </p>
            </div>
            <div className="grid md:grid-cols-12 gap-8 items-center">
              <div className="md:col-span-5 order-2 md:order-1 space-y-6 bg-secondary/20 p-6 rounded-2xl border border-border/50">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Lock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-mono font-bold text-sm">Zero Data Extraction</h4>
                    <p className="font-mono text-xs text-muted-foreground mt-1">All telemetry is analyzed directly within your browser. We never store your personal data.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-mono font-bold text-sm">Heuristic AI Engine</h4>
                    <p className="font-mono text-xs text-muted-foreground mt-1">Identifies unknown threats by analyzing hardware anomalies and behavioral patterns.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bug className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-mono font-bold text-sm">Deep Script Inspection</h4>
                    <p className="font-mono text-xs text-muted-foreground mt-1">Detects obfuscated code, cryptominers, and tracking beacons running silently.</p>
                  </div>
                </div>
              </div>
              <div className="md:col-span-7 order-1 md:order-2">
                <Card className="border-primary/30 shadow-[0_0_40px_rgba(var(--primary),0.15)] bg-card/90 backdrop-blur-xl relative overflow-hidden transform transition-all hover:scale-[1.01] duration-300">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/0 via-primary to-primary/0" />
                  <PublicScanner />
                </Card>
              </div>
            </div>
          </div>
        </section>
        
        {/* Architecture / Features */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-center text-2xl md:text-3xl font-bold font-mono text-foreground mb-16">
              Platform Architecture
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="border-border bg-card/50">
                <CardHeader>
                  <Bug className="w-10 h-10 text-amber-500 mb-2" />
                  <CardTitle className="font-mono text-lg">Deception Network</CardTitle>
                </CardHeader>
                <CardContent className="font-mono text-sm text-muted-foreground">
                  Instantly deploy adaptive honeypots and tarpits that mimic vulnerable production systems, trapping malicious actors and draining their resources.
                </CardContent>
              </Card>
              <Card className="border-border bg-card/50">
                <CardHeader>
                  <Activity className="w-10 h-10 text-primary mb-2" />
                  <CardTitle className="font-mono text-lg">Behavioral AI</CardTitle>
                </CardHeader>
                <CardContent className="font-mono text-sm text-muted-foreground">
                  Move beyond static signatures. Sift-AI analyzes intent and behavior in real-time to identify and isolate autonomous botnets and novel attack vectors.
                </CardContent>
              </Card>
              <Card className="border-border bg-card/50">
                <CardHeader>
                  <ShieldCheck className="w-10 h-10 text-green-500 mb-2" />
                  <CardTitle className="font-mono text-lg">Zero-Day Mitigation</CardTitle>
                </CardHeader>
                <CardContent className="font-mono text-sm text-muted-foreground">
                  Our Paradox Lock technology challenges anomalous requests cryptographically, effectively neutralizing threats before a patch is even developed.
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-muted-foreground" />
            <span className="font-mono text-xs text-muted-foreground tracking-wider">SIFT-AI QUANTUM SHIELD &copy; 2026</span>
          </div>
          <div className="flex gap-6 font-mono text-xs text-muted-foreground">
            <Link to="/about" className="hover:text-primary transition-colors">About</Link>
            <Link to="/contact" className="hover:text-primary transition-colors">Contact</Link>
            <Link to="/login" className="hover:text-primary transition-colors">Login</Link>
          </div>
        </div>
      </footer>

      {/* Visitor Counter */}
      <AnimatePresence>
        {visitCount !== null && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-4 left-4 z-50 bg-card/80 backdrop-blur-md border border-primary/20 rounded-full px-3 py-1.5 flex items-center gap-2 shadow-lg shadow-primary/5"
          >
            <div className="relative flex items-center justify-center">
              <span className="absolute w-full h-full bg-primary/20 rounded-full animate-ping" />
              <Users className="w-3.5 h-3.5 text-primary relative" />
            </div>
            <span className="font-mono text-xs font-bold text-foreground">{visitCount.toLocaleString()}</span>
            <span className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase hidden sm:inline">Visitors</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}