import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Plus, Trash2, Edit, Activity, AlertTriangle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function FirewallManager() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [formData, setFormData] = useState({
    rule_name: '',
    rule_type: 'block',
    priority: 100,
    source_ip: '',
    destination_port: '',
    protocol: 'tcp',
    direction: 'inbound',
    description: '',
    tags: '',
  });

  const queryClient = useQueryClient();

  const { data: rules, isLoading } = useQuery({
    queryKey: ['firewall-rules'],
    queryFn: () => base44.entities.FirewallRule.list('-priority'),
  });

  const { data: stats } = useQuery({
    queryKey: ['firewall-stats'],
    queryFn: async () => {
      const response = await base44.functions.invoke('firewallManager', { action: 'get_stats' });
      return response.data.stats;
    },
    refetchInterval: 5000,
  });

  const createRuleMutation = useMutation({
    mutationFn: async (ruleData) => {
      const response = await base44.functions.invoke('firewallManager', {
        action: 'create_rule',
        rule_data: ruleData,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firewall-rules'] });
      queryClient.invalidateQueries({ queryKey: ['firewall-stats'] });
      toast.success('Firewall rule created');
      setDialogOpen(false);
      resetForm();
    },
  });

  const updateRuleMutation = useMutation({
    mutationFn: async ({ rule_id, updates }) => {
      const response = await base44.functions.invoke('firewallManager', {
        action: 'update_rule',
        rule_data: { rule_id, updates },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firewall-rules'] });
      toast.success('Rule updated');
      setEditingRule(null);
      setDialogOpen(false);
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (rule_id) => {
      const response = await base44.functions.invoke('firewallManager', {
        action: 'delete_rule',
        rule_data: { rule_id },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firewall-rules'] });
      queryClient.invalidateQueries({ queryKey: ['firewall-stats'] });
      toast.success('Rule deleted');
    },
  });

  const toggleRuleMutation = useMutation({
    mutationFn: async (rule_id) => {
      const response = await base44.functions.invoke('firewallManager', {
        action: 'toggle_rule',
        rule_data: { rule_id },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firewall-rules'] });
      toast.success('Rule toggled');
    },
  });

  const resetForm = () => {
    setFormData({
      rule_name: '',
      rule_type: 'block',
      priority: 100,
      source_ip: '',
      destination_port: '',
      protocol: 'tcp',
      direction: 'inbound',
      description: '',
      tags: '',
    });
    setEditingRule(null);
  };

  const handleSubmit = () => {
    if (!formData.rule_name) {
      toast.error('Rule name is required');
      return;
    }

    if (editingRule) {
      updateRuleMutation.mutate({ rule_id: editingRule.id, updates: formData });
    } else {
      createRuleMutation.mutate(formData);
    }
  };

  const handleEdit = (rule) => {
    setEditingRule(rule);
    setFormData({
      rule_name: rule.rule_name,
      rule_type: rule.rule_type,
      priority: rule.priority,
      source_ip: rule.source_ip || '',
      destination_port: rule.destination_port || '',
      protocol: rule.protocol,
      direction: rule.direction,
      description: rule.description || '',
      tags: rule.tags || '',
    });
    setDialogOpen(true);
  };

  const getRuleTypeColor = (type) => {
    switch (type) {
      case 'allow': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'block': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'rate_limit': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-primary" />
              <div>
                <div className="text-2xl font-bold">{stats?.total_rules || 0}</div>
                <div className="text-xs text-muted-foreground">Total Rules</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{stats?.active_rules || 0}</div>
                <div className="text-xs text-muted-foreground">Active Rules</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <XCircle className="w-8 h-8 text-red-500" />
              <div>
                <div className="text-2xl font-bold">{stats?.total_hits || 0}</div>
                <div className="text-xs text-muted-foreground">Total Blocks</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-amber-500" />
              <div>
                <div className="text-2xl font-bold">{stats?.recent_threats || 0}</div>
                <div className="text-xs text-muted-foreground">Threats Detected</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rules List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Firewall Rules
              </CardTitle>
              <CardDescription>Manage inbound and outbound traffic rules</CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Rule
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingRule ? 'Edit Firewall Rule' : 'Create New Firewall Rule'}</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Rule Name</Label>
                    <Input
                      value={formData.rule_name}
                      onChange={(e) => setFormData({ ...formData, rule_name: e.target.value })}
                      placeholder="e.g., Block Suspicious IPs"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Rule Type</Label>
                    <Select
                      value={formData.rule_type}
                      onValueChange={(value) => setFormData({ ...formData, rule_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="allow">Allow</SelectItem>
                        <SelectItem value="block">Block</SelectItem>
                        <SelectItem value="rate_limit">Rate Limit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Input
                      type="number"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 100 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Protocol</Label>
                    <Select
                      value={formData.protocol}
                      onValueChange={(value) => setFormData({ ...formData, protocol: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tcp">TCP</SelectItem>
                        <SelectItem value="udp">UDP</SelectItem>
                        <SelectItem value="icmp">ICMP</SelectItem>
                        <SelectItem value="any">Any</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Source IP (optional)</Label>
                    <Input
                      value={formData.source_ip}
                      onChange={(e) => setFormData({ ...formData, source_ip: e.target.value })}
                      placeholder="192.168.1.0/24"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Destination Port (optional)</Label>
                    <Input
                      value={formData.destination_port}
                      onChange={(e) => setFormData({ ...formData, destination_port: e.target.value })}
                      placeholder="80, 443, 8000-9000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Direction</Label>
                    <Select
                      value={formData.direction}
                      onValueChange={(value) => setFormData({ ...formData, direction: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inbound">Inbound</SelectItem>
                        <SelectItem value="outbound">Outbound</SelectItem>
                        <SelectItem value="both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tags (comma-separated)</Label>
                    <Input
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      placeholder="security, production, critical"
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Description</Label>
                    <Input
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe the purpose of this rule..."
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSubmit}>
                    {editingRule ? 'Update Rule' : 'Create Rule'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center text-muted-foreground py-8">Loading rules...</div>
          ) : rules && rules.length > 0 ? (
            <div className="space-y-3">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg bg-card/50"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <Badge className={getRuleTypeColor(rule.rule_type)}>
                      {rule.rule_type.toUpperCase()}
                    </Badge>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{rule.rule_name}</span>
                        {!rule.enabled && (
                          <Badge variant="secondary" className="text-xs">Disabled</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {rule.source_ip && <span className="mr-3">Source: {rule.source_ip}</span>}
                        {rule.destination_port && <span className="mr-3">Port: {rule.destination_port}</span>}
                        <span className="mr-3">{rule.protocol.toUpperCase()}</span>
                        <span>{rule.direction}</span>
                        {rule.hit_count > 0 && (
                          <span className="ml-3 text-amber-500">
                            {rule.hit_count} hits
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={() => toggleRuleMutation.mutate(rule.id)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(rule)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteRuleMutation.mutate(rule.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No firewall rules configured</p>
              <p className="text-sm">Click "Add Rule" to create your first rule</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}