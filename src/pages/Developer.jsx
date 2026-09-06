import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Code2 } from 'lucide-react';
import ApiKeyManager from '@/components/developer/ApiKeyManager';
import WidgetDocs from '@/components/developer/WidgetDocs';
import ScanApiDocs from '@/components/developer/ScanApiDocs';

export default function Developer() {
  const { data: keys = [] } = useQuery({
    queryKey: ['apiKeys'],
    queryFn: () => base44.entities.ApiKey.list('-created_date'),
  });
  const firstActive = keys.find((k) => k.status === 'active');

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Code2 className="w-6 h-6 text-primary" /> Developer API
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          Add SiftAI to your own website or app. Embed the human verification widget on forms, or call the scan API
          to check links, IPs, and messages from your backend.
        </p>
      </div>

      <ApiKeyManager />

      <div className="grid lg:grid-cols-2 gap-6">
        <WidgetDocs siteKey={firstActive?.site_key} />
        <ScanApiDocs />
      </div>
    </div>
  );
}