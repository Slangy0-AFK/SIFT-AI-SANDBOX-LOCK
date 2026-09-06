import React from 'react';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';

export default function CodeBlock({ code, label }) {
  return (
    <div className="space-y-1">
      {label && <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>}
      <div className="relative">
        <pre className="text-xs bg-secondary/60 border border-border rounded-lg p-3 overflow-x-auto whitespace-pre font-mono text-foreground/90">{code}</pre>
        <Button
          size="icon"
          variant="ghost"
          className="absolute top-1 right-1 h-7 w-7"
          onClick={() => { navigator.clipboard.writeText(code); toast.success('Copied'); }}
        >
          <Copy className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}