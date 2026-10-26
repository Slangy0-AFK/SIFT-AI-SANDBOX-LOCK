import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import LimitsNote from '@/components/kit/LimitsNote';
import ScalerChart from '@/components/kit/ScalerChart';
import { DEFAULT_A0, SAMPLE_TS, formatSetting, formatT, setting } from '@/lib/kitScaler';

const BEHAVIOUR = [
  'For every T above 1, the value stays above 1.',
  'As T grows, the value gets smaller.',
  'It keeps heading toward 1 without ever reaching it.',
  'At T = 1 it is undefined, because ln(1) is 0 and you cannot divide by zero, so a real deployment needs an offset.',
  'Below 1, ln(T) is negative and the value drops under 1, which is why the curve starts at T = 2.'
];

export default function Scaler() {
  const [a0, setA0] = useState(String(DEFAULT_A0));
  const [t, setT] = useState('100');

  const a0Number = Number(a0);
  const tNumber = Number(t);
  const value = setting(tNumber, a0Number);

  return (
    <div className="mx-auto max-w-4xl px-4 py-14">
      <p className="font-heading text-xs uppercase tracking-widest text-primary">From the paper</p>
      <h1 className="mt-3 font-heading text-3xl font-bold tracking-tight sm:text-4xl">The floor dial, Setting(T).</h1>
      <p className="mt-4 text-muted-foreground">
        Setting(T) = 1 + A0 / ln(T). A0 defaults to 314. It is not a new theory and it is not a proof of anything: it is a dial you
        can set per industry to decide how much room an agent gets, and how much it gives back as the work scales.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="a0">A0</Label>
          <Input id="a0" type="number" min="0" step="1" value={a0} onChange={(event) => setA0(event.target.value)} />
          <p className="text-xs text-muted-foreground">314 by default.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="t">T</Label>
          <Input id="t" type="number" min="0" step="1" value={t} onChange={(event) => setT(event.target.value)} />
          <p className="text-xs text-muted-foreground">Any value above 1.</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Setting({formatT(tNumber)})</p>
          <p className="mt-1 font-heading text-2xl font-bold">{formatSetting(value)}</p>
          {value === null && <p className="text-xs text-muted-foreground">Undefined at T = 1.</p>}
          {value !== null && value < 1 && <p className="text-xs text-muted-foreground">Below 1, because T is under 1.</p>}
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-border bg-card p-4">
        <ScalerChart a0={a0Number} />
        <p className="mt-3 text-xs text-muted-foreground">
          The horizontal line is 1. The curve stays above it, drops as T grows, and settles toward it. Both axes are scaled, so
          equal steps along the bottom are ten times the T each time.
        </p>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="font-heading text-sm font-semibold">What the curve does</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {BEHAVIOUR.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-muted-foreground">
            Close to T = 1 the value shoots up fast: about 31,600 at T = 1.01. That is why the curve starts at 2 and why an offset is
            needed in practice.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <p className="font-heading text-sm font-semibold">A few values</p>
          <div className="mt-3 divide-y divide-border text-sm">
            <div className="flex justify-between py-2 text-muted-foreground">
              <span>T</span>
              <span>Setting(T)</span>
            </div>
            {SAMPLE_TS.map((sample) => (
              <div key={sample} className="flex justify-between py-2">
                <span>{formatT(sample)}</span>
                <span className="font-mono">{formatSetting(setting(sample, a0Number))}</span>
              </div>
            ))}
            <div className="flex justify-between py-2 text-muted-foreground">
              <span>1</span>
              <span className="font-mono">undefined</span>
            </div>
          </div>
        </div>
      </div>

      <LimitsNote className="mt-8">
        Read this as a safety or creativity floor you can set per industry, not as a result. It says nothing about whether a model is
        safe, and it does not make one smarter. If a floor is right for your work, that is a judgement call you make, not something
        this curve proves.
      </LimitsNote>
    </div>
  );
}