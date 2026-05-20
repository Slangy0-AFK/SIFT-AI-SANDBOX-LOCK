import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Shield, Check, X, Smartphone, Key, RefreshCw, Copy } from 'lucide-react';
import { toast } from 'sonner';
import QRCode from 'qrcode.react';

export default function MFASetup() {
  const [mfaCode, setMfaCode] = useState('');
  const [setupStep, setSetupStep] = useState(0); // 0: not started, 1: secret generated, 2: verified
  const [secret, setSecret] = useState(null);
  const [otpauthUrl, setOtpauthUrl] = useState(null);

  const { data: userData } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch {
        return null;
      }
    },
  });

  const setupMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('manageMFA', {
        action: 'setup',
      });
      return response.data;
    },
    onSuccess: (data) => {
      setSecret(data.secret);
      setOtpauthUrl(data.otpauth_url);
      setSetupStep(1);
      toast.success('MFA setup initiated. Scan QR code with your authenticator app.');
    },
    onError: (error) => {
      toast.error(`Setup failed: ${error.message}`);
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (code) => {
      const response = await base44.functions.invoke('manageMFA', {
        action: 'verify',
        totp_code: code,
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        setSetupStep(2);
        toast.success('MFA enabled successfully!');
      } else {
        toast.error('Invalid code. Please try again.');
      }
    },
    onError: (error) => {
      toast.error(`Verification failed: ${error.message}`);
    },
  });

  const disableMutation = useMutation({
    mutationFn: async (code) => {
      const response = await base44.functions.invoke('manageMFA', {
        action: 'disable',
        totp_code: code,
      });
      return response.data;
    },
    onSuccess: () => {
      setSetupStep(0);
      setSecret(null);
      setOtpauthUrl(null);
      setMfaCode('');
      toast.success('MFA disabled successfully');
    },
    onError: (error) => {
      toast.error(`Failed to disable: ${error.message}`);
    },
  });

  const mfaEnabled = userData?.mfa_enabled;

  const handleVerify = () => {
    if (mfaCode.length !== 6) {
      toast.error('Code must be 6 digits');
      return;
    }
    verifyMutation.mutate(mfaCode);
  };

  const handleDisable = () => {
    if (mfaCode.length !== 6) {
      toast.error('Enter current 6-digit code to disable MFA');
      return;
    }
    disableMutation.mutate(mfaCode);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Multi-Factor Authentication
        </CardTitle>
        <CardDescription>Secure your account with TOTP-based 2FA</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {mfaEnabled ? (
          <div className="space-y-4">
            <Alert className="bg-green-500/10 border-green-500/20">
              <Check className="w-4 h-4 text-green-500" />
              <AlertTitle className="text-green-500">MFA Enabled</AlertTitle>
              <AlertDescription>
                Your account is protected with multi-factor authentication.
              </AlertDescription>
            </Alert>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <Smartphone className="w-3 h-3" />
                Authenticator App Connected
              </Badge>
              {userData?.mfa_verified_count > 0 && (
                <Badge variant="outline">
                  Verified {userData.mfa_verified_count} times
                </Badge>
              )}
            </div>

            <div className="space-y-2">
              <Label>Disable MFA</Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Enter current 6-digit code"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  maxLength={6}
                  className="font-mono"
                />
                <Button
                  variant="destructive"
                  onClick={handleDisable}
                  disabled={disableMutation.isPending}
                >
                  <X className="w-4 h-4 mr-2" />
                  Disable
                </Button>
              </div>
            </div>
          </div>
        ) : setupStep === 0 ? (
          <div className="space-y-4">
            <Alert>
              <AlertTitle>MFA Not Enabled</AlertTitle>
              <AlertDescription>
                Protect your account with an authenticator app like Google Authenticator or Authy.
              </AlertDescription>
            </Alert>

            <Button onClick={setupMutation.mutate} disabled={setupMutation.isPending}>
              <Key className="w-4 h-4 mr-2" />
              Setup MFA
            </Button>
          </div>
        ) : setupStep === 1 ? (
          <div className="space-y-4">
            <Alert>
              <AlertTitle>Step 1: Scan QR Code</AlertTitle>
              <AlertDescription>
                Open your authenticator app and scan the QR code below.
              </AlertDescription>
            </Alert>

            <div className="flex justify-center p-4 bg-white rounded-lg">
              {otpauthUrl && (
                <QRCode value={otpauthUrl} size={200} />
              )}
            </div>

            <div className="space-y-2">
              <Label>Or enter manually</Label>
              <Input
                value={secret}
                readOnly
                className="font-mono text-xs"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(secret);
                  toast.success('Secret copied to clipboard');
                }}
              >
                <Copy className="w-3 h-3 mr-2" /> Copy Secret
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Step 2: Enter 6-digit code</Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="000000"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  maxLength={6}
                  className="font-mono text-center text-lg"
                />
                <Button onClick={handleVerify} disabled={verifyMutation.isPending}>
                  <Check className="w-4 h-4 mr-2" />
                  Verify
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <Alert className="bg-green-500/10 border-green-500/20">
            <Check className="w-4 h-4 text-green-500" />
            <AlertTitle className="text-green-500">MFA Successfully Enabled!</AlertTitle>
            <AlertDescription>
              Your account is now protected with multi-factor authentication.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}