import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, ShieldAlert, Loader2, AlertTriangle } from 'lucide-react';

export default function IpAccessGate({ children }) {
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [userIp, setUserIp] = useState(null);
  const [warning, setWarning] = useState(null);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const response = await base44.functions.invoke('checkIpAccess', {});
      if (!response?.data) {
        setAllowed(false);
        setChecking(false);
        return;
      }

      const data = response.data;
      setUserIp(data.ip);
      setWarning(data.warning);
      setAllowed(data.allowed === true);
    } catch (error) {
      // On error, allow access (fail-open) — IP whitelist is optional
      console.warn('[IP Gate] checkIpAccess failed, allowing access:', error.message);
      setAllowed(true);
    } finally {
      setChecking(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="font-mono text-sm text-muted-foreground">Verifying access...</p>
        </motion.div>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full"
        >
          <Card className="border-red-500/30 bg-red-500/5">
            <CardHeader>
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-8 h-8 text-red-500" />
                <CardTitle className="font-mono text-lg text-red-500">ACCESS DENIED</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="font-mono text-xs text-muted-foreground">
                <p>Your IP address: <span className="text-foreground">{userIp}</span></p>
                <p className="mt-2">This system is restricted to authorized IP addresses only.</p>
              </div>
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="font-mono text-[10px] text-red-400">
                  Unauthorized access attempts are logged and monitored.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Show warning if configured but not critical
  if (warning) {
    console.log('[IP Gate Warning]', warning);
  }

  return children;
}