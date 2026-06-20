import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Shield, Activity, Bug, FileText, Settings, CreditCard, Radiation, Menu, X, User, ShieldAlert, Mail, ChevronLeft } from 'lucide-react';
import NotificationBell from '../notifications/NotificationBell';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const allNavItems = [
  { path: '/dashboard', icon: Activity, label: 'Command Center' },
  { path: '/zero-day', icon: Radiation, label: 'Zero-Day Center', highlight: true },
  { path: '/threat-intel', icon: ShieldAlert, label: 'Threat Intel', highlight: true },
  { path: '/firewall', icon: Shield, label: 'Firewall' },
  { path: '/threat-scanner', icon: Mail, label: 'Threat Scanner', highlight: true },

  { path: '/mirror-env', icon: Bug, label: 'Mirror Environment' },
  { path: '/threat-log', icon: FileText, label: 'Threat Log' },
  { path: '/profile', icon: User, label: 'Profile' },
  { path: '/subscription', icon: CreditCard, label: 'Subscription' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

// Bottom nav shows 5 most-used items on mobile
const mobileBottomNav = [
  { path: '/', icon: Activity, label: 'Dashboard' },
  { path: '/zero-day', icon: Radiation, label: 'Zero-Day', highlight: true },
  { path: '/threat-log', icon: FileText, label: 'Threats' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

const ROOT_PATHS = ['/', '/dashboard'];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isRootTab = ROOT_PATHS.includes(location.pathname);
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const isAdmin = user?.role === 'admin';
  const navItems = allNavItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <>
      {/* ── DESKTOP SIDEBAR (hidden on mobile) ── */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 bg-card border-r border-border flex-col z-50">
        {/* Logo */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Shield className="w-8 h-8 text-primary" />
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
            </div>
            <div className="flex-1">
              <h1 className="font-mono text-sm font-bold text-foreground tracking-wider">AEGIS</h1>
              <p className="font-mono text-[10px] text-muted-foreground tracking-widest">QUANTUM SHIELD</p>
            </div>
            <NotificationBell />
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
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

      {/* ── MOBILE TOP BAR ── */}
      <header
        className="md:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border px-4 py-3 flex items-center justify-between"
        style={{ paddingTop: `calc(0.75rem + env(safe-area-inset-top))` }}
      >
        <div className="flex items-center gap-2">
          {!isRootTab && (
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 rounded-lg hover:bg-secondary transition-colors mr-1"
              aria-label="Go back"
            >
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
          <div className="relative">
            <Shield className="w-6 h-6 text-primary" />
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          </div>
          <div>
            <span className="font-mono text-sm font-bold text-foreground tracking-wider">AEGIS</span>
            <span className="font-mono text-[9px] text-muted-foreground tracking-widest ml-2">QUANTUM SHIELD</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
          >
            <Menu className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </header>

      {/* ── MOBILE FULL MENU DRAWER ── */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[100] flex">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileMenuOpen(false)} />
          {/* Drawer */}
          <div className="relative ml-auto w-80 h-full bg-card border-l border-border flex flex-col overflow-visible">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-foreground tracking-wider">NAVIGATION</span>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1 rounded hover:bg-secondary">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              {navItems.map(({ path, icon: Icon, label, highlight }) => {
                const isActive = location.pathname === path;
                return (
                  <Link
                    key={path}
                    to={path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-lg font-mono text-xs tracking-wide transition-all duration-200 ${
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
            <div className="p-4 border-t border-border">
              <div className="flex items-center gap-2 px-3 py-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="font-mono text-[10px] text-muted-foreground tracking-wider">SYSTEM ONLINE</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border flex" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {mobileBottomNav.map(({ path, icon: Icon, label, highlight }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 transition-colors ${
                isActive
                  ? 'text-primary'
                  : highlight
                  ? 'text-accent'
                  : 'text-muted-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="font-mono text-[8px] tracking-wide">{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}