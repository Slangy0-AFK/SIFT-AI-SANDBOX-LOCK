import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Mail } from 'lucide-react';
import { toast } from 'sonner';

export default function PasswordReset({ onClose }) {
  const [email, setEmail] = useState('');

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

  const handleRequestReset = () => {
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email');
      return;
    }
    requestResetMutation.mutate(email);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-primary" />
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
              Enter your email address and we'll send you a secure reset link. Click the link in your email to reset your password.
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

          <div className="flex gap-2">
            <Button onClick={handleRequestReset} disabled={requestResetMutation.isPending}>
              <Mail className="w-4 h-4 mr-2" />
              {requestResetMutation.isPending ? 'Sending...' : 'Send Reset Link'}
            </Button>
            {onClose && (
              <Button variant="outline" onClick={onClose}>Cancel</Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}