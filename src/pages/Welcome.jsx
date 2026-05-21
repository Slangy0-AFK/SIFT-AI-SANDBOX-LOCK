import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Zap, Lock, Bug, Skull, CheckCircle, ArrowRight, LogOut } from 'lucide-react';
import DeviceScanner from '@/components/security/DeviceScanner.jsx';

const features = [
  { icon: Shield, title: 'Base Chain Pipeline', desc: '6-step quantum verification', color: 'text-primary' },
  { icon: Lock, title: 'Paradox Lock', desc: 'Human vs AI detection', color: 'text-accent' },
  { icon: Zap, title: 'QRNG Cycles', desc: 'True random destruction', color: 'text-amber-400' },
  { icon: Bug, title: 'Honeypots', desc: 'Attacker intelligence', color: 'text-green-400' },
];

const steps = [
  { title: 'Explore Dashboard', desc: 'Monitor threats in real-time', icon: Shield },
  { title: 'Configure Firewall', desc: 'Set up custom security rules', icon: Lock },
  { title: 'Review Threats', desc: 'Analyze detected threats', icon: Skull },
  { title: 'Run Device Scan', desc: 'Check your device for threats', icon: Bug },
];

export default function Welcome() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);

  const handleGetStarted = () => {
    navigate('/dashboard');
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl w-full text-center space-y-8"
        >
          {/* Logo */}
          <div className="flex items-center justify-center gap-3">
            <div className="relative">
              <Shield className="w-16 h-16 text-primary" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-pulse" />
            </div>
            <div className="text-left">
              <h1 className="font-mono text-3xl font-bold text-foreground tracking-wider">AEGIS</h1>
              <p className="font-mono text-[10px] text-muted-foreground tracking-widest">QUANTUM SHIELD</p>
            </div>
          </div>

          {/* Tagline */}
          <div className="space-y-2">
            <h2 className="font-mono text-xl md:text-2xl font-bold text-foreground">
              NEXT-GENERATION SECURITY
            </h2>
            <p className="font-mono text-sm text-muted-foreground max-w-xl mx-auto">
              Quantum-powered threat detection with paradox-based verification and autonomous defense
            </p>
          </div>

          {/* Features grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="bg-card border border-border rounded-xl p-4"
              >
                <f.icon className={`w-8 h-8 ${f.color} mx-auto mb-2`} />
                <p className="font-mono text-[10px] font-bold text-foreground">{f.title}</p>
                <p className="font-mono text-[9px] text-muted-foreground mt-0.5">{f.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              onClick={handleGetStarted}
              size="lg"
              className="font-mono text-sm px-8 bg-primary hover:bg-primary/80"
            >
              ENTER COMMAND CENTER <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              onClick={() => base44.auth.logout()}
              variant="outline"
              size="lg"
              className="font-mono text-sm px-8"
            >
              <LogOut className="w-4 h-4 mr-2" /> LOGOUT
            </Button>
          </div>

          {/* Device Scanner */}
          <div className="max-w-xl mx-auto w-full">
            <DeviceScanner />
          </div>

          {/* Quick start steps */}
          <Card className="border-border bg-secondary/30">
            <CardHeader>
              <CardTitle className="font-mono text-xs tracking-wider">QUICK START GUIDE</CardTitle>
              <CardDescription className="font-mono text-[9px]">Get started in 4 steps</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {steps.map((step, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      scale: i === currentStep ? 1.05 : 1,
                      opacity: i === currentStep ? 1 : 0.7,
                    }}
                    className={`p-3 rounded-lg border transition-all ${
                      i === currentStep
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-card'
                    }`}
                  >
                    <step.icon className={`w-5 h-5 ${i === currentStep ? 'text-primary' : 'text-muted-foreground'} mx-auto mb-2`} />
                    <p className="font-mono text-[10px] font-semibold text-foreground">{step.title}</p>
                    <p className="font-mono text-[8px] text-muted-foreground mt-0.5">{step.desc}</p>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="border-t border-border p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <p className="font-mono text-[9px] text-muted-foreground">
            © 2026 AEGIS Quantum Shield. All rights reserved.
          </p>
          <div className="flex items-center gap-2">
            <Badge className="font-mono text-[8px] bg-green-400/10 text-green-400 border-green-400/20 border">
              <CheckCircle className="w-3 h-3 mr-1" /> SYSTEM OPERATIONAL
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}