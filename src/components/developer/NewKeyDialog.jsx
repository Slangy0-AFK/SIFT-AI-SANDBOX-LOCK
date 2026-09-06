import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Copy } from 'lucide-react';
import { toast } from 'sonner';

export default function NewKeyDialog({ open, onOpenChange, onCreate, created, creating }) {
  const [name, setName] = useState('');
  const [domains, setDomains] = useState('');

  const copy = (v) => { navigator.clipboard.writeText(v); toast.success('Copied'); };
  const close = () => { setName(''); setDomains(''); onOpenChange(false); };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(o) : close())}>
      <DialogContent>
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>Save your secret key</DialogTitle>
              <DialogDescription>This is the only time the secret will be shown. Store it somewhere safe.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              {[['Site key (public)', created.site_key], ['Secret key (server only)', created.secret]].map(([label, value]) => (
                <div key={label} className="space-y-1">
                  <Label className="text-xs">{label}</Label>
                  <div className="flex gap-2">
                    <code className="flex-1 text-xs bg-secondary rounded px-2 py-2 break-all">{value}</code>
                    <Button size="icon" variant="outline" onClick={() => copy(value)}><Copy className="w-4 h-4" /></Button>
                  </div>
                </div>
              ))}
              <Button className="w-full" onClick={close}>Done</Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Create API key</DialogTitle>
              <DialogDescription>One key pair works for both the verification widget and the scan API.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. My Store Checkout" />
              </div>
              <div className="space-y-1">
                <Label>Allowed domains (optional)</Label>
                <Input value={domains} onChange={(e) => setDomains(e.target.value)} placeholder="example.com, shop.example.com" />
                <p className="text-xs text-muted-foreground">Restricts where the widget can be embedded. Leave blank to allow any site.</p>
              </div>
              <Button className="w-full" disabled={!name.trim() || creating} onClick={() => onCreate({ name, allowed_domains: domains })}>
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create key'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}