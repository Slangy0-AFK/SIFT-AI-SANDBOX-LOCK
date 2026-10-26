import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import LimitsNote from '@/components/kit/LimitsNote';
import { ADVICE, UNITS, planSizing } from '@/lib/kitSizing';

export default function SizingCalculator() {
  const [scale, setScale] = useState('5000');
  const [unit, setUnit] = useState('rows');

  const plan = planSizing(scale);
  const unitMeta = UNITS.find((item) => item.value === unit) || UNITS[0];

  return (
    <div className="mx-auto max-w-4xl px-4 py-14">
      <p className="font-heading text-xs uppercase tracking-widest text-primary">Sizing Calculator</p>
      <h1 className="mt-3 font-heading text-3xl font-bold tracking-tight sm:text-4xl">Size the job so a crash can resume.</h1>
      <p className="mt-4 text-muted-foreground">
        From the computer-crash-fix- repo. Enter how big the job is, and get a starting point for the batch size, the queue, and
        how many batches to run at once, plus what to checkpoint so a crash picks up where it stopped instead of starting over.
      </p>

      <div className="mt-8 grid gap-6 md:grid-cols-5">
        <div className="rounded-xl border border-border bg-card p-5 md:col-span-2">
          <div className="space-y-2">
            <Label htmlFor="scale">How big is the job?</Label>
            <Input id="scale" type="number" min="1" value={scale} onChange={(event) => setScale(event.target.value)} />
          </div>

          <div className="mt-4 space-y-2">
            <Label htmlFor="unit">Measured in</Label>
            <Select value={unit} onValueChange={setUnit}>
              <SelectTrigger id="unit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UNITS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{unitMeta.note}</p>
          </div>
        </div>

        <div className="md:col-span-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Batch size</p>
              <p className="mt-1 font-heading text-2xl font-bold">{plan.batchSize}</p>
              <p className="text-xs text-muted-foreground">{unitMeta.label} per batch</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Queue size</p>
              <p className="mt-1 font-heading text-2xl font-bold">{plan.queueSize}</p>
              <p className="text-xs text-muted-foreground">batches to get through</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Running at once</p>
              <p className="mt-1 font-heading text-2xl font-bold">{plan.concurrency}</p>
              <p className="text-xs text-muted-foreground">batches in flight</p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-border bg-card p-5">
            <p className="font-heading text-sm font-semibold">Checkpointing, in short</p>
            <ul className="mt-3 space-y-3">
              {ADVICE.map((item) => (
                <li key={item.title} className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.text}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-muted-foreground">
              With {plan.queueSize} batches of {plan.batchSize} {unitMeta.label}, a crash costs you one batch instead of the whole
              job.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-border bg-secondary/20 p-5">
        <p className="font-heading text-sm font-semibold">How these numbers are worked out</p>
        <ul className="mt-3 space-y-2 font-mono text-xs text-muted-foreground">
          <li>batch size = ceil(scale / 24), kept between 8 and 1000</li>
          <li>queue size = ceil(scale / batch size)</li>
          <li>running at once = queue size / 6, kept between 1 and 8</li>
        </ul>
        <p className="mt-3 text-sm text-muted-foreground">
          The divisors target roughly 24 batches: enough that each one is short, few enough that the queue is easy to read.
        </p>
      </div>

      <LimitsNote className="mt-8">
        These are starting points, not measurements of your workload. A batch of slow network calls behaves nothing like a batch of
        local rows. Run a small job, watch how long a batch really takes, and then move the numbers.
      </LimitsNote>
    </div>
  );
}