import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ShieldAlert, Code2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import GuardPlayground from '@/components/guard/GuardPlayground';
import GuardEventList from '@/components/guard/GuardEventList';

export default function PromptGuard() {
  const qc = useQueryClient();
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-primary" /> Prompt Guard
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            Test any prompt, document, or model reply against prompt-injection, jailbreak, data-exfiltration, and tool-abuse detection.
          </p>
        </div>
        <Link to="/developer"><Button variant="outline"><Code2 className="w-4 h-4" /> Get API key</Button></Link>
      </div>
      <Card><CardContent className="pt-6"><GuardPlayground allowDeep onScanned={() => qc.invalidateQueries({ queryKey: ['guardEvents'] })} /></CardContent></Card>
      <GuardEventList userId={user?.id} />
    </div>
  );
}