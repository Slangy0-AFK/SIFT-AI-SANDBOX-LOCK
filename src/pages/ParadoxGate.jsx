import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Shield, Lock, AlertTriangle, ArrowLeft, Loader2, CheckCircle2, XCircle, BrainCircuit, Fingerprint, Eye, Database, ScanLine, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { formatChicagoTime, getRealisticDate } from '@/lib/utils';
import PublicScanner from '@/components/scanner/PublicScanner';
import confetti from 'canvas-confetti';

// Simulate realistic-looking IPs
const getRandomIP = () => `${Math.floor(Math.random()*200)+1}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`;

export default function ParadoxGate() {
  const [sessions, setSessions] = useState([]);
  const [searchParams] = useSearchParams();
  const isGuest = searchParams.get('guest') === 'true';
  const [visitorIp, setVisitorIp] = useState(null);
  
  const [paradoxOpen, setParadoxOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState(null);
  const [strikeCount, setStrikeCount] = useState(0);
  const [challenge, setChallenge] = useState('');
  const [loadingChallenge, setLoadingChallenge] = useState(true);
  const [honeypot, setHoneypot] = useState("");
  const [paradoxStats, setParadoxStats] = useState({ 
    tries: 0, breaches: 0, 
    humanTries: 0, humanBreaches: 0, 
    robotTries: 0, robotBreaches: 0 
  });

  // Load the challenge
  useEffect(() => {
    base44.functions.invoke('theologicalMFA', { action: 'get_challenge' })
      .then(res => setChallenge(res.data?.challenge || 'Is Jesus Christ your Lord and Savior?'))
      .catch(() => setChallenge('Is Jesus Christ your Lord and Savior?'))
      .finally(() => setLoadingChallenge(false));
  }, []);

  const handleVerify = async (selectedAnswer, e) => {
    setResult(null);
    
    // Robot detection heuristics
    const answerLower = selectedAnswer.toLowerCase();
    const isRobot = answerLower.includes('-ai') || honeypot !== "" || (e && e.nativeEvent && !e.nativeEvent.isTrusted);

    try {
      // Track attempt
      base44.functions.invoke('trackParadoxDemo', { action: 'try', isRobot }).catch(() => {});
      setParadoxStats(prev => ({ 
        ...prev, 
        tries: prev.tries + 1,
        humanTries: isRobot ? prev.humanTries : prev.humanTries + 1,
        robotTries: isRobot ? prev.robotTries + 1 : prev.robotTries
      }));

      const res = await base44.functions.invoke('theologicalMFA', {
        action: 'gate_verify',
        answer: selectedAnswer,
        isRobot: isRobot,
      });
      const data = res.data;
      setResult(data);
      if (data.strike) setStrikeCount(data.strike);
      
      if (data.success) {
        // Track breach
        base44.functions.invoke('trackParadoxDemo', { action: 'breach', isRobot }).catch(() => {});
        setParadoxStats(prev => ({ 
          ...prev, 
          breaches: prev.breaches + 1,
          humanBreaches: isRobot ? prev.humanBreaches : prev.humanBreaches + 1,
          robotBreaches: isRobot ? prev.robotBreaches + 1 : prev.robotBreaches
        }));
        
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#00d4ff', '#10b981']
        });
        
        // Play success tone
        try {
          const audio = new Audio('https://media.base44.com/audio/success-bell.mp3');
          audio.volume = 0.5;
          audio.play().catch(e => console.log('Audio play failed:', e));
        } catch (e) {}

        toast.success("Paradox Breached: Universal Truth Accepted.");
      } else {
        toast.error("Paradox Failed: Incorrect Truth.");
      }
    } catch (err) {
      const data = err?.response?.data || { message: 'Verification failed. Try again.' };
      setResult(data);
      if (data.strike) setStrikeCount(data.strike);
      
      // Play error tone
      try {
        const audio = new Audio('https://media.base44.com/audio/error-buzz.mp3');
        audio.volume = 0.3;
        audio.play().catch(e => console.log('Audio play failed:', e));
      } catch (e) {}
      
      toast.error(data.message || "Paradox Failed");
    }
  };

  const handleAnswer = (val, e) => {
    setAnswer(val);
    handleVerify(val, e);
  };

  const reset = () => {
    setResult(null);
    setAnswer('');
    setStrikeCount(0);
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
      try {
        const res = await base44.functions.invoke('getDemoTelemetry');
        if (!mounted) return;

        if (res.data.stats) {
          setParadoxStats({
            tries: res.data.stats.paradox_tries || 0,
            breaches: res.data.stats.paradox_breaches || 0,
            humanTries: res.data.stats.human_paradox_tries || 0,
            humanBreaches: res.data.stats.human_paradox_breaches || 0,
            robotTries: res.data.stats.robot_paradox_tries || 0,
            robotBreaches: res.data.stats.robot_paradox_breaches || 0
          });
        }
        
        const events = res.data.securityEvents || [];
        const realSessions = events.map(e => {
           let ip = 'Unknown';
           if (e.source_ip) ip = e.source_ip;
           else {
             const match = e.details?.match(/from ([\d.x]+)/) || e.details?.match(/strike_([\d.x]+)/);
             if (match) ip = match[1];
           }
           
           return {
             id: e.id,
             type: 'paradox_lock',
             ip: ip,
             status: e.event_type === 'threat_locked' ? 'locked' : (e.event_type === 'access_granted' ? 'passed' : 'evaluating'),
             strikes: e.event_type === 'threat_locked' ? 3 : (e.event_type === 'access_granted' ? 0 : 1),
             timestamp: e.created_date,
             seconds_since: Math.floor((Date.now() - getRealisticDate(e.created_date).getTime()) / 1000)
           }
        });
        setSessions(realSessions);
      } catch (err) {
        console.error("Failed to load real sessions", err);
      } finally {
        if (mounted) {
          timeout = setTimeout(loadRealSessions, 15000);
        }
      }
    };
    
    loadRealSessions();

    const tickTimer = setInterval(() => {
      setSessions(prev => prev.map(s => ({ ...s, seconds_since: (s.seconds_since || 0) + 1 })));
    }, 1000);

    return () => {
      mounted = false;
      clearTimeout(timeout);
      clearInterval(tickTimer);
    };
  }, []);

  const isLocked = result?.locked || strikeCount >= 3;
  const isSuccess = result?.success;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans relative">
      <div 
        className="fixed inset-0 z-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1614064641913-6b71a2ea5102?auto=format&fit=crop&q=80&w=2070")',
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
            <Shield className="w-4 h-4 text-primary" />
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
              <BrainCircuit className="w-5 h-5 text-primary" />
              <span className="font-bold tracking-wide text-sm hidden sm:inline">PARADOX GATE</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
              LIVE LOCK SESSIONS
            </Badge>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Can you pass the Paradox Lock?</h1>
              <Badge variant="outline" className="text-[10px] bg-secondary text-muted-foreground border-border uppercase tracking-widest">
                ZERO-DAY MITIGATION
              </Badge>
            </div>
            <p className="text-lg text-primary font-medium mt-3">Only humans with consistent behavioral patterns succeed.</p>
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl leading-relaxed">
              Sift-AI challenges incoming requests with unresolvable cryptographic logic. Bots and autonomous agents enter an infinite evaluation loop trying to solve it, while real humans pass through instantly using intuition.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" onClick={() => setScannerOpen(true)} className="w-full sm:w-auto h-10 gap-2 font-medium transition-all">
              <ScanLine className="w-4 h-4 text-primary" /> Test My Device
            </Button>
            <Link to="/register" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto h-10 font-medium transition-all">Enable For Your App</Button>
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-12 gap-6 pt-6">
          {/* Left Column: The Gate Challenge */}
          <div className="md:col-span-5 space-y-6">
            
            {/* Real Stats Display */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-secondary/50 border border-border rounded-xl p-4 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] text-muted-foreground font-semibold tracking-widest uppercase mb-1">HUMAN ATTEMPTS</span>
                <span className="text-2xl font-bold text-foreground">{paradoxStats.humanTries}</span>
                <span className="text-[10px] text-muted-foreground mt-1">{paradoxStats.humanBreaches} Passed</span>
              </div>
              <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] text-destructive/80 font-semibold tracking-widest uppercase mb-1">BOT ATTEMPTS</span>
                <span className="text-2xl font-bold text-destructive">{paradoxStats.robotTries}</span>
                <span className="text-[10px] text-destructive/60 mt-1">{paradoxStats.robotBreaches} Passed</span>
              </div>
            </div>

            <Card className="border-border bg-card shadow-sm relative overflow-hidden">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Lock className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-lg text-foreground">Human Verification Gate</CardTitle>
                <CardDescription className="text-[10px] tracking-widest mt-2 uppercase font-medium">
                  AI Access Denied
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Challenge */}
                <div className="bg-secondary/50 rounded-xl p-5 border border-border text-center relative overflow-hidden group">
                  <p className="text-[10px] text-muted-foreground font-semibold tracking-widest mb-3 flex items-center justify-center gap-2 uppercase">
                    <Database className="w-3 h-3" /> UNIVERSAL TRUTH CHALLENGE
                  </p>
                  {loadingChallenge ? (
                    <div className="flex items-center justify-center gap-2 py-4">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="relative z-10 space-y-3 text-center">
                      <div className="inline-block bg-primary/10 border border-primary/20 px-3 py-1 rounded text-primary text-[10px] font-bold tracking-widest mb-2 uppercase">
                        TRADE SECRET PROTECTION ACTIVE
                      </div>
                      <p className="text-sm text-foreground leading-relaxed font-medium">
                        {challenge.split('\n').map((line, i) => (
                          <React.Fragment key={i}>
                            {line.includes('[REDACTED') ? (
                              <span className="bg-foreground text-background px-2 py-0.5 rounded-sm font-bold mx-1 tracking-widest inline-block text-xs">
                                {line}
                              </span>
                            ) : (
                              line
                            )}
                            <br />
                          </React.Fragment>
                        ))}
                      </p>
                    </div>
                  )}
                </div>

                {/* Strike Counter */}
                <div className="flex justify-center items-center gap-3">
                  {[1, 2, 3].map(s => (
                    <div key={s} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-colors ${
                      strikeCount >= s 
                        ? 'bg-destructive/10 border-destructive text-destructive' 
                        : 'bg-secondary border-border text-muted-foreground'
                    }`}>
                      {s}
                    </div>
                  ))}
                </div>

                {/* Controls */}
                {!isLocked && !isSuccess && (
                  <div className="space-y-4 pt-2 relative">
                    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden mb-4">
                      <div className="h-full bg-primary animate-pulse" style={{ width: '45%' }}></div>
                    </div>
                    <p className="text-center text-xs font-mono text-muted-foreground mb-4">Awaiting Cognitive Input...</p>
                    <input 
                      type="text" 
                      name="bot_verification"
                      value={honeypot}
                      onChange={(e) => setHoneypot(e.target.value)}
                      className="opacity-0 absolute -z-10 w-0 h-0" 
                      tabIndex={-1} 
                      autoComplete="off" 
                    />
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1 h-12 transition-colors font-semibold"
                        onClick={(e) => handleAnswer('Yes', e)}
                      >
                        YES
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 h-12 transition-colors font-semibold"
                        onClick={(e) => handleAnswer('No', e)}
                      >
                        NO
                      </Button>
                    </div>
                  </div>
                )}

                {/* Result */}
                <AnimatePresence>
                  {result && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className={`rounded-xl p-5 border text-center relative overflow-hidden ${
                        isLocked ? 'bg-destructive/5 border-destructive/30' :
                        isSuccess ? 'bg-green-500/5 border-green-500/30' :
                        'bg-amber-500/5 border-amber-500/30'
                      }`}
                    >
                      <div className="relative z-10 space-y-3">
                        {isLocked ? <AlertTriangle className="w-8 h-8 text-destructive mx-auto" /> :
                          isSuccess ? <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto" /> :
                          <XCircle className="w-8 h-8 text-amber-500 mx-auto" />}
                        <p className={`text-sm font-bold tracking-wide ${isLocked ? 'text-destructive' : isSuccess ? 'text-green-500' : 'text-amber-500'}`}>
                          {isLocked ? 'ANOMALY DETECTED — PARADOX LOOP INITIATED' :
                           isSuccess ? 'GATE UNLOCKED' :
                           `STRIKE ${result.strike || '?'} / 3 — LOGIC ERROR`}
                        </p>
                        {isSuccess ? (
                          <div className="space-y-2">
                            <p className="text-xs font-mono text-green-500 bg-green-500/10 inline-block px-2 py-1 rounded">
                              Behavioral Score: {Math.floor(Math.random() * 15) + 85}/100 – Human-like
                            </p>
                            <p className="text-xs text-muted-foreground">Your cognitive pattern matches a genuine human response. Welcome.</p>
                            <div className="flex gap-2 justify-center mt-3">
                              <Link to="/mirror-demo?guest=true">
                                <Button size="sm" className="font-medium bg-green-600 hover:bg-green-700 text-white border-0">Enter Demo Dashboard</Button>
                              </Link>
                              <Button size="sm" variant="outline" onClick={reset}>Reset Demo</Button>
                            </div>
                          </div>
                        ) : isLocked ? (
                          <div className="space-y-2">
                            <p className="text-xs font-mono text-destructive bg-destructive/10 inline-block px-2 py-1 rounded">
                              Algorithmic Failure Detected
                            </p>
                            <p className="text-xs text-muted-foreground">Nice try, bot. Real humans don't evaluate philosophical paradoxes with deterministic algorithms. You have been tarpitted.</p>
                            <Button size="sm" variant="outline" className="text-xs mt-2" onClick={reset}>Try Again (Reset Fingerprint)</Button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">{result.message || result.reason}</p>
                            <Button size="sm" variant="outline" className="text-xs mt-2" onClick={reset}>Try Again</Button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Live Sessions */}
          <div className="md:col-span-7">
            <Card className="border-border bg-card shadow-sm h-full flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <Fingerprint className="w-4 h-4 text-primary" /> ACTIVE PARADOX LOCKS
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    Real-time telemetry of bots failing the cryptographic challenge.
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="text-[10px]">
                  {sessions.length} TRAPPED
                </Badge>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-hidden">
                <div className="divide-y divide-border h-full max-h-[600px] overflow-y-auto">
                  <AnimatePresence initial={false}>
                    {sessions.map((session) => (
                      <motion.div
                        key={session.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-secondary/20 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg border flex items-center justify-center flex-shrink-0 ${
                            session.status === 'locked' 
                              ? 'bg-destructive/10 border-destructive/20' 
                              : 'bg-primary/10 border-primary/20'
                          }`}>
                            {session.status === 'locked' ? (
                              <AlertTriangle className="w-5 h-5 text-destructive" />
                            ) : (
                              <Eye className="w-5 h-5 text-primary" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-foreground">
                                {session.ip}
                              </span>
                              <Badge variant="outline" className={`text-[8px] px-1.5 py-0 h-4 uppercase ${
                                session.status === 'locked' 
                                  ? 'text-destructive border-destructive/30 bg-destructive/5' 
                                  : 'text-primary border-primary/30 bg-primary/5'
                              }`}>
                                {session.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                              {[1, 2, 3].map(s => (
                                <div key={s} className={`w-1.5 h-1.5 rounded-full ${
                                  session.strikes >= s 
                                    ? 'bg-destructive' 
                                    : 'bg-muted'
                                }`} />
                              ))}
                              <span className="text-[10px] text-muted-foreground ml-2 font-medium">
                                {session.strikes} / 3 Strikes
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right w-full sm:w-auto">
                          <div className="text-[10px] text-muted-foreground font-medium flex flex-col items-end gap-1">
                            <span>{formatChicagoTime(session.timestamp)}</span>
                            {session.seconds_since !== undefined && (
                              <span className="text-[9px] opacity-70">
                                {session.seconds_since}s ago
                              </span>
                            )}
                          </div>
                          {session.status === 'locked' && (
                            <div className="text-[9px] text-destructive mt-1 flex items-center justify-end gap-1 font-bold">
                              <Lock className="w-3 h-3" /> QUARANTINED
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {scannerOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full relative">
            <Button variant="ghost" size="icon" className="absolute -top-12 right-0 text-white hover:bg-white/10" onClick={() => setScannerOpen(false)}>
              <X className="w-6 h-6" />
            </Button>
            <Card className="border-purple-500/30 shadow-[0_0_40px_rgba(168,85,247,0.2)] bg-[#050510]/95 backdrop-blur-xl">
              <PublicScanner />
            </Card>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}