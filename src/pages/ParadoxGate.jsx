import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Shield, Lock, AlertTriangle, ArrowLeft, Loader2, CheckCircle2, XCircle, BrainCircuit, Fingerprint, Eye, Database, ScanLine, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import PublicScanner from '@/components/scanner/PublicScanner';

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

  useEffect(() => {
    base44.entities.SiteStat.list().then(stats => {
      if (stats.length > 0) {
        setParadoxStats({
          tries: stats[0].paradox_tries || 0,
          breaches: stats[0].paradox_breaches || 0,
          humanTries: stats[0].human_paradox_tries || 0,
          humanBreaches: stats[0].human_paradox_breaches || 0,
          robotTries: stats[0].robot_paradox_tries || 0,
          robotBreaches: stats[0].robot_paradox_breaches || 0
        });
      }
    });
  }, []);

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
        toast.success("Paradox Breached: Universal Truth Accepted.");
      } else {
        toast.error("Paradox Failed: Incorrect Truth.");
      }
    } catch (err) {
      const data = err?.response?.data || { message: 'Verification failed. Try again.' };
      setResult(data);
      if (data.strike) setStrikeCount(data.strike);
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
    
    const loadRealSessions = async () => {
      try {
        const events = await base44.entities.SecurityEvent.filter({
          event_type: { $in: ['threat_locked', 'access_granted', 'qrng_cycle'] }
        }, '-created_date', 50);
        
        if (!mounted) return;
        
        const realSessions = events.map(e => {
           let ip = 'Unknown';
           if (e.source_ip) ip = e.source_ip;
           else {
             const match = e.details?.match(/from ([\d.]+)/) || e.details?.match(/strike_([\d.]+)/);
             if (match) ip = match[1];
           }
           
           return {
             id: e.id,
             type: 'paradox_lock',
             ip: ip,
             status: e.event_type === 'threat_locked' ? 'locked' : (e.event_type === 'access_granted' ? 'passed' : 'evaluating'),
             strikes: e.event_type === 'threat_locked' ? 3 : (e.event_type === 'access_granted' ? 0 : 1),
             timestamp: e.created_date
           }
        });
        setSessions(realSessions);
      } catch (err) {
        console.error("Failed to load real sessions", err);
      }
    };
    
    loadRealSessions();

    const unsub = base44.entities.SecurityEvent.subscribe((event) => {
      if (event.type === 'create') {
        loadRealSessions();
      }
    });

    return () => {
      mounted = false;
      if (unsub) unsub();
    };
  }, []);

  const isLocked = result?.locked || strikeCount >= 3;
  const isSuccess = result?.success;

  return (
    <div className="min-h-screen bg-[#050510] text-foreground flex flex-col font-mono relative overflow-hidden">
      {/* Mystical Background */}
      <div className="fixed inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>

      {/* Header */}
      {isGuest && (
        <div className="bg-purple-500/10 border-b border-purple-500/30 text-purple-400 p-3 text-center font-mono text-xs flex flex-col sm:flex-row items-center justify-center gap-2 relative z-50">
          <div className="flex items-center gap-2">
            <span className="text-xl">🧪</span>
            <span className="font-bold uppercase tracking-wider">Guest Demo Mode</span>
            <span className="hidden sm:inline">—</span>
            <span>Free to test. Deception layers (TarPit & Honeypot) are actively running. Your connection may be slowed or trapped for demonstration purposes.</span>
          </div>
          <Link to="/">
            <Button size="sm" variant="outline" className="h-7 text-[10px] uppercase font-bold border-purple-500/50 text-purple-400 hover:bg-purple-500/10 ml-2 shadow-[0_0_10px_rgba(168,85,247,0.2)]">
              Exit Demo / Safe Mode
            </Button>
          </Link>
        </div>
      )}
      <header className="border-b border-purple-900/30 bg-card/40 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon" className="hover:bg-purple-900/20">
                <ArrowLeft className="w-5 h-5 text-purple-400" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-purple-500" />
              <span className="font-mono font-bold tracking-wider text-sm text-purple-100 hidden sm:inline">PARADOX GATE</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="font-mono text-[10px] bg-purple-900/20 text-purple-400 border-purple-500/30 animate-pulse">
              LIVE LOCK SESSIONS
            </Badge>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-mono font-black text-purple-100 tracking-tight">The Paradox Gate</h1>
              <Badge variant="outline" className="font-mono text-[10px] bg-purple-500/10 text-purple-300 border-purple-500/30">
                ZERO-DAY MITIGATION
              </Badge>
            </div>
            <p className="font-mono text-sm text-purple-300/70 mt-2 max-w-2xl">
              An unpassable cryptographic and logical barrier for autonomous agents. AI cannot sincerely process universal truths, trapping them in endless evaluation loops while human users pass seamlessly. Protect your device and applications with this advanced logic gate.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" onClick={() => setScannerOpen(true)} className="font-mono shadow-[0_0_15px_rgba(168,85,247,0.2)] border-purple-500/50 text-purple-400 hover:bg-purple-500/10 hover:text-purple-300 w-full h-10 gap-2 uppercase tracking-widest font-bold transition-all">
              <ScanLine className="w-4 h-4 animate-pulse" /> Test My Device
            </Button>
            <Link to="/register">
              <Button className="font-mono shadow-[0_0_15px_rgba(168,85,247,0.4)] bg-purple-600 hover:bg-purple-500 text-white h-10 w-full transition-all">Enable For Your App</Button>
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-12 gap-6 pt-6">
          {/* Left Column: The Gate Challenge */}
          <div className="md:col-span-5 space-y-6">
            
            {/* Real Stats Display */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-purple-900/20 border border-purple-500/20 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                <span className="font-mono text-[10px] text-purple-400 tracking-widest mb-1">HUMAN ATTEMPTS</span>
                <span className="font-mono text-2xl font-black text-purple-100">{paradoxStats.humanTries}</span>
                <span className="font-mono text-[10px] text-purple-300/50 mt-1">{paradoxStats.humanBreaches} Passed</span>
              </div>
              <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                <span className="font-mono text-[10px] text-destructive/80 tracking-widest mb-1">BOT ATTEMPTS</span>
                <span className="font-mono text-2xl font-black text-destructive">{paradoxStats.robotTries}</span>
                <span className="font-mono text-[10px] text-destructive/50 mt-1">{paradoxStats.robotBreaches} Passed</span>
              </div>
            </div>

            <Card className="border-purple-500/30 bg-card/60 backdrop-blur-xl shadow-[0_0_40px_rgba(168,85,247,0.1)] relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-purple-500/0 via-purple-500 to-purple-500/0" />
              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 mb-4 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                  <Lock className="w-8 h-8 text-purple-400" />
                </div>
                <CardTitle className="font-mono text-lg text-purple-100">Human Verification Gate</CardTitle>
                <CardDescription className="text-purple-300/60 font-mono text-[10px] tracking-widest mt-2 uppercase">
                  AI Access Denied
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Challenge */}
                <div className="bg-[#020205] rounded-xl p-5 border border-purple-500/20 text-center relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <p className="font-mono text-[10px] text-purple-400 tracking-widest mb-3 flex items-center justify-center gap-2">
                    <Database className="w-3 h-3" /> UNIVERSAL TRUTH CHALLENGE
                  </p>
                  {loadingChallenge ? (
                    <div className="flex items-center justify-center gap-2 py-4">
                      <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                    </div>
                  ) : (
                    <p className="font-mono text-sm text-purple-50 leading-relaxed relative z-10">{challenge}</p>
                  )}
                </div>

                {/* Strike Counter */}
                <div className="flex justify-center items-center gap-3">
                  {[1, 2, 3].map(s => (
                    <div key={s} className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-mono font-black border-2 transition-all duration-300 ${
                      strikeCount >= s 
                        ? 'bg-destructive/20 border-destructive text-destructive shadow-[0_0_15px_rgba(239,68,68,0.4)]' 
                        : 'bg-[#020205] border-purple-900/50 text-purple-700'
                    }`}>
                      {s}
                    </div>
                  ))}
                </div>

                {/* Controls */}
                {!isLocked && !isSuccess && (
                  <div className="space-y-4 pt-2 relative">
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
                        className="flex-1 font-mono h-12 bg-purple-600/10 hover:bg-purple-600/20 border border-purple-500/30 text-purple-300 transition-all hover:shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                        onClick={(e) => handleAnswer('Yes', e)}
                      >
                        YES
                      </Button>
                      <Button
                        className="flex-1 font-mono h-12 bg-purple-600/10 hover:bg-purple-600/20 border border-purple-500/30 text-purple-300 transition-all hover:shadow-[0_0_15px_rgba(168,85,247,0.3)]"
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
                        isLocked ? 'bg-destructive/10 border-destructive/40 shadow-[0_0_30px_rgba(239,68,68,0.2)]' :
                        isSuccess ? 'bg-green-500/10 border-green-500/40 shadow-[0_0_30px_rgba(34,197,94,0.2)]' :
                        'bg-amber-500/10 border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.2)]'
                      }`}
                    >
                      <div className="relative z-10 space-y-3">
                        {isLocked ? <AlertTriangle className="w-8 h-8 text-destructive mx-auto animate-pulse" /> :
                          isSuccess ? <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto" /> :
                          <XCircle className="w-8 h-8 text-amber-400 mx-auto" />}
                        <p className={`font-mono text-sm font-black tracking-wide ${isLocked ? 'text-destructive' : isSuccess ? 'text-green-400' : 'text-amber-400'}`}>
                          {isLocked ? 'STRIKE 3 — LOCKOUT ENGAGED' :
                           isSuccess ? 'VERIFIED — ACCESS GRANTED' :
                           `STRIKE ${result.strike || '?'} / 3 — LOGIC ERROR`}
                        </p>
                        <p className="font-mono text-xs text-purple-200/70">{result.message || result.reason}</p>
                        {!isLocked && !isSuccess && (
                          <Button size="sm" variant="outline" className="font-mono text-xs mt-2 border-amber-500/30 text-amber-400 hover:bg-amber-500/10" onClick={reset}>Try Again</Button>
                        )}
                        {isLocked && (
                          <Button size="sm" variant="outline" className="font-mono text-xs mt-2 border-destructive/30 text-destructive hover:bg-destructive/10" onClick={reset}>Reset Demo</Button>
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
            <Card className="border-purple-500/20 bg-card/40 backdrop-blur-xl h-full flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-purple-900/30">
                <div>
                  <CardTitle className="font-mono text-sm flex items-center gap-2 text-purple-100">
                    <Fingerprint className="w-4 h-4 text-purple-400" /> ACTIVE PARADOX LOCKS
                  </CardTitle>
                  <CardDescription className="font-mono text-xs mt-1 text-purple-300/60">
                    Real-time telemetry of bots failing the cryptographic challenge.
                  </CardDescription>
                </div>
                <Badge className="font-mono text-[10px] bg-purple-900/40 text-purple-300 border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.2)]">
                  {sessions.length} TRAPPED
                </Badge>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-hidden">
                <div className="divide-y divide-purple-900/20 h-full max-h-[600px] overflow-y-auto custom-scrollbar">
                  <AnimatePresence initial={false}>
                    {sessions.map((session) => (
                      <motion.div
                        key={session.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-purple-900/10 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${
                            session.status === 'locked' 
                              ? 'bg-destructive/10 border-destructive/30 shadow-[0_0_10px_rgba(239,68,68,0.2)]' 
                              : 'bg-purple-500/10 border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                          }`}>
                            {session.status === 'locked' ? (
                              <AlertTriangle className="w-5 h-5 text-destructive" />
                            ) : (
                              <Eye className="w-5 h-5 text-purple-400" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`font-mono text-sm font-bold ${session.id === 'guest-plock-session' ? 'text-white' : 'text-purple-100'}`}>
                                {session.ip}
                              </span>
                              <Badge variant="outline" className={`font-mono text-[8px] px-1.5 py-0 h-4 uppercase ${
                                session.status === 'locked' 
                                  ? 'text-destructive border-destructive/30 bg-destructive/10' 
                                  : 'text-purple-400 border-purple-500/30 bg-purple-500/5'
                              }`}>
                                {session.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                              {[1, 2, 3].map(s => (
                                <div key={s} className={`w-2 h-2 rounded-full ${
                                  session.strikes >= s 
                                    ? 'bg-destructive shadow-[0_0_5px_rgba(239,68,68,0.8)]' 
                                    : 'bg-purple-900/50'
                                }`} />
                              ))}
                              <span className="font-mono text-[10px] text-purple-300/50 ml-2">
                                {session.strikes} / 3 Strikes
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right w-full sm:w-auto">
                          <div className="font-mono text-[10px] text-purple-300/40">
                            {new Date(session.timestamp).toLocaleTimeString()}
                          </div>
                          {session.status === 'locked' && (
                            <div className="font-mono text-[9px] text-destructive mt-1 flex items-center justify-end gap-1">
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
  );
}