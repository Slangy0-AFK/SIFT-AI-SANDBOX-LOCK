import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, X, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function CaptchaModal({ isOpen, onSuccess, onClose }) {
  const [captchaData, setCaptchaData] = useState(null);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      generateCaptcha();
      setAnswer('');
    }
  }, [isOpen]);

  const generateCaptcha = async () => {
    setGenerating(true);
    try {
      const response = await base44.functions.invoke('generateCaptcha', {});
      setCaptchaData(response.data);
    } catch (error) {
      toast.error('Failed to load verification challenge');
      onClose();
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async () => {
    if (!answer || !captchaData) return;
    
    setLoading(true);
    try {
      // Return the token and answer for the checkout function to verify
      onSuccess(captchaData.captcha_token, answer);
    } catch (error) {
      toast.error('Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const renderNumberVisual = (lines, color = 'text-primary') => {
    return (
      <div className="font-mono text-xs leading-none">
        {lines.map((line, i) => (
          <div key={i} className={color}>
            {line.split('').map((char, j) => (
              <span key={j} className={char === '#' ? 'opacity-100' : 'opacity-10'}>
                {char === '#' ? '█' : '░'}
              </span>
            ))}
          </div>
        ))}
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
          >
            <div className="w-full max-w-md mx-4 pointer-events-auto">
              <Card className="border-2 border-primary/30 bg-card">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-mono text-sm tracking-wider flex items-center gap-2">
                      <Shield className="w-4 h-4 text-primary" />
                      HUMAN VERIFICATION
                    </CardTitle>
                    <button
                      onClick={onClose}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {generating ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : captchaData ? (
                    <>
                      <div className="text-center space-y-2">
                        <p className="font-mono text-xs text-muted-foreground">
                          Solve this challenge to continue
                        </p>
                        
                        {/* Visual challenge display */}
                        <div className="flex items-center justify-center gap-4 py-4 bg-secondary/30 rounded-lg border border-border">
                          {renderNumberVisual(captchaData.challenge.num1_visual)}
                          <span className="font-mono text-2xl text-primary font-bold">+</span>
                          {renderNumberVisual(captchaData.challenge.num2_visual)}
                          <span className="font-mono text-2xl text-primary font-bold">=</span>
                          <span className="font-mono text-2xl text-primary font-bold">?</span>
                        </div>

                        <p className="font-mono text-sm text-primary">
                          {captchaData.challenge.instruction}
                        </p>
                      </div>

                      <div className="space-y-3">
                        <Input
                          type="number"
                          placeholder="Enter your answer"
                          value={answer}
                          onChange={(e) => setAnswer(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                          className="font-mono text-center text-lg"
                          autoFocus
                        />
                        
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={generateCaptcha}
                            className="flex-1"
                            disabled={loading}
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            New Challenge
                          </Button>
                          <Button
                            onClick={handleSubmit}
                            className="flex-1"
                            disabled={!answer || loading}
                          >
                            {loading ? 'Verifying...' : 'Verify'}
                          </Button>
                        </div>

                        <p className="font-mono text-xs text-muted-foreground text-center">
                          Challenge expires in {Math.floor(captchaData.expires_in / 60)} minutes
                        </p>
                      </div>
                    </>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}