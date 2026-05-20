import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function QRNGCycleDisplay() {
  const [values, setValues] = useState([0, 0, 0]);
  const [activeCycle, setActiveCycle] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setValues(prev => prev.map(() => Math.random()));
      setActiveCycle(prev => (prev + 1) % 4);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase mb-4">
        QRNG THREAT CYCLES
      </h3>
      <div className="space-y-3">
        {[0, 1, 2].map((cycle) => (
          <div key={cycle} className="flex items-center gap-3">
            <div className={`font-mono text-[10px] w-16 ${activeCycle > cycle ? 'text-green-400' : activeCycle === cycle ? 'text-primary' : 'text-muted-foreground'}`}>
              CYCLE {cycle + 1}
            </div>
            <div className="flex-1 h-8 bg-secondary rounded-md overflow-hidden relative">
              <motion.div
                animate={{ width: `${activeCycle > cycle ? 100 : activeCycle === cycle ? values[cycle] * 100 : 0}%` }}
                transition={{ duration: 0.3 }}
                className={`h-full rounded-md ${
                  activeCycle > cycle ? 'bg-green-500/30' : activeCycle === cycle ? 'bg-primary/30' : 'bg-transparent'
                }`}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`font-mono text-[10px] font-bold ${
                  activeCycle > cycle ? 'text-green-400' : activeCycle === cycle ? 'text-primary' : 'text-muted-foreground/40'
                }`}>
                  {activeCycle > cycle ? 'COMPLETE' : activeCycle === cycle ? values[cycle].toFixed(8) : 'PENDING'}
                </span>
              </div>
            </div>
            <div className={`w-2 h-2 rounded-full ${
              activeCycle > cycle ? 'bg-green-500' : activeCycle === cycle ? 'bg-primary animate-pulse' : 'bg-muted-foreground/20'
            }`} />
          </div>
        ))}
      </div>
      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
        <span className="font-mono text-[9px] text-muted-foreground">
          {activeCycle === 3 ? 'THREAT NEUTRALIZED' : `Processing cycle ${activeCycle + 1} of 3...`}
        </span>
        <span className={`font-mono text-[9px] font-bold ${activeCycle === 3 ? 'text-destructive' : 'text-primary'}`}>
          {activeCycle === 3 ? 'LOCKED / DESTROYED' : 'ACTIVE'}
        </span>
      </div>
    </div>
  );
}