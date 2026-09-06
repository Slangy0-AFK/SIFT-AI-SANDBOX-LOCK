import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Activity, Bug, ArrowRight, ShieldCheck, Loader2, ShieldAlert, Terminal, Zap, Lock, ScanLine, CheckCircle2, Users } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';

import PublicScanner from '@/components/scanner/PublicScanner';

export default function Landing() {
  const [stats, setStats] = useState({ visits: null, scans: null, paradoxTries: null });

  useEffect(() => {
    const recordVisit = async () => {
      base44.analytics.track({ eventName: 'landing_page_view' });
      try {
        const res = await base44.functions.invoke('trackVisit', {});
        if (res.data) {
          setStats({
            visits: res.data.visits,
            scans: res.data.scans,
            paradoxTries: res.data.paradoxTries
          });
        }
      } catch (e) {
        console.error('Failed to track visit');
      }
    };
    recordVisit();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans relative">
      <div 
        className="fixed inset-0 z-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=2070")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        }}
      />
      <div className="fixed inset-0 z-0 bg-background/80 pointer-events-none" />
      
      <div className="relative z-10 flex flex-col flex-1">
      {/* Development Banner */}
      <div className="bg-primary/10 border-b border-primary/20 text-primary px-4 py-2 text-center text-xs font-medium z-50 relative flex items-center justify-center gap-2">
        <Activity className="w-3 h-3" />
        Note: The platform is currently under active development, but is completely free to try.
      </div>

      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img 
              src="https://media.base44.com/images/public/6a0db3181169f42924052c0d/650b247a7_amazon.PNG" 
              alt="Sift.ai Logo" 
              className="h-8 w-auto rounded-sm object-contain"
            />
            {/* <span className="font-bold text-sm tracking-wide">sift.ai</span> */}
          </div>
          
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link to="/verify-demo" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              Verification Demo
            </Link>
            <Link to="/developer" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              Developer API
            </Link>
          </nav>
          
          <div className="flex items-center gap-3">
            {/* Registration removed for now */}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden py-20 lg:py-32">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
          
          <div className="max-w-7xl mx-auto px-4 relative z-10 flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-medium text-xs mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Early Access — Free to Try
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 text-foreground">
              Threat Detection <br className="hidden md:block"/>
              <span className="text-primary">& Human Verification</span>
            </h1>
            
            <p className="text-muted-foreground max-w-2xl text-base md:text-lg mb-10 leading-relaxed">
              Sift-AI combines browser-based device diagnostics, email and SMS threat scanning, live threat-intelligence lookups, and a human-verification widget you can embed in your own site.
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4 w-full sm:w-auto">
              <Link to="/developer" className="w-full sm:w-auto">
                <Button size="lg" className="w-full font-medium gap-2 h-12 px-8 transition-all">
                  Developer API <Activity className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/verify-demo?guest=true" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full font-medium gap-2 h-12 px-8 transition-all">
                  Try Human Verification <Lock className="w-4 h-4" />
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
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 tracking-tight">
                Is Your Device Compromised?
              </h2>
              <p className="text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Run our lightweight, AI-powered browser diagnostic to instantly expose hidden tracking scripts, headless automation flags, and environmental anomalies. <strong className="text-foreground">100% Client-Side. No software installation required.</strong>
              </p>
            </div>
            <div className="grid md:grid-cols-12 gap-8 items-center">
              <div className="md:col-span-5 order-2 md:order-1 space-y-6 bg-secondary/30 p-6 rounded-2xl border border-border">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Lock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Zero Data Extraction</h4>
                    <p className="text-sm text-muted-foreground mt-1">All telemetry is analyzed directly within your browser. We never store your personal data.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Heuristic AI Engine</h4>
                    <p className="text-sm text-muted-foreground mt-1">Identifies unknown threats by analyzing hardware anomalies and behavioral patterns.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bug className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Deep Script Inspection</h4>
                    <p className="text-sm text-muted-foreground mt-1">Detects obfuscated code, cryptominers, and tracking beacons running silently.</p>
                  </div>
                </div>
              </div>
              <div className="md:col-span-7 order-1 md:order-2">
                <Card className="border-border bg-card shadow-sm relative overflow-hidden">
                  <PublicScanner />
                </Card>
              </div>
            </div>
          </div>
        </section>
        
        {/* Architecture / Features */}
        <section className="py-20 lg:py-32 border-t border-border/50 bg-secondary/5">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 tracking-tight">
                What Sift-AI Actually Does
              </h2>
              <p className="text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Three working tools: device diagnostics, message and reputation scanning, and human verification you can embed.
              </p>
            </div>
            
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
              <Card className="border-border bg-card shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Bug className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Device Diagnostics</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground leading-relaxed">
                  A client-side browser scan that surfaces automation flags, tracking scripts, risky extensions, and environment anomalies — no install required.
                </CardContent>
              </Card>
              <Card className="border-border bg-card shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Activity className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Threat Scanning</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground leading-relaxed">
                  Check links, domains, IPs, and file hashes against live reputation feeds, and analyze emails and texts for phishing and scam indicators.
                </CardContent>
              </Card>
              <Card className="border-border bg-card shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <ShieldCheck className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Human Verification</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground leading-relaxed">
                  An embeddable widget with timed challenges and strike-based lockouts, plus a server-side verification API for your own site or app.
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="py-24 relative overflow-hidden bg-primary/5 border-t border-border/50">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-50" />
          <div className="max-w-4xl mx-auto px-4 relative z-10 text-center">
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
              Scan Your Device. Verify Your Users.
            </h2>
            <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
              Try Sift-AI free during early access — run a device scan, check a suspicious link, or add human verification to your own site.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/verify-demo?guest=true" className="w-full sm:w-auto">
                <Button size="lg" className="w-full h-14 px-8 text-base font-semibold">
                  Try Human Verification <Activity className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-10">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground font-medium">Sift-AI &copy; 2026</span>
          </div>
          <div className="flex gap-6 text-sm font-medium text-muted-foreground">
            {/* Links moved to app sidebar */}
          </div>
        </div>
      </footer>


      </div>
    </div>
  );
}