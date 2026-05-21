import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, CheckCircle, Smartphone, Monitor, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [showPrompt, setShowPrompt] = useState(true);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    // Only show on Android devices
    const isAndroid = /Android/i.test(navigator.userAgent);
    if (!isAndroid) {
      setShowPrompt(false);
      return;
    }

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
      // Show manual instructions modal
      setShowInstructions(true);
    }
  };

  const closeInstructions = () => setShowInstructions(false);

  if (installed || !showPrompt) return null;

  return (
    <>
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

      {/* Manual Installation Instructions Modal */}
      {showInstructions && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="max-w-md w-full"
          >
            <Card className="border-primary/30 bg-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-mono text-sm tracking-wider">INSTALL INSTRUCTIONS</CardTitle>
                  <button onClick={closeInstructions} className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="font-mono text-[10px] font-bold text-primary">1</span>
                    </div>
                    <div>
                      <p className="font-mono text-xs font-semibold text-foreground">Tap the Share button</p>
                      <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
                        Look for the square with arrow icon (📤) in Safari or your browser toolbar
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="font-mono text-[10px] font-bold text-primary">2</span>
                    </div>
                    <div>
                      <p className="font-mono text-xs font-semibold text-foreground">Select "Add to Home Screen"</p>
                      <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
                        Scroll down in the share menu and tap this option
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="font-mono text-[10px] font-bold text-primary">3</span>
                    </div>
                    <div>
                      <p className="font-mono text-xs font-semibold text-foreground">Tap "Add"</p>
                      <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
                        Confirm and the app will appear on your home screen
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="w-3 h-3 text-green-400" />
                    <span className="font-mono text-[9px] text-muted-foreground">
                      Works on iPhone, iPad, Android, and desktop browsers
                    </span>
                  </div>
                  <Button className="w-full font-mono text-xs" onClick={closeInstructions}>
                    Got It
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}
    </>
  );
}