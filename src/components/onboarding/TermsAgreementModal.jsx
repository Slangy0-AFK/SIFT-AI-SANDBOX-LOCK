import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, FileText, CheckCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const STORAGE_KEY = 'sift-ai_terms_accepted';

export default function TermsAgreementModal() {
  const [visible, setVisible] = useState(false);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    const checkAcceptance = async () => {
      const localAccepted = localStorage.getItem(STORAGE_KEY);
      if (localAccepted) return;
      try {
        const { base44 } = await import('@/api/base44Client');
        const user = await base44.auth.me();
        if (user?.terms_accepted) {
          localStorage.setItem(STORAGE_KEY, user.terms_accepted_date || new Date().toISOString());
          return;
        }
        setVisible(true);
      } catch (err) {
        setVisible(true);
      }
    };
    checkAcceptance();
  }, []);

  const handleAccept = async () => {
    if (!agreed) return;
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    setVisible(false);
    try {
      const { base44 } = await import('@/api/base44Client');
      const user = await base44.auth.me();
      if (user) {
        await base44.auth.updateMe({
          ...user,
          terms_accepted: true,
          terms_accepted_date: new Date().toISOString()
        });
      }
    } catch (e) {
      // ignore
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-card border border-primary/30 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="bg-primary/10 border-b border-primary/20 px-6 py-5 flex items-center gap-3">
              <div className="relative">
                <Shield className="w-8 h-8 text-primary" />
                <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
              </div>
              <div>
                <h2 className="font-mono text-sm font-bold text-foreground tracking-wider">SIFT-AI QUANTUM SHIELD</h2>
                <p className="font-mono text-xs text-muted-foreground tracking-widest">TERMS OF SERVICE AGREEMENT</p>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              <p className="font-mono text-[11px] text-muted-foreground leading-relaxed">
                Before accessing the SIFT-AI security platform, please review and agree to our Terms of Service and Privacy Policy.
              </p>

              {/* Key points */}
              <div className="space-y-2">
                {[
                  'This platform is for authorized security monitoring only',
                  'All activity is logged and subject to audit',
                  'Misuse may result in immediate account termination',
                  'Your data is encrypted and never sold to third parties',
                ].map((point, i) => (
                  <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-secondary/40 border border-border/50">
                    <CheckCircle className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                    <span className="font-mono text-xs text-foreground leading-relaxed">{point}</span>
                  </div>
                ))}
              </div>

              {/* Links */}
              <div className="flex gap-3">
                <Link to="/terms" onClick={() => {}} className="flex items-center gap-1.5 font-mono text-xs text-primary hover:underline">
                  <FileText className="w-3 h-3" /> Terms of Service <ExternalLink className="w-2.5 h-2.5" />
                </Link>
                <Link to="/privacy-policy" className="flex items-center gap-1.5 font-mono text-xs text-primary hover:underline">
                  <Shield className="w-3 h-3" /> Privacy Policy <ExternalLink className="w-2.5 h-2.5" />
                </Link>
              </div>

              {/* Checkbox */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <div
                  onClick={() => setAgreed(v => !v)}
                  className={`mt-0.5 w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                    agreed ? 'bg-primary border-primary' : 'border-border bg-background group-hover:border-primary/50'
                  }`}
                >
                  {agreed && <CheckCircle className="w-3 h-3 text-primary-foreground" />}
                </div>
                <span className="font-mono text-xs text-muted-foreground leading-relaxed">
                  I have read and agree to the <span className="text-foreground">Terms of Service</span> and <span className="text-foreground">Privacy Policy</span>. I confirm I am authorized to use this platform.
                </span>
              </label>
            </div>

            {/* Footer */}
            <div className="px-6 pb-6">
              <Button
                className="w-full font-mono text-xs"
                disabled={!agreed}
                onClick={handleAccept}
              >
                <Shield className="w-3.5 h-3.5 mr-2" />
                ACCEPT & ENTER SIFT-AI
              </Button>
              {!agreed && (
                <p className="font-mono text-xs text-muted-foreground text-center mt-2">
                  You must agree to the terms to continue
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}