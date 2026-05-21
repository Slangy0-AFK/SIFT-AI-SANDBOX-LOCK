import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Mail, Key, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function PasswordReset({ onClose }) {
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const requestResetMutation = useMutation({
    mutationFn: async (email) => {
      const response = await base44.functions.invoke('passwordReset', {
        action: 'request_reset',
        email,
      });
      if (response.data?.error) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Password reset email sent. Check your inbox for the reset link.');
      setEmail('');
    },
    onError: (error) => {
      toast.error(`Failed: ${error.message}`);
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ token, password }) => {
      const response = await base44.functions.invoke('passwordReset', {
        action: 'reset_password',
        reset_token: token,
        new_password: password,
      });
      if (response.data?.error) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Password reset successfully!');
      setResetToken('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (error) => {
      toast.error(`Failed: ${error.message}`);
    },
  });

  const handleRequestReset = () => {
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email');
      return;
    }
    requestResetMutation.mutate(email);
  };

  const handleReset = () => {
    if (!resetToken) {
      toast.error('Please enter the reset token from your email');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    resetPasswordMutation.mutate({ token: resetToken, password: newPassword });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="w-5 h-5 text-primary" />
          Password Reset
        </CardTitle>
        <CardDescription>Reset your password securely via email</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <Alert>
            <Mail className="w-4 h-4" />
            <AlertTitle>Request Password Reset</AlertTitle>
            <AlertDescription>
              Enter your email address and we'll send you a secure reset link with a token.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label>Email Address</Label>
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <Button onClick={handleRequestReset} disabled={requestResetMutation.isPending}>
            <Mail className="w-4 h-4 mr-2" />
            Send Reset Link
          </Button>

          <div className="pt-4 border-t border-border">
            <Alert className="bg-blue-500/10 border-blue-500/20">
              <Key className="w-4 h-4 text-blue-500" />
              <AlertTitle className="text-blue-500">Reset Your Password</AlertTitle>
              <AlertDescription>
                Paste the reset token from your email and enter your new password below.
              </AlertDescription>
            </Alert>

            <div className="space-y-2 mt-4">
              <Label>Reset Token</Label>
              <Input
                placeholder="Paste token from email"
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>New Password</Label>
              <Input
                type="password"
                placeholder="Minimum 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Confirm Password</Label>
              <Input
                type="password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <Button onClick={handleReset} disabled={resetPasswordMutation.isPending}>
              <Check className="w-4 h-4 mr-2" />
              Reset Password
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}