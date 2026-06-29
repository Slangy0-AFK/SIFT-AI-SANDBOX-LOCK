import React from 'react';
import FirewallLogViewer from '../components/firewall/FirewallLogViewer';

export default function FirewallLogs() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="font-mono text-xl font-bold tracking-wider text-foreground">FIREWALL LOGS</h1>
        <p className="font-mono text-xs text-muted-foreground tracking-widest mt-1">
          REAL-TIME TRAFFIC MONITORING AND THREAT DETECTION
        </p>
      </div>
      <FirewallLogViewer />
    </div>
  );
}