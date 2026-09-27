import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Key, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import ApiKeyRow from './ApiKeyRow';
import NewKeyDialog from './NewKeyDialog';

export default function ApiKeyManager() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [created, setCreated] = useState(null);

  const { data: keys = [], isLoading } = useQuery({
    queryKey: ['apiKeys'],
    queryFn: () => base44.entities.ApiKey.list('-created_date'),
  });

  const createKey = useMutation({
    mutationFn: async (payload) => (await base44.functions.invoke('createApiKey', payload)).data,
    onSuccess: (data) => { setCreated(data); qc.invalidateQueries({ queryKey: ['apiKeys'] }); },
    onError: (e) => toast.error(e?.response?.data?.error || 'Failed to create key'),
  });

  const revokeKey = useMutation({
    mutationFn: (id) => base44.entities.ApiKey.update(id, { status: 'revoked' }),
    onSuccess: () => { toast.success('Key revoked'); qc.invalidateQueries({ queryKey: ['apiKeys'] }); },
  });

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base flex items-center gap-2"><Key className="w-4 h-4 text-primary" /> Your keys</CardTitle>
          <CardDescription className="text-xs mt-1">A key is like a password that lets your app use SiftAI. Keep the secret part private.</CardDescription>
        </div>
        <Button size="sm" className="gap-2" onClick={() => { setCreated(null); setOpen(true); }}>
          <Plus className="w-4 h-4" /> New key
        </Button>
      </CardHeader>
      <CardContent className="p-0 divide-y divide-border border-t border-border">
        {isLoading && <div className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>}
        {!isLoading && keys.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">You don't have a key yet. Tap "New key" to make one — it takes a second.</div>
        )}
        {keys.map((k) => <ApiKeyRow key={k.id} apiKey={k} onRevoke={(id) => revokeKey.mutate(id)} />)}
      </CardContent>
      <NewKeyDialog
        open={open}
        onOpenChange={(o) => { setOpen(o); if (!o) setCreated(null); }}
        onCreate={(p) => createKey.mutate(p)}
        created={created}
        creating={createKey.isPending}
      />
    </Card>
  );
}