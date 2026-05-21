import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, CheckCircle, Smartphone, Monitor, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [showPrompt, setShowPrompt] = useState(true);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
      setShowPrompt(false);
      return;
    }

    // Listen for install prompt
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setInstalled(true);
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    } else {
      // Manual install instructions for browsers without prompt
      alert('To install this app:\n\n1. Click the share icon in your browser\n2. Select "Add to Home Screen"\n3. Tap "Add" to install');
    }
  };

  if (installed || !showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96"
      >
        <Card className="border-primary/30 bg-card/95 backdrop-blur-sm shadow-2xl">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                  <Download className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-mono text-sm font-bold text-foreground">
                    Install AEGIS Quantum Shield
                  </h3>
                  <p className="font-mono text-[10px] text-muted-foreground mt-1 leading-relaxed">
                    Get always-on protection with native app experience. Works offline, instant access, real-time alerts.
                  </p>
                  
                  <div className="flex gap-2 mt-3">
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-secondary/50 border border-border">
                      <Smartphone className="w-3 h-3 text-primary" />
                      <span className="font-mono text-[8px] text-muted-foreground">Mobile</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-secondary/50 border border-border">
                      <Monitor className="w-3 h-3 text-primary" />
                      <span className="font-mono text-[8px] text-muted-foreground">Desktop</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-secondary/50 border border-border">
                      <Zap className="w-3 h-3 text-primary" />
                      <span className="font-mono text-[8px] text-muted-foreground">Offline</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
            
            <Button
              className="w-full font-mono text-xs"
              onClick={handleInstall}
            >
              <Download className="w-3 h-3 mr-2" /> Install App Now
            </Button>
            
            <div className="flex items-center gap-2 pt-2 border-t border-border">
              <CheckCircle className="w-3 h-3 text-green-400" />
              <span className="font-mono text-[9px] text-muted-foreground">
                Free · No App Store Required · Secure
              </span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}