import React, { useState, useEffect } from 'react';
import FeatureGate from '@/components/subscription/FeatureGate';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bug, Clock, Eye, Loader2, Wifi, Globe, Shield, AlertTriangle } from 'lucide-react';
import { formatChicagoTime } from '@/lib/utils';
import { toast } from 'sonner';

const QRNGCycle = ({ onDestruct, disabled, isNeutralizing, buttonText = "Initiate QRNG" }) => {
  const [active, setActive] = useState(false);
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
        {buttonText}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 rounded border border-destructive/50 bg-destructive/10 w-full sm:w-auto mt-2">
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

export default function MirrorEnvironment() {
  const [deploying, setDeploying] = useState(null);
  const queryClient = useQueryClient();

  const { data: sessions = [] } = useQuery({
    queryKey: ['honeypot-sessions'],
    queryFn: () => base44.entities.HoneypotSession.list('-created_date', 30),
    initialData: [],
  });

  const createSessionMutation = useMutation({
    mutationFn: (data) => base44.entities.HoneypotSession.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['honeypot-sessions'] }),
  });

  const createEventMutation = useMutation({
    mutationFn: (data) => base44.entities.SecurityEvent.create(data),
  });

  const neutralizeMutation = useMutation({
    mutationFn: (id) => base44.entities.HoneypotSession.update(id, { status: 'destroyed' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['honeypot-sessions'] });
      toast.success('Session destroyed successfully');
    }
  });

  const deployDecoy = async (type) => {
    setDeploying(type);
    const ip = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

    await createSessionMutation.mutateAsync({
      session_type: type,
      source_ip: ip,
      duration_seconds: Math.floor(Math.random() * 3600),
      interactions: Math.floor(Math.random() * 50) + 1,
      data_captured: type === 'honeypot'
        ? `Captured ${Math.floor(Math.random() * 10) + 1} credentials, ${Math.floor(Math.random() * 5)} exploit attempts, ${Math.floor(Math.random() * 20)} port scans`
        : `Tarpit engaged for ${Math.floor(Math.random() * 60) + 30} minutes. Connection throttled to 1 byte/sec. Resources wasted.`,
      status: 'active',
    });

    await createEventMutation.mutateAsync({
      event_type: type === 'honeypot' ? 'honeypot_trigger' : 'tarpit_engage',
      severity: 'warning',
      details: `${type === 'honeypot' ? 'Honeypot' : 'Tarpit'} deployed for ${ip} in mirror environment`,
      environment: type,
    });

    setDeploying(null);
  };

  const activeSessions = sessions.filter(s => s.status === 'active');
  const completedSessions = sessions.filter(s => s.status !== 'active');
  const honeypotCount = sessions.filter(s => s.session_type === 'honeypot').length;
  const tarpitCount = sessions.filter(s => s.session_type === 'tarpit').length;

  return (
    <FeatureGate requiredPlan="pro" featureName="Mirror Environment & Honeypots">
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-xl font-bold tracking-wider text-foreground">MIRROR ENVIRONMENT</h1>
          <p className="font-mono text-[10px] text-muted-foreground tracking-widest mt-1">
            HONEYPOTS · TARPITS · DECEPTION LAYER (AUTO-DEPLOYED)
          </p>
        </div>
      </div>

      {/* Concept Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-amber-400/30 bg-amber-400/10">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Bug className="w-5 h-5 text-amber-400" />
              <CardTitle className="font-mono text-xs tracking-wider text-foreground">HONEYPOTS</CardTitle>
              <Badge className="ml-auto font-mono text-[9px] bg-amber-400/10 text-amber-400 border-amber-400/30">{honeypotCount}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-[11px] text-foreground/80 leading-relaxed font-medium">
              Fake services that appear as real targets. When attackers interact, we capture their tools, techniques, and intent — all within the isolated mirror environment. They think they're in production. They're not.
            </p>
          </CardContent>
        </Card>

        <Card className="border-fuchsia-400/30 bg-fuchsia-400/10">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-fuchsia-400" />
              <CardTitle className="font-mono text-xs tracking-wider text-fuchsia-400">TARPITS</CardTitle>
              <Badge className="ml-auto font-mono text-[9px] bg-fuchsia-400/10 text-fuchsia-400 border-fuchsia-400/30">{tarpitCount}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-[11px] text-foreground/80 leading-relaxed font-medium">
              Connections are accepted but data is transmitted at agonizingly slow rates (1 byte/sec). Attackers' resources are consumed while they wait. Time is the weapon — their time is wasted, your systems stay protected.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Mirror Architecture */}
      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-xs tracking-wider">MIRROR ARCHITECTURE</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="flex items-center justify-start lg:justify-center gap-2 md:gap-4 py-6 min-w-max pb-4 px-2">
            <div className="text-center">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-2 mx-auto">
                <Globe className="w-6 h-6 md:w-8 md:h-8 text-green-400" />
              </div>
              <span className="font-mono text-[9px] text-green-400">PRODUCTION</span>
            </div>
            <div className="flex flex-col items-center gap-1 px-1 md:px-0">
              <Wifi className="w-4 h-4 text-primary animate-pulse" />
              <div className="w-12 md:w-24 h-px bg-primary/30" />
              <span className="font-mono text-[8px] text-muted-foreground">MIRROR SYNC</span>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-2 mx-auto">
                <Shield className="w-6 h-6 md:w-8 md:h-8 text-primary" />
              </div>
              <span className="font-mono text-[9px] text-primary">MIRROR ENV</span>
            </div>
            <div className="flex flex-col items-center gap-1 px-1 md:px-0">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <div className="w-12 md:w-24 h-px bg-amber-400/30" />
              <span className="font-mono text-[8px] text-muted-foreground">REDIRECT</span>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center mb-2 mx-auto">
                <Bug className="w-6 h-6 md:w-8 md:h-8 text-amber-400" />
              </div>
              <span className="font-mono text-[9px] text-amber-400">HONEYPOT</span>
            </div>
            <div className="flex flex-col items-center gap-1 px-1 md:px-0">
              <Clock className="w-4 h-4 text-fuchsia-400" />
              <div className="w-12 md:w-24 h-px bg-fuchsia-400/30" />
              <span className="font-mono text-[8px] text-foreground">THROTTLE</span>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-fuchsia-400/10 border border-fuchsia-400/30 flex items-center justify-center mb-2 mx-auto">
                <Clock className="w-6 h-6 md:w-8 md:h-8 text-fuchsia-400 opacity-100" />
              </div>
              <span className="font-mono text-[10px] font-bold text-fuchsia-400">TARPIT</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-mono text-xs tracking-wider">ACTIVE DECEPTION SESSIONS</CardTitle>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="font-mono text-[9px] text-muted-foreground">{activeSessions.length} active</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <AnimatePresence>
            {sessions.length === 0 ? (
              <div className="text-center py-8">
                <Eye className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="font-mono text-xs text-muted-foreground">No deception sessions currently active. Systems are monitoring and will auto-deploy when needed.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sessions.map((session, i) => (
                  <motion.div
                    key={session.id || i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border/50"
                  >
                    {session.session_type === 'honeypot' ? (
                      <Bug className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Clock className="w-4 h-4 text-fuchsia-400" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-semibold text-foreground">{session.source_ip}</span>
                        <Badge variant="outline" className={`font-mono text-[8px] ${
                          session.session_type === 'honeypot' ? 'text-amber-400 border-amber-400/30' : 'text-fuchsia-400 border-fuchsia-400/30'
                        }`}>
                          {session.session_type?.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className={`font-mono text-[8px] ${
                          session.status === 'active' ? 'text-green-400 border-green-400/30' : 'text-muted-foreground border-border'
                        }`}>
                          {session.status?.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="font-mono text-[9px] text-muted-foreground mt-0.5">
                        {session.data_captured || `${session.interactions} interactions`}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="font-mono text-[9px] text-muted-foreground">
                        {session.created_date ? formatChicagoTime(session.created_date) : ''}
                      </span>
                      {session.status === 'active' && (
                        <QRNGCycle 
                          onDestruct={() => neutralizeMutation.mutate(session.id)}
                          disabled={neutralizeMutation.isPending}
                          isNeutralizing={neutralizeMutation.isPending && neutralizeMutation.variables === session.id}
                        />
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
    </FeatureGate>
  );
}