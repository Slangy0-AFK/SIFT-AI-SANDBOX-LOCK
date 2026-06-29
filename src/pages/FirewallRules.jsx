import React from 'react';
import FirewallManager from '../components/firewall/FirewallManager';

export default function FirewallRules() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="font-mono text-xl font-bold tracking-wider text-foreground">FIREWALL RULES</h1>
        <p className="font-mono text-xs text-muted-foreground tracking-widest mt-1">
          CONFIGURE AND MANAGE TRAFFIC FILTERING RULES
        </p>
      </div>
      <FirewallManager />
    </div>
  );
}