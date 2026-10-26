import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LIST_TYPES } from '@/lib/scanLabels';
import { Loader2, Plus, ShieldAlert, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function ListEntryForm({ userId, onAdded }) {
  const [kind, setKind] = useState('block');
  const [itemType, setItemType] = useState('domain');
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const add = async () => {
    const clean = value.trim();
    setError('');
    if (!clean) {
      setError('Type the link, domain, app name or file hash you want on the list.');
      return;
    }
    if ((itemType === 'domain' || itemType === 'url') && !clean.includes('.')) {
      setError('A link or a domain has a dot in it, like example.com.');
      return;
    }
    if (itemType === 'hash' && !/^[a-f0-9]{8,64}$/i.test(clean)) {
      setError('A file hash is made of letters a-f and numbers, 32 to 64 characters long.');
      return;
    }

    setBusy(true);
    try {
      await base44.entities.ListEntry.create({
        user_id: userId,
        kind,
        item_type: itemType,
        value: clean.slice(0, 300),
        note: note.trim().slice(0, 300)
      });
      toast.success(kind === 'block' ? 'Added to your blocklist.' : 'Added to your allowlist.');
      setValue('');
      setNote('');
      onAdded?.();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'That did not save. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="font-heading text-sm font-bold">Add an item to a list</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Blocks come back flagged. Allows are treated as approved by your list when you check that exact item.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={kind === 'block' ? 'destructive' : 'outline'}
          className="gap-2 font-mono text-xs"
          onClick={() => setKind('block')}
        >
          <ShieldAlert className="h-3.5 w-3.5" /> Block it
        </Button>
        <Button
          size="sm"
          variant={kind === 'allow' ? 'default' : 'outline'}
          className={cn('gap-2 font-mono text-xs')}
          onClick={() => setKind('allow')}
        >
          <ShieldCheck className="h-3.5 w-3.5" /> Allow it
        </Button>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="font-mono text-xs">What it is</Label>
          <Select value={itemType} onValueChange={setItemType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LIST_TYPES.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="list-value" className="font-mono text-xs">The item</Label>
          <Input
            id="list-value"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={itemType === 'app' ? 'Flashlight Pro' : itemType === 'hash' ? 'd41d8cd98f00b204...' : 'example.com'}
            className="font-mono text-xs"
            maxLength={300}
          />
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <Label htmlFor="list-note" className="font-mono text-xs">Note to yourself (optional)</Label>
        <Input
          id="list-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Why is this on the list?"
          maxLength={300}
        />
      </div>

      {error && <p className="mt-3 font-mono text-xs text-destructive">{error}</p>}

      <Button onClick={add} disabled={busy} className="mt-4 gap-2 font-mono text-xs">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
        {kind === 'block' ? 'Add to blocklist' : 'Add to allowlist'}
      </Button>
    </div>
  );
}