import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, CheckCircle2, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const EMAIL_PROVIDERS = [
  { id: 'gmail', name: 'Gmail', icon: Mail, color: 'text-red-500', connectorId: '6a0f21a2f39d9bf2ebd374e6' },
  { id: 'outlook', name: 'Outlook/Hotmail', icon: Mail, color: 'text-blue-500', connectorId: '6a0f2325e2853c72f54ef687' },
  { id: 'yahoo', name: 'Yahoo Mail', icon: Mail, color: 'text-purple-500', connectorId: null },
  { id: 'icloud', name: 'iCloud Mail', icon: Mail, color: 'text-sky-500', connectorId: null },
  { id: 'aol', name: 'AOL Mail', icon: Mail, color: 'text-orange-500', connectorId: null },
  { id: 'proton', name: 'ProtonMail', icon: Mail, color: 'text-cyan-500', connectorId: null },
];

export default function EmailProviderSetup() {
  const [emailProviders, setEmailProviders] = useState(['gmail']);
  const [connecting, setConnecting] = useState(null);

  const handleConnectEmail = async (provider) => {
    if (!provider.connectorId) {
      toast.info(`${provider.name} support coming soon! For now, you can manually forward emails to your connected Gmail account.`);
      return;
    }

    setConnecting(provider.id);
    try {
      const url = await base44.connectors.connectAppUser(provider.connectorId);
      const popup = window.open(url, '_blank', 'width=600,height=700');
      
      const checkInterval = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(checkInterval);
          setEmailProviders(prev => 
            prev.includes(provider.id) ? prev : [...prev, provider.id]
          );
          toast.success(`${provider.name} connected successfully!`);
        }
      }, 1000);

      setTimeout(() => clearInterval(checkInterval), 60000);
    } catch (err) {
      toast.error(`Failed to connect ${provider.name}: ${err.message}`);
    } finally {
      setConnecting(null);
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Mail className="w-5 h-5 text-primary" />
          <div>
            <CardTitle className="font-mono text-xs">Email Providers</CardTitle>
            <CardDescription className="font-mono text-[9px]">
              Connect email accounts for automated threat scanning
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {EMAIL_PROVIDERS.map(provider => {
              const Icon = provider.icon;
              const isConnected = emailProviders.includes(provider.id);
              const isConnecting = connecting === provider.id;
              
              return (
                <motion.div
                  key={provider.id}
                  whileHover={{ scale: 1.02 }}
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${
                    isConnected
                      ? 'bg-green-500/10 border-green-500/30'
                      : provider.connectorId
                        ? 'bg-card border-border hover:border-primary/30'
                        : 'bg-secondary/30 border-border/50 opacity-60'
                  }`}
                  onClick={() => !isConnected && provider.connectorId && handleConnectEmail(provider)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${provider.color}`} />
                      <div>
                        <p className="font-mono text-[10px] font-semibold">{provider.name}</p>
                        <p className="font-mono text-[8px] text-muted-foreground">
                          {isConnected ? 'Connected' : provider.connectorId ? 'Click to connect' : 'Coming soon'}
                        </p>
                      </div>
                    </div>
                    {isConnected && <CheckCircle2 className="w-3 h-3 text-green-400" />}
                    {isConnecting && <Loader2 className="w-3 h-3 text-primary animate-spin" />}
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-3 h-3 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-mono text-[9px] font-semibold text-green-400">Gmail Connected (Shared)</p>
                <p className="font-mono text-[8px] text-muted-foreground mt-0.5">
                  Gmail is ready for automated scanning. Outlook requires individual connection.
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}