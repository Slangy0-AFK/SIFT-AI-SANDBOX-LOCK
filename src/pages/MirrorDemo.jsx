import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Bug, Activity, Clock, ShieldAlert, ArrowLeft, Globe, Wifi, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';

// Simulate realistic-looking IPs
const getRandomIP = () => `${Math.floor(Math.random()*200)+1}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`;

export default function MirrorDemo() {
  const [sessions, setSessions] = useState([]);

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
    
    setSessions(initialSessions);

    // Simulate incoming threats
    const interval = setInterval(() => {
      setSessions(prev => {
        const newSession = {
          id: `demo-${Math.random().toString(36).substr(2, 9)}`,
          type: Math.random() > 0.6 ? 'honeypot' : 'tarpit',
          ip: getRandomIP(),
          duration: 0,
          interactions: 1,
          timestamp: new Date().toISOString()
        };
        // Keep list bounded
        return [newSession, ...prev].slice(0, 15);
      });
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50">
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
            <h1 className="text-2xl font-mono font-bold text-foreground">Deception Architecture</h1>
            <p className="font-mono text-sm text-muted-foreground mt-1 max-w-2xl">
              Public demonstration of Sift-AI's mirror routing. Production traffic is routed normally, while suspicious signatures are seamlessly redirected to adaptive honeypots and tarpits.
            </p>
          </div>
          <Link to="/register">
            <Button className="font-mono shadow-lg shadow-primary/20">Enable For Your App</Button>
          </Link>
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
    </div>
  );
}