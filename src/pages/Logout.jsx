import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Shield, CheckCircle, Lock, Wifi, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Logout() {
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(true);

  useEffect(() => {
    const performLogout = async () => {
      try {
        // Clear local storage and session storage
        localStorage.clear();
        sessionStorage.clear();
        
        // Stop background services
        window.dispatchEvent(new CustomEvent('before-logout'));
        
        // Use SDK logout which handles token cleanup
        await base44.auth.logout('/');
      } catch (error) {
        console.error('Logout error:', error);
        // Force redirect even if SDK logout fails
        window.location.href = '/';
      }
    };
    
    performLogout();
  }, []);

  if (loggingOut) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="font-mono text-sm text-muted-foreground">Logging out securely...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-md w-full text-center space-y-8"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-3">
          <div className="relative">
            <Shield className="w-16 h-16 text-primary" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-pulse" />
          </div>
        </div>

        {/* Main Message */}
        <div className="space-y-4">
          <h1 className="font-mono text-2xl font-bold text-foreground tracking-wider">
            LOGGED OUT
          </h1>
          
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-center gap-2 text-green-400">
              <CheckCircle className="w-6 h-6" />
              <span className="font-mono text-sm font-semibold">YOU'RE STILL PROTECTED</span>
            </div>
            
            <p className="font-mono text-xs text-muted-foreground leading-relaxed">
              Your devices continue to be monitored by our autonomous security systems. 
              Background threat detection and zero-day anomaly scanning remain active.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-4">
              <div className="bg-secondary/30 rounded-lg p-3">
                <Lock className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="font-mono text-xs text-muted-foreground">Encrypted Data</p>
              </div>
              <div className="bg-secondary/30 rounded-lg p-3">
                <Wifi className="w-5 h-5 text-green-400 mx-auto mb-1" />
                <p className="font-mono text-xs text-muted-foreground">Active Monitoring</p>
              </div>
            </div>
          </div>

          <Button
            onClick={() => navigate('/')}
            variant="outline"
            size="lg"
            className="font-mono text-sm px-8 w-full"
          >
            RETURN TO HOME
          </Button>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center justify-center gap-2 px-4 py-2 bg-secondary/20 rounded-lg">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="font-mono text-xs text-muted-foreground tracking-wider">
            SECURITY SYSTEMS ONLINE
          </span>
        </div>
      </motion.div>
    </div>
  );
}