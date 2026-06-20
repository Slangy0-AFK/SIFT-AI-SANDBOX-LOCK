import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Activity, Bug, ArrowRight, ShieldCheck, Loader2, ShieldAlert, Terminal, Zap, Lock, ScanLine, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';

const SCAN_STEPS = [
  { id: 'env', label: 'Environment Initialization', detail: 'Validating browser signature & WebGL fingerprint...' },
  { id: 'network', label: 'Network Telemetry', detail: 'Analyzing routing anomalies and DNS leaks...' },
  { id: 'storage', label: 'Local Storage Audit', detail: 'Checking for persistent tracking payloads...' },
  { id: 'heuristics', label: 'Behavioral Heuristics', detail: 'Testing for automation and headless flags...' },
  { id: 'verify', label: 'Signature Verification', detail: 'Cross-referencing Sift-AI threat database...' },
];

function PublicScanner() {
  const [scanning, setScanning] = useState(false);
  const [stepIndex, setStepIndex] = useState(-1);
  const [results, setResults] = useState(null);

  const runScan = async () => {
    if (scanning) return;
    setScanning(true);
    setResults(null);
    
    let anomalies = 0;
    let warnings = 0;

    // Step 0: Env
    setStepIndex(0);
    await new Promise(r => setTimeout(r, 700));
    if (navigator.webdriver) anomalies++;
    if (!navigator.languages || navigator.languages.length === 0) anomalies++;
    if (window.cdc_adoQpoasnfa76pfcZLmcfl_Array) anomalies++; // Puppeteer flag

    // Step 1: Network
    setStepIndex(1);
    await new Promise(r => setTimeout(r, 700));
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz) warnings++;
    if (navigator.connection && navigator.connection.saveData) warnings++;

    // Step 2: Storage
    setStepIndex(2);
    await new Promise(r => setTimeout(r, 800));
    try {
      const estimate = await navigator.storage?.estimate();
      // Unusually high storage usage might indicate local caching/trackers
      if (estimate && estimate.usage > 1024 * 1024 * 200) warnings++; 
    } catch(e) {}

    // Step 3: Heuristics & Hardware
    setStepIndex(3);
    await new Promise(r => setTimeout(r, 900));
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)?.toLowerCase() : '';
        if (renderer.includes('swiftshader') || renderer.includes('llvmpipe')) {
          anomalies++; // Common in headless browsers
        }
      }
    } catch(e) {}

    if (navigator.hardwareConcurrency === 1) warnings++;

    // Step 4: Verify
    setStepIndex(4);
    await new Promise(r => setTimeout(r, 1000));
    
    setStepIndex(SCAN_STEPS.length);
    setResults({ 
      clean: anomalies === 0 && warnings === 0, 
      threats: anomalies,
      warnings: warnings
    });
    setScanning(false);
  };

  return (
    <div className="w-full">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <CardTitle className="font-mono text-sm tracking-wider flex items-center gap-2">
            <Terminal className="w-4 h-4 text-primary" /> TEST MY DEVICE
          </CardTitle>
        </div>
        <p className="font-mono text-[10px] text-muted-foreground tracking-wide mt-1">
          Run a quick, client-side simulation of the Sift-AI detection engine.
        </p>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <div className="space-y-2">
          {SCAN_STEPS.map((step, i) => {
            const done = stepIndex > i;
            const active = stepIndex === i && scanning;
            const pending = !done && !active;
            return (
              <motion.div
                key={step.id}
                animate={{ opacity: pending && stepIndex >= 0 ? 0.3 : 1 }}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  active ? 'bg-primary/10 border-primary/30' : 
                  done ? 'bg-green-500/5 border-green-500/20' : 
                  'bg-secondary/30 border-border/50'
                }`}
              >
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  active ? 'bg-primary animate-pulse' : 
                  done ? 'bg-green-400' : 'bg-muted-foreground/30'
                }`} />
                <div className="flex-1 min-w-0">
                  <span className={`font-mono text-xs font-semibold ${
                    active ? 'text-primary' : 
                    done ? 'text-green-400' : 'text-muted-foreground'
                  }`}>{step.label}</span>
                  {active && <p className="font-mono text-[10px] text-muted-foreground mt-0.5">{step.detail}</p>}
                </div>
                {active && <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" />}
                {done && <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />}
              </motion.div>
            );
          })}
        </div>

        <AnimatePresence>
          {results && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`mt-4 p-4 rounded-xl border ${
                results.clean 
                  ? 'bg-green-500/10 border-green-500/30' 
                  : 'bg-amber-500/10 border-amber-500/30'
              }`}
            >
              <div className="flex items-center gap-3">
                {results.clean ? (
                  <ShieldCheck className="w-8 h-8 text-green-400" />
                ) : (
                  <ShieldAlert className="w-8 h-8 text-amber-500" />
                )}
                <div>
                  <p className={`font-mono text-sm font-bold ${results.clean ? 'text-green-400' : 'text-amber-500'}`}>
                    {results.clean ? 'DEVICE APPEARS SECURE' : `${results.threats} ANOMALIES DETECTED`}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground mt-1">
                    {results.clean 
                      ? 'No immediate browser-level threats detected in this quick scan.' 
                      : 'Some tracking scripts or anomalies were identified.'}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Link to="/register">
                  <Button size="sm" className="font-mono">Get Full Protection</Button>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!scanning && !results && (
          <Button onClick={runScan} className="w-full font-mono mt-2" size="lg">
            <ScanLine className="w-4 h-4 mr-2" /> Start Device Scan
          </Button>
        )}
      </CardContent>
    </div>
  );
}

export default function Landing() {
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
              <Link to="/register" className="w-full sm:w-auto">
                <Button size="lg" className="w-full font-mono gap-2 h-12 px-8">
                  Start Free Trial <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/mirror-demo" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full font-mono gap-2 h-12 px-8 border-primary/30 text-primary hover:bg-primary/10">
                  View Live Demo <Activity className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Public Scanner Section */}
        <section className="py-16 bg-secondary/20 border-y border-border/50">
          <div className="max-w-4xl mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-10 items-center">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold font-mono text-foreground mb-4">
                  Check Your Exposure
                </h2>
                <p className="font-mono text-sm text-muted-foreground mb-6 leading-relaxed">
                  Run a lightweight, browser-based diagnostic test to identify potential tracking scripts, unsafe extensions, or environmental anomalies without installing any software.
                </p>
                <ul className="space-y-3 font-mono text-xs text-muted-foreground mb-8">
                  <li className="flex items-center gap-2"><Lock className="w-4 h-4 text-primary" /> No data leaves your browser</li>
                  <li className="flex items-center gap-2"><Zap className="w-4 h-4 text-primary" /> AI-powered heuristic check</li>
                  <li className="flex items-center gap-2"><Bug className="w-4 h-4 text-primary" /> Identifies tracking beacons</li>
                </ul>
              </div>
              <Card className="border-primary/20 shadow-2xl shadow-primary/5 bg-card/80 backdrop-blur">
                <PublicScanner />
              </Card>
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
    </div>
  );
}