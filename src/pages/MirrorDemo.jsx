import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Shield, Bug, Activity, Clock, ShieldAlert, ArrowLeft, Globe, Wifi, AlertTriangle, ScanLine, Lock, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import PublicScanner from '@/components/scanner/PublicScanner';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

// Simulate realistic-looking IPs
const getRandomIP = () => `${Math.floor(Math.random()*200)+1}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`;

export default function MirrorDemo() {
  const [sessions, setSessions] = useState([]);
  const [searchParams] = useSearchParams();
  const isGuest = searchParams.get('guest') === 'true';
  const [visitorIp, setVisitorIp] = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);

  useEffect(() => {
    if (isGuest) {
      fetch('https://api.ipify.org?format=json')
        .then(res => res.json())
        .then(data => setVisitorIp(data.ip))
        .catch(() => setVisitorIp('Local/Masked IP'));
    }
  }, [isGuest]);

  useEffect(() => {
    // Generate initial synthetic sessions
    const initialSessions = Array.from({ length: 4 }).map((_, i) => ({
      id: `demo-${Math.random().toString(36).substr(2, 9)}`,
      type: Math.random() > 0.5 ? 'honeypot' : 'tarpit',
      ip: getRandomIP(),
      duration: Math.floor(Math.random() * 300),
      interactions: Math.floor(Math.random() * 50),
      timestamp: new Date(Date.now() - Math.random() * 10000).toISOString()
    }));
    
    if (isGuest && visitorIp) {
      initialSessions.unshift({
        id: 'guest-tarpit-session',
        type: 'tarpit',
        ip: visitorIp + ' (YOU)',
        duration: 0,
        interactions: 1,
        timestamp: new Date().toISOString()
      });
    }
    
    setSessions(initialSessions);

    // Simulate incoming threats faster to feel more live
    const interval = setInterval(() => {
      setSessions(prev => {
        let guestSession = null;
        const others = [];
        
        prev.forEach(s => {
          if (s.id === 'guest-tarpit-session') {
            guestSession = {
              ...s,
              duration: s.duration + 2, // updating every 2 seconds roughly
              interactions: s.interactions + (Math.random() > 0.5 ? 1 : 0)
            };
          } else {
            others.push({
              ...s,
              duration: s.duration + 2,
              interactions: s.interactions + (Math.random() > 0.7 ? 1 : 0)
            });
          }
        });

        const shouldAddNew = Math.random() > 0.4;
        let nextSessions = [...others];
        
        if (shouldAddNew) {
          const newSession = {
            id: `demo-${Math.random().toString(36).substr(2, 9)}`,
            type: Math.random() > 0.5 ? 'honeypot' : 'tarpit',
            ip: getRandomIP(),
            duration: 0,
            interactions: 1,
            timestamp: new Date().toISOString()
          };
          nextSessions = [newSession, ...others].slice(0, 14);
        }
        
        if (guestSession) {
          // Keep guest session at the top
          nextSessions = nextSessions.filter(s => s.id !== 'guest-tarpit-session');
          nextSessions.unshift(guestSession);
        }
        return nextSessions;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isGuest, visitorIp]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      {isGuest && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 text-amber-500 p-3 text-center font-mono text-xs flex flex-col sm:flex-row items-center justify-center gap-2 relative z-50">
          <div className="flex items-center gap-2">
            <span className="text-xl">🧪</span>
            <span className="font-bold uppercase tracking-wider">Guest Demo Mode</span>
            <span className="hidden sm:inline">—</span>
            <span>Free to test. Deception layers (TarPit & Honeypot) are actively running. Your connection may be slowed or trapped for demonstration purposes.</span>
          </div>
          <Link to="/">
            <Button size="sm" variant="outline" className="h-7 text-[10px] uppercase font-bold border-amber-500/50 text-amber-500 hover:bg-amber-500/10 ml-2 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
              Exit Demo / Safe Mode
            </Button>
          </Link>
        </div>
      )}
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              <span className="font-mono font-bold tracking-wider text-sm hidden sm:inline">MIRROR DEMO</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="font-mono text-[10px] bg-primary/10 text-primary border-primary/20 animate-pulse">
              LIVE TELEMETRY (ANONYMIZED)
            </Badge>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-mono font-bold text-foreground">Deception Architecture</h1>
              <Badge variant="outline" className="font-mono text-[10px] bg-primary/10 text-primary border-primary/30">
                EARLY ACCESS
              </Badge>
            </div>
            <p className="font-mono text-sm text-muted-foreground mt-2 max-w-2xl">
              Public demonstration of Sift-AI's personal device scanner and protector using Mirror Architecture. Production traffic is routed normally, while suspicious signatures are seamlessly redirected to adaptive honeypots and tarpits.
            </p>
            <div className="mt-3 p-3 bg-secondary/30 border border-border rounded-lg max-w-2xl flex items-start gap-3">
              <Activity className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="font-mono text-xs text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Development Preview:</strong> This advanced deception module is currently under active development. Access is provided free of charge during this evaluation phase for testing and telemetry tuning.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" onClick={() => setScannerOpen(true)} className="font-mono shadow-[0_0_15px_rgba(var(--primary),0.2)] border-primary/50 text-primary w-full h-10 gap-2 uppercase tracking-widest font-bold">
              <ScanLine className="w-4 h-4 animate-pulse" /> Test My Device
            </Button>
          </div>
        </div>

        {/* Architecture Diagram */}
        <Card className="border-primary/20 bg-card/50 backdrop-blur">
          <CardContent className="overflow-x-auto">
            <div className="flex items-center justify-start lg:justify-center gap-2 md:gap-4 py-8 min-w-max px-2">
              <div className="text-center">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-2 mx-auto shadow-lg shadow-green-500/5">
                  <Globe className="w-6 h-6 md:w-8 md:h-8 text-green-400" />
                </div>
                <span className="font-mono text-[9px] text-green-400">PUBLIC TRAFFIC</span>
              </div>
              
              <div className="flex flex-col items-center gap-1 px-1 md:px-0">
                <Wifi className="w-4 h-4 text-primary animate-pulse" />
                <div className="w-12 md:w-24 h-px bg-primary/30" />
                <span className="font-mono text-[8px] text-muted-foreground">INSPECTION</span>
              </div>
              
              <div className="text-center relative">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-2 mx-auto shadow-lg shadow-primary/10 z-10 relative">
                  <Shield className="w-6 h-6 md:w-8 md:h-8 text-primary" />
                </div>
                <span className="font-mono text-[9px] text-primary">SIFT-AI ENGINE</span>
              </div>

              <div className="flex flex-col items-center gap-1 px-1 md:px-0">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <div className="w-12 md:w-24 h-px bg-amber-400/30" />
                <span className="font-mono text-[8px] text-muted-foreground">REDIRECT</span>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center mb-2 mx-auto shadow-lg shadow-amber-400/5">
                  <Bug className="w-6 h-6 md:w-8 md:h-8 text-amber-400" />
                </div>
                <span className="font-mono text-[9px] text-amber-400">HONEYPOT</span>
              </div>

              <div className="flex flex-col items-center gap-1 px-1 md:px-0">
                <Clock className="w-4 h-4 text-accent" />
                <div className="w-12 md:w-24 h-px bg-accent/30" />
                <span className="font-mono text-[8px] text-muted-foreground">THROTTLE</span>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-2 mx-auto shadow-lg shadow-accent/5">
                  <Clock className="w-6 h-6 md:w-8 md:h-8 text-accent" />
                </div>
                <span className="font-mono text-[9px] text-accent">TARPIT</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live Feed */}
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/50">
            <div>
              <CardTitle className="font-mono text-sm flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" /> LIVE INTERCEPTIONS
              </CardTitle>
              <CardDescription className="font-mono text-xs mt-1">
                Real-time simulated telemetry of trapped anomalous sessions.
              </CardDescription>
            </div>
            <Badge className="font-mono text-[10px] bg-secondary text-muted-foreground border-border">
              {sessions.length} ACTIVE
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/50 max-h-[500px] overflow-y-auto">
              <AnimatePresence initial={false}>
                {sessions.map((session) => (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, height: 0, backgroundColor: 'hsl(var(--primary)/0.1)' }}
                    animate={{ opacity: 1, height: 'auto', backgroundColor: 'transparent' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      {session.type === 'honeypot' ? (
                        <div className="w-8 h-8 rounded bg-amber-400/10 border border-amber-400/20 flex items-center justify-center flex-shrink-0">
                          <Bug className="w-4 h-4 text-amber-400" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
                          <Clock className="w-4 h-4 text-accent" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-foreground">
                            {session.ip}
                          </span>
                          <Badge variant="outline" className={`font-mono text-[8px] px-1 py-0 h-4 ${
                            session.type === 'honeypot' 
                              ? 'text-amber-400 border-amber-400/30' 
                              : 'text-accent border-accent/30'
                          }`}>
                            {session.type.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="font-mono text-[10px] text-muted-foreground mt-1 flex items-center gap-2">
                          <span>{session.interactions} interactions</span>
                          <span>&bull;</span>
                          <span>{session.duration}s trapped</span>
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <div className="flex-1 sm:w-32 h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${session.type === 'honeypot' ? 'bg-amber-400' : 'bg-accent'}`} 
                          style={{ width: `${Math.min(100, (session.interactions / 50) * 100)}%` }} 
                        />
                      </div>
                      <span className="font-mono text-[10px] text-muted-foreground w-16 text-right">
                        {new Date(session.timestamp).toLocaleTimeString()}
                      </span>
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

    </div>
  );
}