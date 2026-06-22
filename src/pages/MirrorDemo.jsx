import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Shield, Bug, Activity, Clock, ShieldAlert, ArrowLeft, Globe, Wifi, AlertTriangle, ScanLine, Lock, X, Plus, ChevronRight, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import PublicScanner from '@/components/scanner/PublicScanner';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { formatLocalTime, getRealisticDate } from '@/lib/utils';

const QRNGCycle = ({ onDestruct, disabled, isNeutralizing }) => {
  const [active, setActive] = useState(true);
  const [timeLeft, setTimeLeft] = useState(3.0);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (active && timeLeft > 0) {
      const t = setInterval(() => {
        setTimeLeft(c => Math.max(0, c - 0.1));
      }, 100);
      return () => clearInterval(t);
    } else if (active && timeLeft === 0 && !completed) {
      if (!isNeutralizing) {
        onDestruct();
        setCompleted(true);
      }
    }
  }, [active, timeLeft, isNeutralizing, onDestruct, completed]);

  if (!active) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setActive(true)}
        disabled={disabled}
        className="h-8 text-[10px] uppercase font-bold tracking-wider w-full sm:w-auto border-destructive/50 text-destructive hover:bg-destructive/10"
      >
        Initiate QRNG
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 rounded border border-destructive/50 bg-destructive/10 w-full sm:w-auto">
      <div className="relative w-7 h-7 flex items-center justify-center flex-shrink-0">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="absolute inset-0 rounded-full border-2 border-destructive/20 border-t-destructive"
        />
        <span className="text-[9px] font-bold text-destructive tabular-nums">{timeLeft.toFixed(1)}</span>
      </div>
      <div className="flex flex-col text-left">
        <span className="text-[9px] font-bold text-destructive uppercase tracking-widest">
          {isNeutralizing ? 'Destroying...' : 'Active QRNG'}
        </span>
        <span className="text-[8px] text-destructive/80 font-mono">
          T-minus {timeLeft.toFixed(1)}s to Destruction
        </span>
      </div>
    </div>
  );
};

