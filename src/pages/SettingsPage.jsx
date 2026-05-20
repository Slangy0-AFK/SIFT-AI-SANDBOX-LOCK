import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, Layers, Lock, Bug, Clock, Atom, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    baseChainEnabled: true,
    paradoxLockEnabled: true,
    qrngEnabled: true,
    mirrorEnabled: true,
    honeypotsEnabled: true,
    tarpitsEnabled: true,
    maxQRNGCycles: 3,
    tarpitDelay: 1,
    mirrorSyncInterval: 5,
  });

  const handleToggle = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    toast.success('Settings saved successfully');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-xl font-bold tracking-wider text-foreground">SETTINGS</h1>
          <p className="font-mono text-[10px] text-muted-foreground tracking-widest mt-1">
            SYSTEM CONFIGURATION & DEFENSE PARAMETERS
          </p>
        </div>
        <Button className="font-mono text-xs" onClick={handleSave}>
          <Save className="w-3 h-3 mr-2" /> Save Configuration
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Defense Modules */}
        <Card>
          <CardHeader>
            <CardTitle className="font-mono text-xs tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" /> DEFENSE MODULES
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {[
              { key: 'baseChainEnabled', label: 'Base Chain Pipeline', desc: 'Multi-base cryptographic verification', icon: Layers },
              { key: 'paradoxLockEnabled', label: 'Paradox Lock Gate', desc: 'Theological paradox authentication', icon: Lock },
              { key: 'qrngEnabled', label: 'QRNG Cycles', desc: 'Quantum random number threat cycles', icon: Atom },
              { key: 'mirrorEnabled', label: 'Mirror Environment', desc: 'Mirrored deception environment', icon: Shield },
              { key: 'honeypotsEnabled', label: 'Honeypots', desc: 'Fake service deception traps', icon: Bug },
              { key: 'tarpitsEnabled', label: 'Tarpits', desc: 'Connection throttling traps', icon: Clock },
            ].map(({ key, label, desc, icon: Icon }) => (
              <div key={key} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <Label className="font-mono text-[11px]">{label}</Label>
                    <p className="font-mono text-[9px] text-muted-foreground">{desc}</p>
                  </div>
                </div>
                <Switch checked={settings[key]} onCheckedChange={() => handleToggle(key)} />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Parameters */}
        <Card>
          <CardHeader>
            <CardTitle className="font-mono text-xs tracking-wider flex items-center gap-2">
              <Atom className="w-4 h-4 text-primary" /> PARAMETERS
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label className="font-mono text-[10px] text-muted-foreground">MAX QRNG CYCLES BEFORE DESTROY</Label>
              <Input
                type="number"
                className="font-mono text-xs mt-1"
                value={settings.maxQRNGCycles}
                onChange={(e) => setSettings(prev => ({ ...prev, maxQRNGCycles: parseInt(e.target.value) || 3 }))}
              />
            </div>
            <div>
              <Label className="font-mono text-[10px] text-muted-foreground">TARPIT DELAY (BYTES/SEC)</Label>
              <Input
                type="number"
                className="font-mono text-xs mt-1"
                value={settings.tarpitDelay}
                onChange={(e) => setSettings(prev => ({ ...prev, tarpitDelay: parseInt(e.target.value) || 1 }))}
              />
            </div>
            <div>
              <Label className="font-mono text-[10px] text-muted-foreground">MIRROR SYNC INTERVAL (SEC)</Label>
              <Input
                type="number"
                className="font-mono text-xs mt-1"
                value={settings.mirrorSyncInterval}
                onChange={(e) => setSettings(prev => ({ ...prev, mirrorSyncInterval: parseInt(e.target.value) || 5 }))}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}