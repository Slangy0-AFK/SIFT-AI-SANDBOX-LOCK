import React from 'react';
import { motion } from 'framer-motion';
import { X, CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function WelcomeModal({ onClose }) {
  const features = [
    { title: 'Real-time Threat Monitoring', desc: 'Track threats as they happen', icon: CheckCircle },
    { title: 'Quantum Verification', desc: '6-step Base Chain pipeline', icon: CheckCircle },
    { title: 'AI Detection', desc: 'Paradox lock distinguishes humans from bots', icon: CheckCircle },
    { title: 'Automated Response', desc: 'Workflow engine for instant action', icon: CheckCircle },
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative bg-card border border-border rounded-2xl p-6 max-w-lg w-full mx-4"
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded hover:bg-secondary">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="relative">
              <CheckCircle className="w-12 h-12 text-primary" />
              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            </div>
          </div>
          <h2 className="font-mono text-lg font-bold text-foreground">WELCOME TO AEGIS</h2>
          <p className="font-mono text-[10px] text-muted-foreground mt-1">
            Your quantum-powered security shield is now active
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {features.map((f, i) => (
            <div key={i} className="bg-secondary/30 border border-border rounded-lg p-3">
              <f.icon className="w-5 h-5 text-primary mb-2" />
              <p className="font-mono text-[10px] font-semibold text-foreground">{f.title}</p>
              <p className="font-mono text-[8px] text-muted-foreground mt-0.5">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 mb-4">
          <Badge className="font-mono text-[8px] bg-green-400/10 text-green-400 border-green-400/20 border flex-1 justify-center">
            SYSTEM OPERATIONAL
          </Badge>
          <Badge className="font-mono text-[8px] bg-primary/10 text-primary border-primary/20 border flex-1 justify-center">
            ALL MODULES ACTIVE
          </Badge>
        </div>

        <Button
          onClick={onClose}
          className="w-full font-mono text-sm bg-primary hover:bg-primary/80"
        >
          ENTER COMMAND CENTER <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </motion.div>
    </div>
  );
}