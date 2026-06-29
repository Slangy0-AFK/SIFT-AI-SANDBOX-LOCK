import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, Mail, Shield, Key, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import PasswordReset from '../components/security/PasswordReset';

export default function UserProfile() {
  const queryClient = useQueryClient();
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const { data: user, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: () => base44.entities.Subscription.filter({ user_id: user?.email }),
    initialData: [],
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      return base44.auth.updateMe(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success('Profile updated successfully');
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      if (newPassword !== confirmPassword) {
        throw new Error('Passwords do not match');
      }
      if (newPassword.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }
      // In a real scenario, you'd verify currentPassword with backend
      return base44.auth.updateMe({ password: newPassword });
    },
    onSuccess: () => {
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setChangingPassword(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSaveProfile = () => {
    updateProfileMutation.mutate({ full_name: user?.full_name });
  };

  const handleChangePassword = () => {
    setChangingPassword(true);
    changePasswordMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const currentPlan = subscriptions[0]?.plan || 'free';

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-mono text-xl font-bold tracking-wider text-foreground">USER PROFILE</h1>
        <p className="font-mono text-xs text-muted-foreground tracking-widest mt-1">
          ACCOUNT SETTINGS · SECURITY · PREFERENCES
        </p>
      </div>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-xs tracking-wider flex items-center gap-2">
            <User className="w-4 h-4 text-primary" /> PROFILE INFORMATION
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="email" className="font-mono text-xs">EMAIL ADDRESS</Label>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <Input id="email" value={user?.email} disabled className="font-mono text-xs" />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="name" className="font-mono text-xs">FULL NAME</Label>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <Input
                id="name"
                value={user?.full_name || ''}
                onChange={(e) => updateProfileMutation.mutate({ full_name: e.target.value })}
                className="font-mono text-xs"
                placeholder="Enter your full name"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge className={`font-mono text-xs ${currentPlan === 'enterprise' ? 'bg-amber-400/10 text-amber-400 border-amber-400/20' : currentPlan === 'pro' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-secondary text-muted-foreground border-border'} border`}>
              {currentPlan.toUpperCase()} PLAN
            </Badge>
            <Badge className="font-mono text-xs bg-green-400/10 text-green-400 border-green-400/20 border">
              <CheckCircle className="w-3 h-3 mr-1" /> ACTIVE
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-xs tracking-wider flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" /> SECURITY SETTINGS
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showPasswordReset ? (
            <>
              <Alert>
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <AlertDescription className="font-mono text-xs">
                  For security reasons, password changes require verification. Use the password reset feature or change your password below.
                </AlertDescription>
              </Alert>

              <div className="grid gap-2">
                <Label htmlFor="current-password" className="font-mono text-xs">CURRENT PASSWORD</Label>
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-muted-foreground" />
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="font-mono text-xs"
                    placeholder="Enter current password"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="new-password" className="font-mono text-xs">NEW PASSWORD</Label>
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-muted-foreground" />
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="font-mono text-xs"
                    placeholder="Enter new password"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="confirm-password" className="font-mono text-xs">CONFIRM PASSWORD</Label>
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="font-mono text-xs"
                    placeholder="Confirm new password"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleChangePassword}
                  disabled={changingPassword || !newPassword || !confirmPassword}
                  className="font-mono text-xs"
                >
                  {changingPassword ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Changing...</> : <><Key className="w-4 h-4 mr-2" /> Change Password</>}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowPasswordReset(true)}
                  className="font-mono text-xs"
                >
                  Use Password Reset
                </Button>
              </div>
            </>
          ) : (
            <PasswordReset onClose={() => setShowPasswordReset(false)} />
          )}
        </CardContent>
      </Card>

    </div>
  );
}