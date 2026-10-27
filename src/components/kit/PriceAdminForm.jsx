import React, { useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { base44 } from '@/api/base44Client';

export default function PriceAdminForm({ settings, onSaved }) {
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('usd');
  const [productName, setProductName] = useState('SIFT AI Full Kit');
  const [enabled, setEnabled] = useState(false);
  const [discount, setDiscount] = useState('16.67');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!settings) return;
    setPrice(settings.price_cents ? (settings.price_cents / 100).toFixed(2) : '');
    setCurrency(settings.currency || 'usd');
    setProductName(settings.product_name || 'SIFT AI Full Kit');
    setEnabled(Boolean(settings.paid_tier_enabled));
    setDiscount(
      settings.annual_discount_percent === undefined || settings.annual_discount_percent === null
        ? '16.67'
        : String(settings.annual_discount_percent)
    );
  }, [settings]);

  const save = async () => {
    setMessage('');
    const cents = Math.round(Number(price) * 100);
    if (!Number.isFinite(cents) || cents < 50) {
      setMessage('Enter a price of at least 0.50. Stripe does not accept charges below that.');
      return;
    }
    setSaving(true);
    try {
      const data = {
        price_cents: cents,
        currency: currency.trim().toLowerCase() || 'usd',
        product_name: productName.trim() || 'SIFT AI Full Kit',
        paid_tier_enabled: enabled,
        annual_discount_percent: Math.min(Math.max(Number(discount) || 0, 0), 90)
      };
      if (settings?.id) await base44.entities.KitSettings.update(settings.id, data);
      else await base44.entities.KitSettings.create(data);
      setMessage('Saved. The pricing page picks this up straight away.');
      onSaved?.();
    } catch (err) {
      setMessage(err.response?.data?.error || err.message || 'Could not save the price.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="price">Price</Label>
          <Input id="price" type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Set your price" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency">Currency</Label>
          <Input id="currency" value={currency} onChange={(e) => setCurrency(e.target.value)} maxLength={3} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="product">Name on the receipt</Label>
          <Input id="product" value={productName} onChange={(e) => setProductName(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="annual">Yearly discount for Pro (%)</Label>
        <Input
          id="annual"
          type="number"
          min="0"
          max="90"
          step="0.01"
          value={discount}
          onChange={(e) => setDiscount(e.target.value)}
          className="max-w-[160px]"
        />
        <p className="max-w-2xl text-xs text-muted-foreground">
          Pro's yearly price is twelve months at the current monthly price, less this discount, charged as one payment.
          16.67 is two months free, the yearly offer the app already shows. Set 0 to sell the year with no discount.
          At most 90.
        </p>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-secondary/20 p-4">
        <div>
          <Label htmlFor="enabled" className="text-sm font-medium">
            Checkout open
          </Label>
          <p className="text-xs text-muted-foreground">While this is off, the buy button stays closed and nobody is charged.</p>
        </div>
        <Switch id="enabled" checked={enabled} onCheckedChange={setEnabled} />
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save price
        </Button>
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </div>
    </div>
  );
}