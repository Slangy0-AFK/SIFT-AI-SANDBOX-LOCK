import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, Hash, Circle, Grid3x3, Clock, Atom } from 'lucide-react';

const STEPS = [
  {
    id: 'base1',
    title: 'BASE 1 — Unary',
    icon: Hash,
    color: 'text-blue-400',
    border: 'border-blue-400/30',
    bg: 'bg-blue-400/5',
    description: 'All values reduced to singular tally marks. Creates the foundational counting layer that strips complexity to its purest form.',
    detail: 'Input is decomposed into unary representation (1, 11, 111...). This creates a deterministic but computationally expensive verification layer.',
    example: '42 → 111111111111111111111111111111111111111111',
  },
  {
    id: 'base0',
    title: 'BASE 0 — Void State',
    icon: Circle,
    color: 'text-purple-400',
    border: 'border-purple-400/30',
    bg: 'bg-purple-400/5',
    description: 'The null-state transformation. A mathematical paradox where all values collapse through division by zero into undefined states.',
    detail: 'Creates an asymptotic boundary condition. The system uses this as an entropy injection point — undefined states become seeds for cryptographic noise.',
    example: 'f(x) → lim(x→0) = ∅ → entropy seed',
  },
  {
    id: 'base12',
    title: 'BASE 12 — Duodecimal',
    icon: Grid3x3,
    color: 'text-cyan-400',
    border: 'border-cyan-400/30',
    bg: 'bg-cyan-400/5',
    description: 'Conversion to duodecimal (base-12). Leverages the superior divisibility of 12 for factorization-based verification.',
    detail: '12 has factors {1,2,3,4,6,12} making it ideal for cyclic group operations. Each value is mapped through modular arithmetic chains.',
    example: '255₁₀ → 193₁₂ → factor chain verification',
  },
  {
    id: 'base60',
    title: 'BASE 60 — Sexagesimal',
    icon: Clock,
    color: 'text-emerald-400',
    border: 'border-emerald-400/30',
    bg: 'bg-emerald-400/5',
    description: 'Ancient Babylonian base-60 encoding. Provides 60 unique symbols per position, massively expanding the verification keyspace.',
    detail: 'Sexagesimal is highly composite (2²×3×5). This step creates temporal-mathematical binding where values are encoded as time-like coordinates.',
    example: '3661₁₀ → 1:1:1₆₀ → spatiotemporal hash',
  },
  {
    id: 'qrng',
    title: 'QRNG — Quantum Random',
    icon: Atom,
    color: 'text-primary',
    border: 'border-primary/30',
    bg: 'bg-primary/5',
    description: 'Final stage: Quantum Random Number Generator creates truly random verification tokens that are physically impossible to predict.',
    detail: 'Quantum measurement collapse produces numbers with genuine randomness (not pseudo-random). Combined with the chain, creates an unforgeable signature.',
    example: 'chain_hash ⊕ QRNG[cycle] → final verification token',
  },
];

export default function BaseChain() {
  const [activeStep, setActiveStep] = useState(null);
  const [liveValues, setLiveValues] = useState({});

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveValues({
        base1: '1'.repeat(Math.floor(Math.random() * 20) + 5),
        base0: `∅.${Math.random().toFixed(12).slice(2)}`,
        base12: Math.floor(Math.random() * 1000).toString(12).toUpperCase(),
        base60: `${Math.floor(Math.random() * 60)}:${Math.floor(Math.random() * 60)}:${Math.floor(Math.random() * 60)}`,
        qrng: Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-mono text-xl font-bold tracking-wider text-foreground">BASE CHAIN PIPELINE</h1>
        <p className="font-mono text-xs text-muted-foreground tracking-widest mt-1">
          MULTI-BASE CRYPTOGRAPHIC VERIFICATION CHAIN
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const isActive = activeStep === i;
          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card
                className={`cursor-pointer transition-all duration-300 border ${isActive ? step.border : 'border-border'} ${isActive ? step.bg : 'bg-card'} hover:border-primary/20`}
                onClick={() => setActiveStep(isActive ? null : i)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${step.bg} border ${step.border}`}>
                        <Icon className={`w-5 h-5 ${step.color}`} />
                      </div>
                      <div>
                        <CardTitle className="font-mono text-sm tracking-wider">{step.title}</CardTitle>
                        <p className="font-mono text-xs text-muted-foreground mt-0.5">{step.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`font-mono text-xs ${step.color} border ${step.border}`}>
                        STEP {i + 1}
                      </Badge>
                      <Zap className={`w-3 h-3 ${step.color}`} />
                    </div>
                  </div>
                </CardHeader>
                {isActive && (
                  <CardContent>
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-3 pt-2"
                    >
                      <p className="font-mono text-xs text-muted-foreground leading-relaxed">{step.detail}</p>
                      <div className="bg-secondary rounded-lg p-3">
                        <div className="font-mono text-xs text-muted-foreground mb-1">EXAMPLE:</div>
                        <code className="font-mono text-xs text-primary">{step.example}</code>
                      </div>
                      {liveValues[step.id] && (
                        <div className="bg-background rounded-lg p-3 border border-border">
                          <div className="font-mono text-xs text-muted-foreground mb-1">LIVE VALUE:</div>
                          <code className={`font-mono text-xs ${step.color} break-all`}>{liveValues[step.id]}</code>
                        </div>
                      )}
                    </motion.div>
                  </CardContent>
                )}
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}