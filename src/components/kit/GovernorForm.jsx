import React, { useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const TOOL_OPTIONS = [
  { value: 'http_get', label: 'Fetch a web page (only reads)' },
  { value: 'read_file', label: 'Read a file (only reads)' },
  { value: 'db_read', label: 'Read from a database (only reads)' },
  { value: 'send_email', label: 'Send an email (changes something)' },
  { value: 'file_write', label: 'Write a file (changes something)' },
  { value: 'db_write', label: 'Write to a database (changes something)' },
  { value: 'shell_command', label: 'Run a shell command (changes something)' },
  { value: 'deploy', label: 'Deploy a change (changes something)' },
  { value: 'payment', label: 'Move money (changes something)' },
  { value: 'other', label: 'Something not on this list' }
];

const SOURCE_OPTIONS = [
  { value: 'operator', label: 'You, the operator' },
  { value: 'signed_ticket', label: 'A ticket you signed' },
  { value: 'document', label: 'A document or file it read' },
  { value: 'web_page', label: 'A web page' },
  { value: 'email', label: 'An email' },
  { value: 'another_agent', label: 'Another agent' },
  { value: 'unknown', label: 'Not sure' }
];

const EMPTY = {
  tool: 'send_email',
  target: '',
  amount: '0',
  source: 'document',
  based_on_doc: false,
  citation: '',
  kill_switch: false
};

const EXAMPLES = [
  {
    label: 'Email from a file it read',
    draft: { tool: 'send_email', target: 'a customer list', amount: '0', source: 'document', based_on_doc: true, citation: '', kill_switch: false }
  },
  {
    label: 'A $12 charge from a web page',
    draft: { tool: 'payment', target: 'checkout on example.com', amount: '12', source: 'web_page', based_on_doc: false, citation: '', kill_switch: false }
  },
  {
    label: 'You ask it to read a file',
    draft: { tool: 'read_file', target: 'notes.txt', amount: '0', source: 'operator', based_on_doc: false, citation: '', kill_switch: false }
  }
];

export default function GovernorForm({ onSubmit, busy }) {
  const [draft, setDraft] = useState(EMPTY);
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));

  const submit = (event) => {
    event.preventDefault();
    onSubmit({
      tool: draft.tool,
      target: draft.target.trim(),
      amount: Number(draft.amount) || 0,
      source: draft.source,
      based_on_doc: draft.based_on_doc,
      citation: draft.based_on_doc ? draft.citation.trim() : '',
      kill_switch: draft.kill_switch
    });
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map((example) => (
          <button
            key={example.label}
            type="button"
            onClick={() => setDraft({ ...EMPTY, ...example.draft })}
            className="rounded-md border border-border bg-secondary/40 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            {example.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <Label htmlFor="tool">Which tool is the agent about to use?</Label>
        <Select value={draft.tool} onValueChange={(value) => set({ tool: value })}>
          <SelectTrigger id="tool">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TOOL_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="target">What would it act on?</Label>
        <Input
          id="target"
          value={draft.target}
          onChange={(event) => set({ target: event.target.value })}
          placeholder="production database, a customer list, checkout on example.com"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Estimated cost of the action, in dollars</Label>
        <Input
          id="amount"
          type="number"
          min="0"
          step="0.01"
          value={draft.amount}
          onChange={(event) => set({ amount: event.target.value })}
        />
        <p className="text-xs text-muted-foreground">The demo uses a spend cap of $5.00.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="source">Where did the instruction come from?</Label>
        <Select value={draft.source} onValueChange={(value) => set({ source: value })}>
          <SelectTrigger id="source">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SOURCE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3 rounded-lg border border-border bg-secondary/20 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label htmlFor="based_on_doc" className="text-sm font-medium">
              The action says it is working from a document
            </Label>
            <p className="text-xs text-muted-foreground">The citation check only runs when this is on.</p>
          </div>
          <Switch id="based_on_doc" checked={draft.based_on_doc} onCheckedChange={(value) => set({ based_on_doc: value })} />
        </div>

        {draft.based_on_doc && (
          <div className="space-y-2">
            <Label htmlFor="citation">Which part of the document?</Label>
            <Input
              id="citation"
              value={draft.citation}
              onChange={(event) => set({ citation: event.target.value })}
              placeholder="pricing.md line 42"
            />
          </div>
        )}

        <div className="flex items-center justify-between gap-4 border-t border-border pt-3">
          <div>
            <Label htmlFor="kill_switch" className="text-sm font-medium">
              Kill switch engaged
            </Label>
            <p className="text-xs text-muted-foreground">Fail closed. Nothing runs while this is on.</p>
          </div>
          <Switch id="kill_switch" checked={draft.kill_switch} onCheckedChange={(value) => set({ kill_switch: value })} />
        </div>
      </div>

      <Button type="submit" disabled={busy} className="w-full gap-2 sm:w-auto">
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking...
          </>
        ) : (
          <>
            <ShieldCheck className="h-4 w-4" />
            Seal and check this action
          </>
        )}
      </Button>
    </form>
  );
}