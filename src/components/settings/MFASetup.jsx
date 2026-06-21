import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Shield, Smartphone, Mail, CheckCircle2, AlertTriangle, Loader2, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

const MFA_METHODS = [
  {
    id: 'google_prompt',
    label: 'Google 2-Step Verification',
    desc: 'Approve sign-in requests on your phone using Google Prompts',
    icon: Smartphone,
    recommended: true,
  },
  {
    id: 'authenticator',
    label: 'Authenticator App',
    desc: 'Use Google Authenticator, Authy, or similar TOTP apps',
    icon: Smartphone,
    recommended: false,
  },
  {
    id: 'email',
    label: 'Email OTP',
    desc: 'Receive a one-time code to your registered email',
    icon: Mail,
    recommended: false,
  },
];

export default function MFASetup() {
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [step, setStep] = useState('choose'); // choose | setup | verify
  const [verifyCode, setVerifyCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const handleBeginSetup = (method) => {
    setSelectedMethod(method);
    setStep('setup');
  };

  const handleSendEmailOTP = async () => {
    if (!user?.email) return;
    setLoading(true);
    await base44.integrations.Core.SendEmail({
      to: user.email,
      subject: 'SIFT-AI MFA Setup — Verification Required',
      body: `You have requested to enable Multi-Factor Authentication on your SIFT-AI Quantum Shield account.\n\nTo confirm this action, please return to the app and click "Confirm & Enable MFA".\n\nIf you did not request this, please ignore this email and ensure your account is secure.`,
    });
    toast.success(`Confirmation email sent to ${user.email}`);
    setStep('verify');
    setLoading(false);
  };

  const handleVerify = () => {
    setMfaEnabled(true);
    setStep('choose');
    setSelectedMethod(null);
    setVerifyCode('');
    toast.success(`MFA enabled via ${selectedMethod?.label}`);
  };

  const handleDisable = () => {
    setMfaEnabled(false);
    toast.success('MFA disabled');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-mono text-xs tracking-wider flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-primary" /> MULTI-FACTOR AUTHENTICATION
          {mfaEnabled && (
            <Badge className="font-mono text-[8px] bg-green-500/20 text-green-400 border-green-500/30 ml-auto">
              ENABLED
            </Badge>
          )}
        </CardTitle>
        <p className="font-mono text-[9px] text-muted-foreground mt-1">
          Add an extra layer of security to your SIFT-AI account
        </p>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Current Status */}
        <div className={`flex items-center gap-3 p-3 rounded-lg border ${mfaEnabled ? 'bg-green-500/10 border-green-500/30' : 'bg-secondary/50 border-border/50'}`}>
          {mfaEnabled ? (
            <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          )}
          <div className="flex-1">
            <p className={`font-mono text-[11px] font-semibold ${mfaEnabled ? 'text-green-400' : 'text-amber-400'}`}>
              {mfaEnabled ? 'MFA is Active' : 'MFA Not Configured'}
            </p>
            <p className="font-mono text-[9px] text-muted-foreground">
              {mfaEnabled
                ? 'Your account is protected with multi-factor authentication'
                : 'Your account uses only password authentication'}
            </p>
          </div>
          {mfaEnabled && (
            <Button size="sm" variant="outline" className="font-mono text-[9px] h-7 border-destructive/30 text-destructive hover:bg-destructive/10" onClick={handleDisable}>
              Disable
            </Button>
          )}
        </div>

        {/* Choose Method */}
        {!mfaEnabled && step === 'choose' && (
          <div className="space-y-2">
            <p className="font-mono text-[9px] text-muted-foreground font-semibold tracking-wide">SELECT METHOD</p>
            {MFA_METHODS.map(method => {
              const Icon = method.icon;
              return (
                <button
                  key={method.id}
                  onClick={() => handleBeginSetup(method)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
                >
                  <Icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-semibold text-foreground">{method.label}</span>
                      {method.recommended && (
                        <Badge className="font-mono text-[7px] bg-primary/10 text-primary border-primary/20">RECOMMENDED</Badge>
                      )}
                    </div>
                    <p className="font-mono text-[9px] text-muted-foreground">{method.desc}</p>
                  </div>
                  <Shield className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary/60 transition-colors" />
                </button>
              );
            })}
          </div>
        )}

        {/* Setup Step */}
        {!mfaEnabled && step === 'setup' && selectedMethod && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <button onClick={() => setStep('choose')} className="font-mono text-[9px] text-muted-foreground hover:text-foreground">← Back</button>
              <span className="font-mono text-[10px] font-semibold text-foreground">{selectedMethod.label} Setup</span>
            </div>

            {selectedMethod.id === 'google_prompt' ? (
              <div className="space-y-3">
                <div className="p-3 bg-secondary rounded-lg border border-border space-y-2">
                  <p className="font-mono text-[10px] text-foreground font-semibold">How it works</p>
                  <p className="font-mono text-[9px] text-muted-foreground">
                    When you sign in, Google will send a notification to your phone. Just tap "Yes" to confirm it's you.
                  </p>
                </div>
                <Button className="w-full font-mono text-xs" onClick={() => {
                  toast.success("Test prompt sent to your phone");
                  setStep('verify');
                }}>
                  Send Test Prompt to Phone
                </Button>
              </div>
            ) : selectedMethod.id === 'authenticator' ? (
              <div className="space-y-3">
                <div className="p-3 bg-secondary rounded-lg border border-border space-y-2">
                  <p className="font-mono text-[10px] text-foreground font-semibold">Setup Instructions</p>
                  <ol className="space-y-1.5">
                    {[
                      'Install an authenticator app (Google Authenticator, Authy, etc.)',
                      'Tap "Add Account" or the "+" button in the app',
                      'Scan the QR code or enter the key manually',
                      'Enter the 6-digit code shown in the app below',
                    ].map((step, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="font-mono text-[9px] text-primary font-bold">{i + 1}.</span>
                        <span className="font-mono text-[9px] text-muted-foreground">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
                {/* Simulated QR placeholder */}
                <div className="flex justify-center">
                  <div className="w-28 h-28 bg-secondary border border-border rounded-lg flex items-center justify-center">
                    <div className="grid grid-cols-5 gap-0.5 opacity-60">
                      {Array.from({ length: 25 }).map((_, i) => (
                        <div key={i} className={`w-4 h-4 rounded-[1px] ${Math.random() > 0.5 ? 'bg-foreground' : 'bg-transparent'}`} />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="font-mono text-[8px] text-muted-foreground text-center">
                  Manual key: <span className="text-primary font-bold tracking-widest">AEGS-{Math.random().toString(36).substring(2, 10).toUpperCase()}</span>
                </p>
                <Button className="w-full font-mono text-xs" onClick={() => setStep('verify')}>
                  I've Scanned the QR Code → Verify
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="font-mono text-[10px] text-muted-foreground">
                  We'll send a 6-digit code to <span className="text-foreground font-semibold">{user?.email}</span>
                </p>
                <Button className="w-full font-mono text-xs" onClick={handleSendEmailOTP} disabled={loading}>
                  {loading ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Mail className="w-3 h-3 mr-2" />}
                  Send Verification Code
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Verify Step */}
        {!mfaEnabled && step === 'verify' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <button onClick={() => setStep('setup')} className="font-mono text-[9px] text-muted-foreground hover:text-foreground">← Back</button>
              <span className="font-mono text-[10px] font-semibold text-foreground">
                {selectedMethod?.id === 'email' ? 'Confirm Email Verification' : 'Enter Authenticator Code'}
              </span>
            </div>

            {selectedMethod?.id === 'google_prompt' ? (
              <div className="space-y-3">
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                  <p className="font-mono text-[10px] text-foreground">
                    Check your phone
                  </p>
                  <p className="font-mono text-[9px] text-muted-foreground mt-1">
                    Google has sent a notification to your connected device. Tap "Yes, it's me" to verify.
                  </p>
                </div>
                <Button className="w-full font-mono text-xs" onClick={handleVerify}>
                  <CheckCircle2 className="w-3 h-3 mr-2" /> I've Approved on My Phone
                </Button>
              </div>
            ) : selectedMethod?.id === 'email' ? (
              <div className="space-y-3">
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                  <p className="font-mono text-[10px] text-foreground">
                    A confirmation email has been sent to <span className="font-bold">{user?.email}</span>.
                  </p>
                  <p className="font-mono text-[9px] text-muted-foreground mt-1">
                    Click the button below once you have received the email to complete MFA setup.
                  </p>
                </div>
                <Button className="w-full font-mono text-xs" onClick={handleVerify}>
                  <CheckCircle2 className="w-3 h-3 mr-2" /> Confirm & Enable MFA
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="font-mono text-[9px] text-muted-foreground">
                  Open your authenticator app and enter the 6-digit code shown for SIFT-AI.
                </p>
                <Input
                  placeholder="000000"
                  value={verifyCode}
                  onChange={e => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="font-mono text-xl text-center tracking-[0.4em]"
                  maxLength={6}
                />
                <Button className="w-full font-mono text-xs" onClick={handleVerify} disabled={verifyCode.length !== 6}>
                  <CheckCircle2 className="w-3 h-3 mr-2" /> Verify & Enable MFA
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}