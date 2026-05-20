import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bug, Clock, Eye, Loader2, Wifi, Globe, Shield, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-xl font-bold tracking-wider text-foreground">MIRROR ENVIRONMENT</h1>
          <p className="font-mono text-[10px] text-muted-foreground tracking-widest mt-1">
            HONEYPOTS · TARPITS · DECEPTION LAYER
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            size="sm"
            className="font-mono text-xs"
            onClick={() => deployDecoy('honeypot')}
            disabled={!!deploying}
          >
            {deploying === 'honeypot' ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Bug className="w-3 h-3 mr-2" />}
            Deploy Honeypot
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="font-mono text-xs"
            onClick={() => deployDecoy('tarpit')}
            disabled={!!deploying}
          >
            {deploying === 'tarpit' ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Clock className="w-3 h-3 mr-2" />}
            Deploy Tarpit
          </Button>
        </div>
      </div>

      {/* Concept Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-amber-400/20 bg-amber-400/5">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Bug className="w-5 h-5 text-amber-400" />
              <CardTitle className="font-mono text-xs tracking-wider">HONEYPOTS</CardTitle>
              <Badge className="ml-auto font-mono text-[9px] bg-amber-400/10 text-amber-400 border-amber-400/20">{honeypotCount}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-[10px] text-muted-foreground leading-relaxed">
              Fake services that appear as real targets. When attackers interact, we capture their tools, techniques, and intent — all within the isolated mirror environment. They think they're in production. They're not.
            </p>
          </CardContent>
        </Card>

        <Card className="border-accent/20 bg-accent/5">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-accent" />
              <CardTitle className="font-mono text-xs tracking-wider">TARPITS</CardTitle>
              <Badge className="ml-auto font-mono text-[9px] bg-accent/10 text-accent border-accent/20">{tarpitCount}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-[10px] text-muted-foreground leading-relaxed">
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
        <CardContent>
          <div className="flex items-center justify-center gap-4 py-6">
            <div className="text-center">
              <div className="w-20 h-20 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-2">
                <Globe className="w-8 h-8 text-green-400" />
              </div>
              <span className="font-mono text-[9px] text-green-400">PRODUCTION</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Wifi className="w-4 h-4 text-primary animate-pulse" />
              <div className="w-24 h-px bg-primary/30" />
              <span className="font-mono text-[8px] text-muted-foreground">MIRROR SYNC</span>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-2">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <span className="font-mono text-[9px] text-primary">MIRROR ENV</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <div className="w-24 h-px bg-amber-400/30" />
              <span className="font-mono text-[8px] text-muted-foreground">REDIRECT</span>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center mb-2">
                <Bug className="w-8 h-8 text-amber-400" />
              </div>
              <span className="font-mono text-[9px] text-amber-400">HONEYPOT</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Clock className="w-4 h-4 text-accent" />
              <div className="w-24 h-px bg-accent/30" />
              <span className="font-mono text-[8px] text-muted-foreground">THROTTLE</span>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-2">
                <Clock className="w-8 h-8 text-accent" />
              </div>
              <span className="font-mono text-[9px] text-accent">TARPIT</span>
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
                <p className="font-mono text-xs text-muted-foreground">No deception sessions. Deploy a honeypot or tarpit to begin.</p>
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
                      <Clock className="w-4 h-4 text-accent" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-semibold text-foreground">{session.source_ip}</span>
                        <Badge variant="outline" className={`font-mono text-[8px] ${
                          session.session_type === 'honeypot' ? 'text-amber-400 border-amber-400/30' : 'text-accent border-accent/30'
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
                    <span className="font-mono text-[9px] text-muted-foreground">
                      {session.created_date ? format(new Date(session.created_date), 'HH:mm') : ''}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
}