export default function MirrorDemo() {
  const [sessions, setSessions] = useState([]);
  const [searchParams] = useSearchParams();
  const isGuest = searchParams.get('guest') === 'true';
  const [visitorIp, setVisitorIp] = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [neutralizingId, setNeutralizingId] = useState(null);
  const [tutorialStep, setTutorialStep] = useState(searchParams.get('tutorial') === 'true' ? 1 : 0);

  const tutorialSteps = [
  {
    title: "Welcome to the Artificial Console",
    description: "You've successfully verified your humanity through the Paradox Gate. This artificial console shows what happens to the bots that fail and lets you simulate attacks.",
    icon: <Shield className="w-10 h-10 text-green-500" />
  },
    {
      title: "Deception Architecture",
      description: "SIFT-AI doesn't just block attacks—it traps them. Bad actors are silently rerouted to fake servers (Honeypots) or slowed down infinitely (Tarpits).",
      icon: <Globe className="w-10 h-10 text-primary" />
    },
    {
      title: "Live Interception Feed",
      description: "Watch bots get trapped in real-time. The system automatically drains their resources, but you can also manually neutralize them.",
      icon: <Activity className="w-10 h-10 text-amber-500" />
    },
    {
      title: "Take Control",
      description: "Try simulating an attack by clicking 'Deploy Decoy', then watch it appear in the live feed. You are in full control.",
      icon: <Bug className="w-10 h-10 text-destructive" />
    }
  ];

  const fetchAndUpdateSessions = async () => {
    try {
      const res = await base44.functions.invoke('getDemoTelemetry');
      const hSessions = res.data.honeypotSessions || [];
      const realSessions = hSessions.map(s => {
        const snapshotTime = getRealisticDate(s.updated_date || s.created_date).getTime();
        const elapsed = Math.max(0, Math.floor((Date.now() - snapshotTime) / 1000));
        return {
          id: s.id,
          type: s.session_type || 'tarpit',
          ip: s.source_ip || 'Unknown',
          duration: s.status === 'completed' ? (s.duration_seconds || 0) : (s.duration_seconds || 0) + elapsed,
          interactions: s.interactions || 0,
          timestamp: s.created_date,
          status: s.status || 'active'
        };
      });
      setSessions(realSessions);
    } catch (err) {
      console.error("Failed to load real sessions", err);
    }
  };

  const injectOptimisticDecoy = () => {
    const fakeId = 'temp-' + Date.now();
    const newSession = {
      id: fakeId,
      type: Math.random() > 0.5 ? 'honeypot' : 'tarpit',
      ip: `${Math.floor(Math.random()*200)+1}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`,
      duration: 0,
      interactions: 1,
      timestamp: new Date().toISOString(),
      status: 'active'
    };
    setSessions(prev => [newSession, ...prev]);
  };

  const deployDecoy = async () => {
    setDeploying(true);
    try {
      injectOptimisticDecoy();
      await base44.functions.invoke('demoActions', { action: 'deploy_decoy' });
      toast.success('New decoy deployed successfully');
      // Delay fetching by 5.1s to bypass the backend telemetry cache
      setTimeout(fetchAndUpdateSessions, 5100);
    } catch (err) {
      toast.error('Failed to deploy decoy');
    } finally {
      setDeploying(false);
    }
  };

  const neutralizeThreat = async (id) => {
    setNeutralizingId(id);
    try {
      await base44.functions.invoke('demoActions', { action: 'neutralize', id });
      toast.success('Threat neutralized successfully');
      setSessions(prev => prev.map(s => s.id === id ? { ...s, status: 'completed' } : s));
      
      // Auto-replenish to keep the feed active
      setTimeout(async () => {
        try {
          injectOptimisticDecoy();
          await base44.functions.invoke('demoActions', { action: 'deploy_decoy' });
          setTimeout(fetchAndUpdateSessions, 5100);
        } catch (e) {}
      }, 1000);
      
    } catch (err) {
      toast.error('Failed to neutralize threat');
    } finally {
      setNeutralizingId(null);
    }
  };

  useEffect(() => {
    if (isGuest) {
      fetch('https://api.ipify.org?format=json')
        .then(res => res.json())
        .then(data => setVisitorIp(data.ip))
        .catch(() => setVisitorIp('Local/Masked IP'));
    }
  }, [isGuest]);

  useEffect(() => {
    let mounted = true;
    
    let timeout;
    const loadRealSessions = async () => {
      if (!mounted) return;
      await fetchAndUpdateSessions();
      if (mounted) {
        timeout = setTimeout(loadRealSessions, 15000);
      }
    };
    
    loadRealSessions();

    // Local tick timer to animate durations between network polls
    const tickTimer = setInterval(() => {
      setSessions(prev => prev.map(s => {
        if (s.status === 'completed') return s;
        // Increase duration and randomly increase interactions for active sessions
        return {
          ...s,
          duration: s.duration + 1,
          interactions: Math.random() > 0.7 ? s.interactions + Math.floor(Math.random() * 3) : s.interactions
        };
      }));
    }, 1000);

    return () => {
      mounted = false;
      clearTimeout(timeout);
      clearInterval(tickTimer);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      <div 
        className="fixed inset-0 z-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1563206767-5b18f218e8de?auto=format&fit=crop&q=80&w=2069")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        }}
      />
      <div className="fixed inset-0 z-0 bg-background/80 pointer-events-none" />
      
      <div className="relative z-10 flex flex-col flex-1">
      {/* Header */}
      {isGuest && (
        <div className="bg-secondary border-b border-border text-foreground p-3 text-center text-sm flex flex-col sm:flex-row items-center justify-center gap-2 relative z-50">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <span className="font-semibold uppercase tracking-wider text-xs">Guest Demo Mode</span>
            <span className="hidden sm:inline text-muted-foreground">—</span>
            <span className="text-muted-foreground text-xs">Free to test. Deception layers are actively running. Your connection may be slowed or trapped for demonstration purposes.</span>
          </div>
          <Link to="/">
            <Button size="sm" variant="outline" className="h-7 text-xs ml-2">
              Exit Demo Mode
            </Button>
          </Link>
        </div>
      )}
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon" className="hover:bg-secondary">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              <span className="font-bold tracking-wide text-sm hidden sm:inline">ARTIFICIAL CONSOLE</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
              LIVE TELEMETRY (ANONYMIZED)
            </Badge>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Deception Architecture</h1>
              <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 tracking-wider">
                EARLY ACCESS
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl leading-relaxed">
              Public demonstration of Sift-AI's personal device scanner and protector using Mirror Architecture. Production traffic is routed normally, while suspicious signatures are seamlessly redirected to adaptive honeypots and tarpits.
            </p>
            <div className="mt-4 p-4 bg-secondary/50 border border-border rounded-xl max-w-2xl flex items-start gap-3">
              <Activity className="w-5 h-5 text-primary flex-shrink-0" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                <strong className="text-foreground font-semibold">Development Preview:</strong> This advanced deception module is currently under active development. Access is provided free of charge during this evaluation phase for testing and telemetry tuning.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" onClick={deployDecoy} disabled={deploying} className="w-full h-10 gap-2 font-medium transition-colors border-primary/20 text-primary hover:bg-primary/10">
              <Plus className="w-4 h-4" /> Deploy Decoy
            </Button>
            <Button variant="outline" onClick={() => setScannerOpen(true)} className="w-full h-10 gap-2 font-medium transition-colors">
              <ScanLine className="w-4 h-4 text-primary" /> Test My Device
            </Button>
          </div>
        </div>

        {/* Architecture Diagram */}
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="overflow-x-auto">
            <div className="flex items-center justify-start lg:justify-center gap-2 md:gap-4 py-8 min-w-max px-2">
              <div className="text-center">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-secondary border border-border flex items-center justify-center mb-2 mx-auto">
                  <Globe className="w-6 h-6 md:w-8 md:h-8 text-foreground" />
                </div>
                <span className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">PUBLIC TRAFFIC</span>
              </div>
              
              <div className="flex flex-col items-center gap-1 px-1 md:px-0">
                <Wifi className="w-4 h-4 text-muted-foreground" />
                <div className="w-12 md:w-24 h-px bg-border" />
                <span className="text-[9px] font-semibold text-muted-foreground uppercase">INSPECTION</span>
              </div>
              
              <div className="text-center relative">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-2 mx-auto z-10 relative">
                  <Shield className="w-6 h-6 md:w-8 md:h-8 text-primary" />
                </div>
                <span className="text-[10px] font-bold text-primary tracking-widest uppercase">SIFT-AI ENGINE</span>
              </div>

              <div className="flex flex-col items-center gap-1 px-1 md:px-0">
                <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                <div className="w-12 md:w-24 h-px bg-border" />
                <span className="text-[9px] font-semibold text-muted-foreground uppercase">REDIRECT</span>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-2 mx-auto">
                  <Bug className="w-6 h-6 md:w-8 md:h-8 text-amber-500" />
                </div>
                <span className="text-[10px] font-semibold text-amber-500 tracking-widest uppercase">HONEYPOT</span>
              </div>

              <div className="flex flex-col items-center gap-1 px-1 md:px-0">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <div className="w-12 md:w-24 h-px bg-border" />
                <span className="text-[9px] font-semibold text-muted-foreground uppercase">THROTTLE</span>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-secondary border border-border flex items-center justify-center mb-2 mx-auto">
                  <Clock className="w-6 h-6 md:w-8 md:h-8 text-foreground" />
                </div>
                <span className="text-[10px] font-semibold text-foreground tracking-widest uppercase">TARPIT</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Terminology Guide */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="border-border bg-card shadow-sm hover:border-amber-500/30 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Bug className="w-4 h-4 text-amber-500" /> HONEYPOT
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground leading-relaxed">
                A decoy system designed to look like a vulnerable target. It lures in malicious actors and autonomous bots, tracking their behavior, methods, and signatures while keeping them away from actual production data.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-sm hover:border-primary/30 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" /> TARPIT
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground leading-relaxed">
                A defensive mechanism that intentionally delays incoming connections. By slowing down responses to suspicious requests, it exhausts the resources of automated scanners and bots, making their attacks inefficient.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Live Feed */}
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" /> LIVE INTERCEPTIONS
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Real-time live telemetry of trapped anomalous sessions.
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-[10px]">
              {sessions.length} ACTIVE
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
              {sessions.length === 0 && (
                <div className="p-8 text-center text-muted-foreground text-xs">
                  No active interceptions at this time. Systems monitoring...
                </div>
              )}
              <AnimatePresence initial={false}>
                {sessions.map((session) => (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, height: 0, backgroundColor: 'hsl(var(--primary)/0.05)' }}
                    animate={{ opacity: 1, height: 'auto', backgroundColor: 'transparent' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-secondary/20 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {session.type === 'honeypot' ? (
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                          <Bug className="w-4 h-4 text-amber-500" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                          <Clock className="w-4 h-4 text-primary" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">
                            {session.ip}
                          </span>
                          <Badge variant="outline" className={`text-[8px] px-1.5 py-0 h-4 uppercase ${
                            session.type === 'honeypot' 
                              ? 'text-amber-500 border-amber-500/30 bg-amber-500/5' 
                              : 'text-primary border-primary/30 bg-primary/5'
                          }`}>
                            {session.type}
                          </Badge>
                          {session.status === 'completed' ? (
                            <Badge variant="outline" className="text-[8px] px-1.5 py-0 h-4 uppercase text-green-500 border-green-500/30 bg-green-500/5 ml-1">
                              DESTROYED
                            </Badge>
                          ) : (
                            <span className="text-[9px] font-bold text-destructive animate-pulse ml-2 flex items-center gap-1">
                              <Activity className="w-3 h-3" /> DESTROYING
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2 font-medium">
                          <span>{session.interactions} interactions</span>
                          <span>&bull;</span>
                          <span>{session.status === 'completed' ? 'Destroyed after' : 'Trapped for'} {session.duration}s</span>
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4 w-full sm:w-auto">
                      <div className="flex flex-col items-end gap-1 w-full sm:w-auto">
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                          <div className="flex flex-col gap-1 w-full sm:w-32">
                            <span className="text-[8px] text-muted-foreground font-semibold uppercase tracking-wider">Threat Intensity</span>
                            <div className="h-1.5 bg-secondary rounded-full overflow-hidden w-full">
                              <div 
                                className={`h-full rounded-full ${session.type === 'honeypot' ? 'bg-amber-500' : 'bg-primary'}`} 
                                style={{ width: `${Math.min(100, (session.interactions / 50) * 100)}%` }} 
                              />
                            </div>
                          </div>
                          <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap text-right mt-3">
                            {session.timestamp ? formatLocalTime(session.timestamp) : ''}
                          </span>
                        </div>
                      </div>
                      {session.status === 'active' && (
                        <QRNGCycle 
                          onDestruct={() => neutralizeThreat(session.id)} 
                          disabled={neutralizingId !== null && neutralizingId !== session.id} 
                          isNeutralizing={neutralizingId === session.id}
                        />
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      </main>

      {scannerOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full relative">
            <Button variant="ghost" size="icon" className="absolute -top-12 right-0 text-white hover:bg-white/10" onClick={() => setScannerOpen(false)}>
              <X className="w-6 h-6" />
            </Button>
            <Card className="border-primary/20 shadow-2xl shadow-primary/10 bg-card/90 backdrop-blur-xl">
              <PublicScanner />
            </Card>
          </div>
        </div>
      )}

      <AnimatePresence>
        {tutorialStep > 0 && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="max-w-md w-full"
            >
              <Card className="border-primary/30 shadow-[0_0_40px_rgba(14,165,233,0.15)] bg-card/95 backdrop-blur-xl overflow-hidden relative">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute top-2 right-2 text-muted-foreground hover:text-foreground z-10" 
                  onClick={() => setTutorialStep(0)}
                >
                  <X className="w-4 h-4" />
                </Button>
                
                <div className="h-1 bg-secondary w-full absolute top-0 left-0">
                  <div 
                    className="h-full bg-primary transition-all duration-300" 
                    style={{ width: `${(tutorialStep / tutorialSteps.length) * 100}%` }}
                  />
                </div>

                <CardContent className="pt-10 pb-6 px-8 text-center space-y-4">
                  <div className="mx-auto w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                    {tutorialSteps[tutorialStep - 1].icon}
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-foreground">
                    {tutorialSteps[tutorialStep - 1].title}
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {tutorialSteps[tutorialStep - 1].description}
                  </p>
                </CardContent>

                <CardFooter className="px-8 pb-8 pt-0 flex justify-between items-center">
                  <div className="flex gap-1.5">
                    {tutorialSteps.map((_, i) => (
                      <div 
                        key={i} 
                        className={`w-2 h-2 rounded-full transition-colors ${
                          i === tutorialStep - 1 ? 'bg-primary' : 'bg-secondary'
                        }`} 
                      />
                    ))}
                  </div>
                  
                  <Button 
                    onClick={() => {
                      if (tutorialStep < tutorialSteps.length) {
                        setTutorialStep(tutorialStep + 1);
                      } else {
                        setTutorialStep(0);
                      }
                    }}
                    className="gap-2"
                  >
                    {tutorialStep < tutorialSteps.length ? (
                      <>Next <ChevronRight className="w-4 h-4" /></>
                    ) : (
                      <>Get Started <Check className="w-4 h-4" /></>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      </div>
    </div>
  );
}