import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Copy, Bug, Clock } from 'lucide-react';

export default function MirrorStatus({ honeypotSessions = [] }) {
  const [mirrorHealth, setMirrorHealth] = useState(98);

  useEffect(() => {
    const interval = setInterval(() => {
      setMirrorHealth(95 + Math.random() * 5);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const activeSessions = honeypotSessions.filter(s => s.status === 'active');

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase">
          MIRROR ENVIRONMENT
        </h3>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="font-mono text-[9px] text-primary">MIRRORED</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-secondary rounded-lg p-3 text-center">
          <Copy className="w-4 h-4 text-primary mx-auto mb-1" />
          <div className="font-mono text-lg font-bold text-foreground">{mirrorHealth.toFixed(1)}%</div>
          <div className="font-mono text-[8px] text-muted-foreground">MIRROR SYNC</div>
        </div>
        <div className="bg-secondary rounded-lg p-3 text-center">
          <Bug className="w-4 h-4 text-amber-400 mx-auto mb-1" />
          <div className="font-mono text-lg font-bold text-foreground">{activeSessions.length}</div>
          <div className="font-mono text-[8px] text-muted-foreground">HONEYPOTS</div>
        </div>
        <div className="bg-secondary rounded-lg p-3 text-center">
          <Clock className="w-4 h-4 text-accent mx-auto mb-1" />
          <div className="font-mono text-lg font-bold text-foreground">
            {honeypotSessions.filter(s => s.session_type === 'tarpit').length}
          </div>
          <div className="font-mono text-[8px] text-muted-foreground">TARPITS</div>
        </div>
      </div>

      {activeSessions.length > 0 ? (
        <div className="space-y-2">
          {activeSessions.slice(0, 3).map((session, i) => (
            <motion.div
              key={session.id || i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 px-3 py-2 rounded-md bg-secondary/50 border border-border/50"
            >
              <div className={`w-1.5 h-1.5 rounded-full ${session.session_type === 'tarpit' ? 'bg-accent' : 'bg-amber-400'} animate-pulse`} />
              <span className="font-mono text-[9px] text-muted-foreground flex-1">{session.source_ip}</span>
              <span className="font-mono text-[8px] text-muted-foreground">{session.interactions} interactions</span>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-3">
          <p className="font-mono text-[10px] text-muted-foreground">No active deception sessions</p>
        </div>
      )}
    </div>
  );
}