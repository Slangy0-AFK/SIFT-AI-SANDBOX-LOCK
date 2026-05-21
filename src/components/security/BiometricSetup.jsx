import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Fingerprint, CheckCircle2, XCircle, Loader2, Shield, Smartphone, Eye } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function BiometricSetup({ onComplete }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [webAuthnAvailable, setWebAuthnAvailable] = useState(true);

  useEffect(() => {
    checkBiometricStatus();
  }, []);

  const checkBiometricStatus = async () => {
    try {
      const response = await base44.functions.invoke('biometricAuth', { action: 'get_status' });
      const data = response.data;
      setStatus(data);
      setBiometricEnabled(data.biometric_enabled);
      setWebAuthnAvailable(data.webauthn_available);
    } catch (err) {
      console.error('Failed to check biometric status:', err);
    }
  };

  const handleRegisterBiometric = async () => {
    if (!webAuthnAvailable) {
      toast.error('WebAuthn is not supported on this device. Please use a modern browser or device with biometric sensors.');
      return;
    }

    setLoading(true);
    try {
      // Step 1: Get registration challenge
      const startRes = await base44.functions.invoke('biometricAuth', { action: 'register_start' });
      const { publicKey } = startRes.data;

      // Step 2: Create credential using WebAuthn API
      const credential = await navigator.credentials.create({
        publicKey,
      });

      // Step 3: Complete registration
      const completeRes = await base44.functions.invoke('biometricAuth', {
        action: 'register_complete',
        credential: {
          id: credential.id,
          response: {
            publicKey: credential.response?.getPublicKey ? credential.response.getPublicKey() : null,
          },
        },
      });

      if (completeRes.data.success) {
        setBiometricEnabled(true);
        toast.success('Biometric authentication enabled! You can now use Touch ID, Face ID, or fingerprint to authenticate.');
        checkBiometricStatus();
        if (onComplete) onComplete();
      }
    } catch (err) {
      console.error('Biometric registration failed:', err);
      if (err.name === 'NotAllowedError') {
        toast.error('Biometric authentication was cancelled or not allowed. Please try again.');
      } else if (err.name === 'InvalidStateError') {
        toast.error('Biometric credential already registered.');
      } else {
        toast.error('Failed to register biometric: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDisableBiometric = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('biometricAuth', { action: 'disable' });
      if (response.data.success) {
        setBiometricEnabled(false);
        toast.success('Biometric authentication disabled.');
        checkBiometricStatus();
      }
    } catch (err) {
      toast.error('Failed to disable biometric: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthenticate = async () => {
    if (!biometricEnabled) {
      toast.error('Biometric authentication not enabled. Please register first.');
      return;
    }

    setLoading(true);
    try {
      // Step 1: Get authentication challenge
      const startRes = await base44.functions.invoke('biometricAuth', { action: 'authenticate_start' });
      const { publicKey } = startRes.data;

      // Step 2: Get credential using WebAuthn API
      const credential = await navigator.credentials.get({
        publicKey,
      });

      // Step 3: Complete authentication
      const completeRes = await base44.functions.invoke('biometricAuth', {
        action: 'authenticate_complete',
        credential: {
          id: credential.id,
        },
      });

      if (completeRes.data.success) {
        toast.success('Biometric authentication successful!');
      }
    } catch (err) {
      console.error('Biometric authentication failed:', err);
      if (err.name === 'NotAllowedError') {
        toast.error('Biometric authentication was cancelled or failed. Please try again.');
      } else {
        toast.error('Authentication failed: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!webAuthnAvailable) {
    return (
      <Card className="border-red-500/30 bg-red-500/10">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <XCircle className="w-6 h-6 text-red-400" />
            <div>
              <p className="font-mono text-xs font-bold text-red-400">WebAuthn Not Supported</p>
              <p className="font-mono text-[9px] text-muted-foreground mt-1">
                Your browser or device does not support WebAuthn. Biometric authentication requires a modern browser with WebAuthn support.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status Card */}
      <Card className={biometricEnabled ? 'border-green-500/30 bg-green-500/10' : 'border-border'}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {biometricEnabled ? (
                <CheckCircle2 className="w-6 h-6 text-green-400" />
              ) : (
                <Fingerprint className="w-6 h-6 text-muted-foreground" />
              )}
              <div>
                <p className={`font-mono text-xs font-bold ${biometricEnabled ? 'text-green-400' : 'text-foreground'}`}>
                  {biometricEnabled ? 'Biometric Auth Enabled' : 'Biometric Auth Disabled'}
                </p>
                <p className="font-mono text-[9px] text-muted-foreground mt-1">
                  {biometricEnabled
                    ? status?.biometric_last_used
                      ? `Last used: ${new Date(status.biometric_last_used).toLocaleString()}`
                      : 'Ready to use'
                    : 'Enable for faster, more secure authentication'}
                </p>
              </div>
            </div>
            {biometricEnabled && (
              <Badge className="font-mono text-[8px] bg-green-400/10 text-green-400 border-green-400/20">
                ACTIVE
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-xs tracking-wider flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            BIOMETRIC AUTHENTICATION
          </CardTitle>
          <CardDescription className="font-mono text-[9px]">
            Use your device's native biometrics for secure authentication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Supported Methods */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 rounded-lg bg-secondary/50 border border-border text-center">
              <Fingerprint className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="font-mono text-[8px]">Fingerprint</p>
            </div>
            <div className="p-3 rounded-lg bg-secondary/50 border border-border text-center">
              <Eye className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="font-mono text-[8px]">Face ID</p>
            </div>
            <div className="p-3 rounded-lg bg-secondary/50 border border-border text-center">
              <Smartphone className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="font-mono text-[8px]">Device PIN</p>
            </div>
          </div>

          {/* Benefits */}
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-3 h-3 text-green-400 flex-shrink-0 mt-0.5" />
              <p className="font-mono text-[9px] text-muted-foreground">
                Faster authentication - no passwords required
              </p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-3 h-3 text-green-400 flex-shrink-0 mt-0.5" />
              <p className="font-mono text-[9px] text-muted-foreground">
                More secure - biometric data never leaves your device
              </p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-3 h-3 text-green-400 flex-shrink-0 mt-0.5" />
              <p className="font-mono text-[9px] text-muted-foreground">
                Works offline - no network required for authentication
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {!biometricEnabled ? (
              <Button
                onClick={handleRegisterBiometric}
                disabled={loading}
                className="flex-1 font-mono text-xs gap-2"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Enabling...</>
                ) : (
                  <><Fingerprint className="w-4 h-4" /> Enable Biometric</>
                )}
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleAuthenticate}
                  disabled={loading}
                  variant="outline"
                  className="flex-1 font-mono text-xs gap-2"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</>
                  ) : (
                    <><Shield className="w-4 h-4" /> Test Auth</>
                  )}
                </Button>
                <Button
                  onClick={handleDisableBiometric}
                  disabled={loading}
                  variant="destructive"
                  className="flex-1 font-mono text-xs"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Disable'}
                </Button>
              </>
            )}
          </div>

          {/* Privacy Notice */}
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <p className="font-mono text-[8px] text-blue-400 leading-relaxed">
              🔒 <strong>Privacy:</strong> Your biometric data is stored securely on your device only. AEGIS never receives or stores your fingerprint, face scan, or biometric templates. We only receive a cryptographic confirmation of successful authentication.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}