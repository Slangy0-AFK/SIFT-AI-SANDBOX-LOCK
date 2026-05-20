import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Shield, Activity, Lock, Layers, Bug, FileText, Settings, Swords, CreditCard, Radiation } from 'lucide-react';

const navItems = [
  { path: '/', icon: Activity, label: 'Command Center' },
  { path: '/zero-day', icon: Radiation, label: 'Zero-Day Center', highlight: true },
  { path: '/attack-sim', icon: Swords, label: 'Attack Simulator' },
  { path: '/base-chain', icon: Layers, label: 'Base Chain' },
  { path: '/paradox-lock', icon: Lock, label: 'Paradox Lock' },
  { path: '/mirror-env', icon: Bug, label: 'Mirror Environment' },
  { path: '/threat-log', icon: FileText, label: 'Threat Log' },
  { path: '/subscription', icon: CreditCard, label: 'Subscription' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-card border-r border-border flex flex-col z-50">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Shield className="w-8 h-8 text-primary" />
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
          </div>
          <div>
            <h1 className="font-mono text-sm font-bold text-foreground tracking-wider">AEGIS</h1>
            <p className="font-mono text-[10px] text-muted-foreground tracking-widest">QUANTUM SHIELD</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ path, icon: Icon, label, highlight }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-mono text-xs tracking-wide transition-all duration-200 ${
                isActive
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : highlight
                  ? 'text-accent border border-accent/20 hover:bg-accent/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Status */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-2 px-3 py-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="font-mono text-[10px] text-muted-foreground tracking-wider">SYSTEM ONLINE</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
          <span className="font-mono text-[10px] text-muted-foreground tracking-wider">QRNG ACTIVE</span>
        </div>
      </div>
    </aside>
  );
}