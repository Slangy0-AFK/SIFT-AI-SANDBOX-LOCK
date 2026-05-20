import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Loader2 } from 'lucide-react';

const CHAIN_STEPS = [
  { id: 'base1', label: 'BASE 1', sublabel: 'Unary', color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/30' },
  { id: 'base0', label: 'BASE 0', sublabel: 'Void State', color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/30' },
  { id: 'base12', label: 'BASE 12', sublabel: 'Duodecimal', color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/30' },
  { id: 'base60', label: 'BASE 60', sublabel: 'Sexagesimal', color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30' },
  { id: 'pi', label: 'π', sublabel: 'Irrational Key', color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/30' },
  { id: 'qrng', label: 'QRNG', sublabel: 'Quantum RNG', color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/30' },
];

export default function BaseChainVisual({ compact = false }) {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep(prev => (prev + 1) % (CHAIN_STEPS.length + 1));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`flex items-center ${compact ? 'gap-2' : 'gap-3'} flex-wrap justify-center`}>
      {CHAIN_STEPS.map((step, i) => (
        <React.Fragment key={step.id}>
          <motion.div
            animate={{
              scale: activeStep === i ? 1.05 : 1,
              opacity: activeStep >= i || activeStep === CHAIN_STEPS.length ? 1 : 0.4,
            }}
            transition={{ duration: 0.3 }}
            className={`relative ${compact ? 'px-3 py-2' : 'px-4 py-3'} rounded-lg border ${step.border} ${step.bg} transition-all`}
          >
            <div className={`font-mono ${compact ? 'text-[10px]' : 'text-xs'} font-bold ${step.color}`}>
              {step.label}
            </div>
            {!compact && (
              <div className="font-mono text-[9px] text-muted-foreground mt-0.5">{step.sublabel}</div>
            )}
            {activeStep === i && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1"
              >
                <Loader2 className={`w-3 h-3 ${step.color} animate-spin`} />
              </motion.div>
            )}
            {activeStep > i && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1"
              >
                <Check className="w-3 h-3 text-green-400" />
              </motion.div>
            )}
          </motion.div>
          {i < CHAIN_STEPS.length - 1 && (
            <ArrowRight className={`w-3 h-3 ${activeStep > i ? 'text-primary' : 'text-muted-foreground/30'} transition-colors`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}