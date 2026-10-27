import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DeviceManager from '@/components/subscription/DeviceManager';

export default function SavedProfiles() {
  const { data: devices = [] } = useQuery({
    queryKey: ['devices'],
    queryFn: () => base44.entities.Device.list('-created_date', 50),
  });

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="font-mono text-xs tracking-wider">REUSABLE SCAN PROFILES</CardTitle>
      </CardHeader>
      <CardContent>
        <DeviceManager devices={devices} plan="pro" />
      </CardContent>
    </Card>
  );
}