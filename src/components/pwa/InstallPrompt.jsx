import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, CheckCircle, Smartphone, Monitor, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
      return;
    }

    // Listen for install prompt
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Show prompt after 3 seconds if not dismissed before
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
      
      return () => clearTimeout(timer);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Check if user dismissed before
    const dismissed = localStorage.getItem('install-prompt-dismissed');
    if (dismissed && Date.now() - parseInt(dismissed) < 7 * 24 * 60 * 60 * 1000) {
      // Don't show if dismissed within last 7 days
      setShowPrompt(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setInstalled(true);
      setShowPrompt(false);
      localStorage.removeItem('install-prompt-dismissed');
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('install-prompt-dismissed', Date.now().toString());
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
              <button
                onClick={handleDismiss}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex gap-2">
              <Button
                className="flex-1 font-mono text-xs"
                onClick={handleInstall}
              >
                <Download className="w-3 h-3 mr-2" /> Install Now
              </Button>
              <Button
                variant="outline"
                className="font-mono text-xs"
                onClick={handleDismiss}
              >
                Later
              </Button>
            </div>
            
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