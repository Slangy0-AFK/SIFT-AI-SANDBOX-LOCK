import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Shield, Lock, AlertTriangle, ArrowLeft, Loader2, CheckCircle2, Fingerprint, Eye, ScanLine, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { formatChicagoTime, getRealisticDate } from '@/lib/utils';
import PublicScanner from '@/components/scanner/PublicScanner';

export default function ParadoxGate() {
  const [sessions, setSessions] = useState([]);
  const [searchParams] = useSearchParams();
  const isGuest = searchParams.get('guest') === 'true';

  const [scannerOpen, setScannerOpen] = useState(false);
  const [strikeCount, setStrikeCount] = useState(0);
  const [verified, setVerified] = useState(false);
  const [locked, setLocked] = useState(false);
  const [lockReason, setLockReason] = useState('');

  const [captchaData, setCaptchaData] = useState(null);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaChallengeId, setCaptchaChallengeId] = useState('');
  const [checkingCaptcha, setCheckingCaptcha] = useState(false);
  const [loadingCaptcha, setLoadingCaptcha] = useState(true);
  const [honeypot, setHoneypot] = useState('');
  const [timeLeft, setTimeLeft] = useState(300);
  const [stats, setStats] = useState({
    humanTries: 0, humanBreaches: 0,
    robotTries: 0, robotBreaches: 0
  });

  const loadCaptcha = () => {
    setLoadingCaptcha(true);
    base44.functions.invoke('generateCaptcha')
      .then(res => {
        setCaptchaData(res.data.challenge);
        setCaptchaChallengeId(res.data.challenge_id || '');
      })
      .catch(console.error)
      .finally(() => setLoadingCaptcha(false));
  };

  useEffect(() => { loadCaptcha(); }, []);

  // Timer countdown
  useEffect(() => {
    if (locked || verified || strikeCount >= 3) return;

    if (timeLeft <= 0) {
      setStrikeCount(3);
      setLocked(true);
      setLockReason('Time expired. Session locked.');
      toast.error('Time frame expired. You have been locked out.');
      return;
    }

    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, locked, verified, strikeCount]);

  const handleCaptchaVerify = async (e) => {
    e?.preventDefault();
    const isRobot = honeypot !== '' || (e && e.nativeEvent && !e.nativeEvent.isTrusted);
    base44.functions.invoke('trackParadoxDemo', { action: 'try', isRobot }).catch(() => {});
    setStats(prev => ({
      ...prev,
      humanTries: isRobot ? prev.humanTries : prev.humanTries + 1,
      robotTries: isRobot ? prev.robotTries + 1 : prev.robotTries
    }));

    setCheckingCaptcha(true);
    try {
      // The answer is checked on the server against the stored challenge. The
      // page is told only whether it was right, never what the answer is, so
      // nothing handed to the browser can be decoded back into it.
      const res = await base44.functions.invoke('generateCaptcha', {
        action: 'verify',
        challenge_id: captchaChallengeId,
        answer: captchaAnswer,
      });
      const passed = res.data?.verified === true && !isRobot;

      if (passed) {
        base44.functions.invoke('trackParadoxDemo', { action: 'breach', isRobot }).catch(() => {});
        setStats(prev => ({
          ...prev,
          humanBreaches: isRobot ? prev.humanBreaches : prev.humanBreaches + 1,
          robotBreaches: isRobot ? prev.robotBreaches + 1 : prev.robotBreaches
        }));
        setVerified(true);
        toast.success('Verification complete.');
      } else {
        const next = strikeCount + 1;
        setStrikeCount(next);
        if (next >= 3) {
          setLocked(true);
          setLockReason('Strike 3: Session locked.');
          toast.error('Too many failed attempts. Session locked.');
        } else {
          toast.error(`Incorrect answer. Strike ${next}/3.`);
        }
        setCaptchaAnswer('');
        if (res.data?.locked) loadCaptcha();
      }
    } catch (err) {
      toast.error('Verification failed. Try again.');
    } finally {
      setCheckingCaptcha(false);
    }
  };

  const reset = () => {
    setVerified(false);
    setLocked(false);
    setLockReason('');
    setCaptchaAnswer('');
    setStrikeCount(0);
    setTimeLeft(300);
    loadCaptcha();
  };

  useEffect(() => {
    let mounted = true;
    let timeout;

    const loadRealSessions = async () => {
      try {
        const res = await base44.functions.invoke('getDemoTelemetry');
        if (!mounted) return;

        if (res.data.stats) {
          setStats({
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
            ip,
            status: e.event_type === 'threat_locked' ? 'locked' : (e.event_type === 'access_granted' ? 'passed' : 'evaluating'),
            strikes: e.event_type === 'threat_locked' ? 3 : (e.event_type === 'access_granted' ? 0 : 1),
            timestamp: e.created_date,
            seconds_since: Math.floor((Date.now() - getRealisticDate(e.created_date).getTime()) / 1000)
          };
        });
        setSessions(realSessions);
      } catch (err) {
        console.error('Failed to load sessions', err);
      } finally {
        if (mounted) timeout = setTimeout(loadRealSessions, 2000);
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
        {isGuest && (
          <div className="bg-secondary border-b border-border text-foreground p-3 text-center text-sm flex flex-col sm:flex-row items-center justify-center gap-2 relative z-50">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <span className="font-semibold uppercase tracking-wider text-xs">Guest Demo Mode</span>
              <span className="hidden sm:inline text-muted-foreground">—</span>
              <span className="text-muted-foreground text-xs">Free to test. This is a limited public preview of our verification system.</span>
            </div>
            <Link to="/">
              <Button size="sm" variant="outline" className="h-7 text-xs ml-2">Exit Demo Mode</Button>
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
                <Fingerprint className="w-5 h-5 text-primary" />
                <span className="font-bold tracking-wide text-sm hidden sm:inline">HUMAN VERIFICATION</span>
              </div>
            </div>
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
              LIVE VERIFICATION SESSIONS
            </Badge>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6 relative z-10 pb-20">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Human Verification Demo</h1>
                <Badge variant="outline" className="text-xs bg-secondary text-muted-foreground border-border uppercase tracking-widest">
                  BOT MITIGATION
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-3 max-w-2xl leading-relaxed">
                This is a public preview of SIFT AI's layered verification system, which combines timed challenges,
                behavioral signals, and rate limiting to separate humans from automated agents. Repeated failures
                trigger a strike-based lockout. The full challenge set and detection methods are proprietary and
                are not shown in this demo.
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
            {/* Left Column: Verification */}
            <div className="md:col-span-5 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-secondary/50 border border-border rounded-xl p-4 flex flex-col items-center justify-center text-center">
                  <span className="text-xs text-muted-foreground font-semibold tracking-widest uppercase mb-1">HUMAN ATTEMPTS</span>
                  <span className="text-2xl font-bold text-foreground">{stats.humanTries}</span>
                  <span className="text-xs text-muted-foreground mt-1">{stats.humanBreaches} Passed</span>
                </div>
                <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                  <span className="text-xs text-destructive/80 font-semibold tracking-widest uppercase mb-1">BOT ATTEMPTS</span>
                  <span className="text-2xl font-bold text-destructive">{stats.robotTries}</span>
                  <span className="text-xs text-destructive/60 mt-1">{stats.robotBreaches} Passed</span>
                </div>
              </div>

              <Card className="border-border bg-card shadow-sm relative overflow-hidden">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Lock className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg text-foreground">Verification Challenge</CardTitle>
                  <CardDescription className="text-xs tracking-widest mt-2 uppercase font-medium">
                    Public Preview — Stage 1 of a Multi-Layer System
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {!verified && !locked && (
                    <div className="bg-secondary/50 rounded-xl p-5 border border-border text-center relative overflow-hidden">
                      <p className="text-xs text-muted-foreground font-semibold tracking-widest mb-3 flex items-center justify-center gap-2 uppercase">
                        <ScanLine className="w-3 h-3" /> TIMED CHALLENGE
                      </p>
                      {loadingCaptcha || !captchaData ? (
                        <div className="flex items-center justify-center gap-2 py-4">
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        </div>
                      ) : (
                        <div className="relative z-10 space-y-3 text-center">
                          <div className="flex items-center justify-center gap-4 text-xs font-mono mb-4 text-primary whitespace-pre">
                            <div>{captchaData.num1_visual.join('\n')}</div>
                            <div className="text-2xl font-bold">+</div>
                            <div>{captchaData.num2_visual.join('\n')}</div>
                          </div>
                          <p className="text-sm text-foreground leading-relaxed font-medium">
                            {captchaData.instruction}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

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

                  {!verified && !locked && (
                    <div className="space-y-4 pt-2 relative">
                      <div className="flex justify-between items-center text-xs font-mono text-muted-foreground mb-4">
                        <span>Awaiting Input...</span>
                        <span className={timeLeft < 60 ? 'text-destructive font-bold animate-pulse' : ''}>
                          {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                        </span>
                      </div>
                      <input
                        type="text"
                        name="bot_verification"
                        value={honeypot}
                        onChange={(e) => setHoneypot(e.target.value)}
                        className="opacity-0 absolute -z-10 w-0 h-0"
                        tabIndex={-1}
                        autoComplete="off"
                      />
                      <div className="flex flex-col gap-3">
                        <Input
                          type="number"
                          placeholder="Enter the sum..."
                          className="h-12 text-center font-medium bg-background border-border"
                          value={captchaAnswer}
                          onChange={(e) => setCaptchaAnswer(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleCaptchaVerify(e)}
                        />
                        <Button
                          className="w-full h-12 transition-colors font-semibold tracking-widest"
                          onClick={handleCaptchaVerify}
                          disabled={!captchaAnswer.trim() || loadingCaptcha || checkingCaptcha}
                        >
                          VERIFY
                        </Button>
                      </div>
                    </div>
                  )}

                  <AnimatePresence>
                    {(verified || locked) && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={`rounded-xl p-5 border text-center relative overflow-hidden ${
                          locked ? 'bg-destructive/5 border-destructive/30' : 'bg-green-500/5 border-green-500/30'
                        }`}
                      >
                        <div className="relative z-10 space-y-3">
                          {locked
                            ? <AlertTriangle className="w-8 h-8 text-destructive mx-auto" />
                            : <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto" />}
                          <p className={`text-sm font-bold tracking-wide ${locked ? 'text-destructive' : 'text-green-500'}`}>
                            {locked ? 'SESSION LOCKED' : 'VERIFICATION COMPLETE'}
                          </p>
                          {locked ? (
                            <div className="space-y-2">
                              <p className="text-xs text-muted-foreground">{lockReason || 'Too many failed attempts within the time window.'}</p>
                              <Button size="sm" variant="outline" className="text-xs mt-2" onClick={reset}>Try Again</Button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-xs text-muted-foreground">
                                You passed the public preview stage. In production, additional proprietary
                                verification layers run server-side before access is granted.
                              </p>
                              <div className="flex gap-2 justify-center mt-3">
                                <Link to="/developer">
                                  <Button size="sm" className="font-medium">Add This To My Site</Button>
                                </Link>
                                <Button size="sm" variant="outline" onClick={reset}>Reset Demo</Button>
                              </div>
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
                      <Fingerprint className="w-4 h-4 text-primary" /> RECENT VERIFICATION EVENTS
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      Anonymized telemetry from recent verification attempts on this system.
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {sessions.length} EVENTS
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
                                <span className="text-sm font-medium text-foreground">{session.ip}</span>
                                <Badge variant="outline" className={`text-xs px-1.5 py-0 h-4 uppercase ${
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
                                    session.strikes >= s ? 'bg-destructive' : 'bg-muted'
                                  }`} />
                                ))}
                                <span className="text-xs text-muted-foreground ml-2 font-medium">
                                  {session.strikes} / 3 Strikes
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right w-full sm:w-auto">
                            <div className="text-xs text-muted-foreground font-medium flex flex-col items-end gap-1">
                              <span>{formatChicagoTime(session.timestamp)}</span>
                              {session.seconds_since !== undefined && (
                                <span className="text-xs opacity-70">{session.seconds_since}s ago</span>
                              )}
                            </div>
                            {session.status === 'locked' && (
                              <div className="text-xs text-destructive mt-1 flex items-center justify-end gap-1 font-bold">
                                <Lock className="w-3 h-3" /> LOCKED OUT
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
              <Card className="border-border shadow-2xl bg-card/95 backdrop-blur-xl">
                <PublicScanner />
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}