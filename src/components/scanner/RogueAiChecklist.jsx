import React, { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

// The rogue-AI checklist: seven things a person can look at themselves when a
// file or an app might be running an AI they did not ask for. It is scored
// separately from the feeds and needs no outside service.
const ITEMS = [
  { id: 'app_package', weight: 2, text: 'The app or package name copies a well-known app, or you cannot tell what it actually is.' },
  { id: 'publisher', weight: 2, text: 'You cannot find who published it, or the publisher is not the one you expected.' },
  { id: 'permissions', weight: 3, text: 'It asks for permissions it does not need: contacts, SMS, camera, microphone, accessibility, device admin, or location all the time.' },
  { id: 'background', weight: 2, text: 'It runs in the background, starts itself at boot, or keeps a service running for no reason you know.' },
  { id: 'network', weight: 2, text: 'It talks to endpoints you do not recognise, or it never says where your data goes.' },
  { id: 'ai_sdk', weight: 3, text: 'It bundles a known AI SDK, or downloads models or model weights at run time, without telling you.' },
  { id: 'blocklist', weight: 2, text: 'It is already on your blocklist.' }
];

const MAX_SCORE = ITEMS.reduce((sum, item) => sum + item.weight, 0);

export default function RogueAiChecklist({ onChange }) {
  const [marked, setMarked] = useState([]);

  const toggle = (id, weight, checked) => {
    const next = checked ? [...marked, { id, weight }] : marked.filter((entry) => entry.id !== id);
    setMarked(next);
    const score = next.reduce((sum, entry) => sum + entry.weight, 0);
    onChange({ hit: next.length > 0, score, marked: next.map((entry) => entry.id) });
  };

  const score = marked.reduce((sum, entry) => sum + entry.weight, 0);
  const percent = Math.round((score / MAX_SCORE) * 100);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="font-mono text-xs font-bold uppercase tracking-wide text-muted-foreground">Rogue-AI checklist (scored separately)</p>
      <p className="mt-2 text-sm text-muted-foreground">
        This is your own review of the app or file, not a feed result. Tick anything you can see for yourself.
      </p>

      <ul className="mt-4 space-y-3">
        {ITEMS.map((item) => (
          <li key={item.id} className="flex items-start gap-3">
            <Checkbox
              id={`rogue-${item.id}`}
              checked={marked.some((entry) => entry.id === item.id)}
              onCheckedChange={(checked) => toggle(item.id, item.weight, checked === true)}
            />
            <Label htmlFor={`rogue-${item.id}`} className="text-sm font-normal leading-relaxed text-muted-foreground">
              {item.text}
            </Label>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap items-baseline gap-3">
        <span className="font-mono text-xs text-foreground">Score {score} of {MAX_SCORE} ({percent}%)</span>
        <span className="font-mono text-[11px] text-muted-foreground">
          {marked.length === 0
            ? 'Nothing ticked. This list alone never calls something clean.'
            : `${marked.length} item${marked.length === 1 ? '' : 's'} raised — this cannot read “no hits in the checks run”.`}
        </span>
      </div>
      {percent >= 50 && (
        <p className="mt-3 text-sm text-destructive">
          That is a lot of warnings for one app. Remove it, or limit what it can reach, and change the passwords you used on that
          device.
        </p>
      )}
    </div>
  );
}