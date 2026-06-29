import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Monitor, Tablet, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { PLANS } from './PlanCard';

const deviceIcons = { android: Smartphone, ios: Smartphone, desktop: Monitor, tablet: Tablet, other: Smartphone };

export default function DeviceManager({ devices = [], plan = 'free', userId }) {
  const [adding, setAdding] = useState(false);
  const [newDevice, setNewDevice] = useState({ device_name: '', device_type: 'android' });
  const queryClient = useQueryClient();
  const maxDevices = PLANS[plan]?.devices || 1;
  const activeDevices = devices.filter(d => d.status === 'active');
  const atLimit = activeDevices.length >= maxDevices;

  const addMutation = useMutation({
    mutationFn: (data) => base44.entities.Device.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      setAdding(false);
      setNewDevice({ device_name: '', device_type: 'android' });
      toast.success('Device added successfully');
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id) => base44.entities.Device.update(id, { status: 'removed' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      toast.success('Device removed');
    },
  });

  const handleAdd = () => {
    if (!newDevice.device_name.trim()) return;
    addMutation.mutate({
      ...newDevice,
      user_id: userId,
      device_fingerprint: `fp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      last_seen: new Date().toISOString(),
      status: 'active',
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-muted-foreground">
            {activeDevices.length} / {maxDevices} devices
          </span>
          <div className="flex gap-1">
            {Array.from({ length: maxDevices }).map((_, i) => (
              <div key={i} className={`w-5 h-1.5 rounded-full ${i < activeDevices.length ? 'bg-primary' : 'bg-secondary'}`} />
            ))}
          </div>
        </div>
        <Button
          size="sm"
          className="font-mono text-xs"
          disabled={atLimit}
          onClick={() => setAdding(true)}
        >
          <Plus className="w-3 h-3 mr-1" /> Add Device
        </Button>
      </div>

      {/* At limit warning */}
      {atLimit && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
          <p className="font-mono text-xs text-destructive">
            Device limit reached ({maxDevices}/{maxDevices}). Remove a device to add a new one, or upgrade your plan.
          </p>
        </div>
      )}

      {/* Add form */}
      <AnimatePresence>
        {adding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-secondary/50 border border-border rounded-lg p-4 space-y-3"
          >
            <Input
              placeholder="Device name (e.g. My Pixel 9)"
              className="font-mono text-xs"
              value={newDevice.device_name}
              onChange={(e) => setNewDevice(p => ({ ...p, device_name: e.target.value }))}
            />
            <Select value={newDevice.device_type} onValueChange={(v) => setNewDevice(p => ({ ...p, device_type: v }))}>
              <SelectTrigger className="font-mono text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="android" className="font-mono text-xs">Android</SelectItem>
                <SelectItem value="ios" className="font-mono text-xs">iOS</SelectItem>
                <SelectItem value="desktop" className="font-mono text-xs">Desktop</SelectItem>
                <SelectItem value="tablet" className="font-mono text-xs">Tablet</SelectItem>
                <SelectItem value="other" className="font-mono text-xs">Other</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button size="sm" className="font-mono text-xs flex-1" onClick={handleAdd} disabled={addMutation.isPending}>
                {addMutation.isPending ? 'Adding...' : 'Confirm Add'}
              </Button>
              <Button size="sm" variant="outline" className="font-mono text-xs" onClick={() => setAdding(false)}>Cancel</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Device list */}
      <div className="space-y-2">
        {activeDevices.length === 0 ? (
          <p className="font-mono text-xs text-muted-foreground text-center py-4">No devices registered</p>
        ) : (
          activeDevices.map((device) => {
            const Icon = deviceIcons[device.device_type] || Smartphone;
            return (
              <div key={device.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/40 border border-border/60">
                <Icon className="w-4 h-4 text-primary" />
                <div className="flex-1 min-w-0">
                  <span className="font-mono text-[11px] font-semibold text-foreground">{device.device_name}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className="font-mono text-xs text-muted-foreground">{device.device_type}</Badge>
                    <span className="font-mono text-xs text-muted-foreground">
                      {device.last_seen ? `Last seen ${new Date(device.last_seen).toLocaleDateString()}` : 'Never'}
                    </span>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="w-7 h-7 text-muted-foreground hover:text-destructive"
                  onClick={() => removeMutation.mutate(device.id)}
                  disabled={removeMutation.isPending}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}