import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const APP_NAME = 'SIFT-AI Quantum Shield';

export default function TermsAcceptanceModal({ onComplete }) {
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    if (!accepted) {
      toast.error('You must accept the terms to continue');
      return;
    }

    setLoading(true);
    try {
      // Record acceptance in user's profile metadata
      const user = await base44.auth.me();
      await base44.auth.updateMe({
        ...user,
        terms_accepted: true,
        terms_accepted_date: new Date().toISOString(),
        terms_version: '2026-05-21'
      });

      toast.success('Terms accepted. Welcome to SIFT-AI!');
      onComplete?.();
    } catch (err) {
      toast.error('Failed to record acceptance: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-2xl"
        >
          <Card className="border-primary/30 bg-card">
            <CardHeader>
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-primary" />
                <div>
                  <CardTitle className="font-mono text-lg">Terms of Service Agreement</CardTitle>
                  <p className="font-mono text-xs text-muted-foreground mt-1">
                    Required for {APP_NAME}
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="max-h-96 overflow-y-auto pr-2 space-y-3 text-xs text-muted-foreground">
                <p className="font-mono text-xs text-primary mb-2">
                  LAST UPDATED: May 21, 2026
                </p>

                <section className="space-y-1">
                  <h3 className="font-mono text-xs font-bold text-foreground">1. Service Agreement</h3>
                  <p>
                    By using SIFT-AI Quantum Shield, you agree to our Terms of Service and Privacy Policy.
                    This is a professional cybersecurity platform for threat detection and security monitoring.
                  </p>
                </section>

                <section className="space-y-1">
                  <h3 className="font-mono text-xs font-bold text-foreground">2. Permitted Use</h3>
                  <p>
                    You agree to use this service only for lawful purposes. Unauthorized attacks,
                    reverse engineering, or circumvention of security measures are prohibited.
                  </p>
                </section>

                <section className="space-y-1">
                  <h3 className="font-mono text-xs font-bold text-foreground">3. Subscriptions & Refunds</h3>
                  <p>
                    Subscriptions are billed through Google Play. Refunds available within 48 hours
                    via Google Play, or contact support for exceptional circumstances.
                    See full Refund Policy for details.
                  </p>
                </section>

                <section className="space-y-1">
                  <h3 className="font-mono text-xs font-bold text-foreground">4. Data & Privacy</h3>
                  <p>
                    You retain ownership of your security data. We process it only to provide
                    the service. See Privacy Policy for complete data practices.
                  </p>
                </section>

                <section className="space-y-1">
                  <h3 className="font-mono text-xs font-bold text-foreground">5. No Warranty</h3>
                  <p>
                    Service provided "as is" without warranties. Cybersecurity tools are aids
                    and do not guarantee absolute protection against threats.
                  </p>
                </section>

                <section className="space-y-1">
                  <h3 className="font-mono text-xs font-bold text-foreground">6. Limitation of Liability</h3>
                  <p>
                    SIFT-AI is not liable for indirect or consequential damages from service use,
                    including data breaches or security incidents.
                  </p>
                </section>

                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 mt-4">
                  <p className="font-mono text-xs text-blue-400">
                    💡 This is a one-time agreement. You will not be asked again unless terms change materially.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 pt-4 border-t border-border">
                <Checkbox
                  id="accept-terms"
                  checked={accepted}
                  onCheckedChange={setAccepted}
                  className="mt-0.5"
                />
                <label
                  htmlFor="accept-terms"
                  className="text-xs text-muted-foreground cursor-pointer select-none"
                >
                  <span className="font-mono text-xs">
                    I have read and agree to the{' '}
                    <a href="/terms" target="_blank" className="text-primary underline">
                      Terms of Service
                    </a>
                    ,{' '}
                    <a href="/privacy-policy" target="_blank" className="text-primary underline">
                      Privacy Policy
                    </a>
                    , and{' '}
                    <a href="/refund-policy" target="_blank" className="text-primary underline">
                      Refund Policy
                    </a>
                  </span>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => window.close()}
                  className="flex-1 font-mono text-xs"
                  disabled={loading}
                >
                  <X className="w-4 h-4" /> Cancel
                </Button>
                <Button
                  onClick={handleAccept}
                  disabled={!accepted || loading}
                  className="flex-1 font-mono text-xs gap-2"
                >
                  {loading ? (
                    <><span className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" /> Processing...</>
                  ) : (
                    <><Check className="w-4 h-4" /> Accept & Continue</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}