import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, ShieldCheck, ShieldAlert, Key, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';

export default function AdminKeyClaim() {
  const [adminKey, setAdminKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const queryClient = useQueryClient();

  const claimMutation = useMutation({
    mutationFn: async (key) => {
      const response = await base44.functions.invoke('claimAdminAccess', {
        adminKey: key,
        action: 'claim'
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Admin access granted! Refreshing...');
        queryClient.invalidateQueries({ queryKey: ['me'] });
        setTimeout(() => window.location.reload(), 1500);
      } else {
        toast.error(data.error || 'Invalid admin key');
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to claim admin access');
    }
  });

  const handleClaim = async () => {
    if (!adminKey.trim()) {
      toast.error('Please enter the admin key');
      return;
    }
    setVerifying(true);
    claimMutation.mutate(adminKey.trim());
    setVerifying(false);
  };

  // Only show for admin email
  const ADMIN_EMAIL = 'dougleslie00@gmail.com';
  if (!user || user.email !== ADMIN_EMAIL) {
    return null;
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="font-mono text-xs tracking-wider flex items-center gap-2">
          <Key className="w-4 h-4 text-primary" /> ADMIN ACCESS
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
          <p className="font-mono text-[10px] text-muted-foreground leading-relaxed">
            Admin configuration for <strong className="text-foreground">{user?.email}</strong>
          </p>
          <p className="font-mono text-[9px] text-muted-foreground mt-2">
            Enter the admin key to activate full admin access and system controls.
          </p>
        </div>

        {!showKeyInput ? (
          <Button 
            className="w-full font-mono text-xs" 
            variant="outline"
            onClick={() => setShowKeyInput(true)}
          >
            <Key className="w-3 h-3 mr-2" /> Enter Admin Key
          </Button>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div>
              <Label className="font-mono text-[10px] text-muted-foreground">Admin Key</Label>
              <Input
                type="password"
                placeholder="Enter your admin key"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                className="font-mono text-xs mt-1"
                disabled={verifying || claimMutation.isPending}
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="font-mono text-xs flex-1"
                onClick={() => setShowKeyInput(false)}
                disabled={verifying || claimMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="font-mono text-xs flex-1 bg-primary hover:bg-primary/90"
                onClick={handleClaim}
                disabled={verifying || claimMutation.isPending || !adminKey.trim()}
              >
                {verifying || claimMutation.isPending ? (
                  <><Loader2 className="w-3 h-3 mr-2 animate-spin" />Verifying...</>
                ) : (
                  <><ShieldCheck className="w-3 h-3 mr-2" /> Claim Admin</>
                )}
              </Button>
            </div>
          </motion.div>
        )}

        {claimMutation.isSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center gap-3"
          >
            <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
            <p className="font-mono text-[10px] text-green-400">Admin access activated! Reloading...</p>
          </motion.div>
        )}

        {claimMutation.isError && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-mono text-[10px] text-destructive">
                {claimMutation.error?.message || 'Failed to claim admin access'}
              </p>
              <p className="font-mono text-[9px] text-muted-foreground mt-1">
                Make sure you're using the correct admin key from your app secrets.
              </p>
            </div>
          </div>
        )}

        <div className="p-3 rounded-lg bg-amber-400/10 border border-amber-400/20">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="font-mono text-[9px] text-amber-400 leading-relaxed">
              <strong>Security Notice:</strong> This action is logged and can only be performed once per admin key. Keep your admin key secure.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}