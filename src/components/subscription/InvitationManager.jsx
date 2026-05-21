import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Mail, Plus, Trash2, Clock, CheckCircle2, XCircle, AlertTriangle,
  UserPlus, Calendar, Users
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function InvitationManager({ subscription }) {
  const [sending, setSending] = useState(false);
  const [inviteData, setInviteData] = useState({
    invitee_email: '',
    device_slots: 1,
    notes: '',
  });
  const queryClient = useQueryClient();

  const { data: invitations = [] } = useQuery({
    queryKey: ['invitations'],
    queryFn: () => base44.entities.Invitation.list('-created_date', 50),
    initialData: [],
  });

  const sendMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('sendInvitation', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      setSending(false);
      setInviteData({ invitee_email: '', device_slots: 1, notes: '' });
      toast.success('Invitation sent successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to send invitation');
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (id) => base44.entities.Invitation.update(id, { status: 'revoked' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      toast.success('Invitation revoked');
    },
  });

  const handleSend = () => {
    if (!inviteData.invitee_email || !inviteData.invitee_email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    sendMutation.mutate(inviteData);
  };

  const getStatusColor = (status) => {
    return {
      pending: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
      accepted: 'text-green-400 bg-green-400/10 border-green-400/30',
      expired: 'text-red-400 bg-red-400/10 border-red-400/30',
      revoked: 'text-muted-foreground bg-secondary border-border',
    }[status] || 'text-muted-foreground';
  };

  const maxDevices = subscription?.plan === 'pro' ? 5 : 1;
  const activeDevices = invitations.filter(i => i.status === 'accepted').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-mono text-xs tracking-wider flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-primary" /> FAMILY ENROLLMENT
        </CardTitle>
        <p className="font-mono text-[9px] text-muted-foreground">
          Invite family members to join your security plan
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Send Invitation Form */}
        <AnimatePresence>
          {sending ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-secondary/50 border border-border rounded-lg p-4 space-y-3"
            >
              <div className="space-y-2">
                <label className="font-mono text-[9px] text-muted-foreground">Email Address</label>
                <Input
                  placeholder="family@example.com"
                  className="font-mono text-xs"
                  value={inviteData.invitee_email}
                  onChange={(e) => setInviteData(p => ({ ...p, invitee_email: e.target.value }))}
                  type="email"
                />
              </div>
              <div className="space-y-2">
                <label className="font-mono text-[9px] text-muted-foreground">Device Slots (1-10)</label>
                <Select 
                  value={inviteData.device_slots.toString()} 
                  onValueChange={(v) => setInviteData(p => ({ ...p, device_slots: parseInt(v) }))}
                >
                  <SelectTrigger className="font-mono text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5].map(n => (
                      <SelectItem key={n} value={n.toString()} className="font-mono text-xs">
                        {n} slot{n > 1 ? 's' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="font-mono text-[9px] text-muted-foreground">Optional Message</label>
                <Input
                  placeholder="Welcome to our family plan!"
                  className="font-mono text-xs"
                  value={inviteData.notes}
                  onChange={(e) => setInviteData(p => ({ ...p, notes: e.target.value }))}
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  className="font-mono text-xs flex-1" 
                  onClick={handleSend}
                  disabled={sendMutation.isPending}
                >
                  {sendMutation.isPending ? 'Sending...' : 'Send Invitation'}
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="font-mono text-xs" 
                  onClick={() => setSending(false)}
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          ) : (
            <Button
              size="sm"
              className="font-mono text-xs w-full"
              onClick={() => setSending(true)}
              disabled={!subscription || subscription.status !== 'active'}
            >
              <Plus className="w-3 h-3 mr-2" /> Send Invitation
            </Button>
          )}
        </AnimatePresence>

        {/* Stats */}
        {subscription && (
          <div className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30 border border-border/40">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <span className="font-mono text-[9px] text-muted-foreground">
                {activeDevices} / {maxDevices} slots used
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="font-mono text-[9px] text-muted-foreground">
                {invitations.filter(i => i.status === 'pending').length} pending
              </span>
            </div>
          </div>
        )}

        {/* Invitation List */}
        <div className="space-y-2">
          <h3 className="font-mono text-[10px] font-semibold text-muted-foreground">INVITATIONS</h3>
          
          {invitations.length === 0 ? (
            <p className="font-mono text-[9px] text-muted-foreground text-center py-4">
              No invitations sent yet
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {invitations.map((invite) => (
                <div 
                  key={invite.id}
                  className="p-3 rounded-lg bg-secondary/40 border border-border/60 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3 h-3 text-primary" />
                      <span className="font-mono text-[10px] font-semibold text-foreground">
                        {invite.invitee_email}
                      </span>
                    </div>
                    <Badge className={`font-mono text-[7px] ${getStatusColor(invite.status)}`}>
                      {invite.status.toUpperCase()}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[8px] text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Expires {new Date(invite.expires_at).toLocaleDateString()}
                      </span>
                      <span className="font-mono text-[8px] text-muted-foreground">
                        {invite.device_slots} slot{invite.device_slots > 1 ? 's' : ''}
                      </span>
                    </div>
                    
                    {invite.status === 'pending' && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-6 h-6 text-muted-foreground hover:text-destructive"
                        onClick={() => revokeMutation.mutate(invite.id)}
                        disabled={revokeMutation.isPending}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>

                  {invite.notes && (
                    <p className="font-mono text-[8px] text-muted-foreground italic pl-5">
                      "{invite.notes}"
                    </p>
                  )}

                  {invite.accepted_at && (
                    <p className="font-mono text-[8px] text-green-400 pl-5 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Accepted {new Date(invite.accepted_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}