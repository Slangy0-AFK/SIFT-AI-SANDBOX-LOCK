import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Shield, Activity, Bug, FileText, Settings, CreditCard, Radiation, Menu, X, User, ShieldAlert, Mail, ChevronLeft, MessageCircle, Key } from 'lucide-react';
import NotificationBell from '../notifications/NotificationBell';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

import { ShieldCheck, Database, Code2 } from 'lucide-react';

const allNavItems = [
  { path: '/chat', icon: MessageCircle, label: 'Chat with SIFT AI' },
  { path: '/prompt-guard', icon: ShieldCheck, label: 'Check a Message' },
  { path: '/scanner', icon: Activity, label: 'Device Tools' },
  { path: '/developer', icon: Code2, label: 'Add to My App' },
  { path: '/profile', icon: User, label: 'Profile' },
  { path: '/subscription', icon: CreditCard, label: 'Subscription' },
  { path: '/license', icon: Key, label: 'My License' },
  { path: '/settings', icon: Settings, label: 'Settings' },
  { path: '/admin/tickets', icon: Mail, label: 'Support Tickets', adminOnly: true },
];

const mobileBottomNav = [
  { path: '/prompt-guard', icon: ShieldCheck, label: 'Check' },
  { path: '/scanner', icon: Activity, label: 'Tools' },
  { path: '/developer', icon: Code2, label: 'My App' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

const ROOT_PATHS = ['/', '/prompt-guard'];

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
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-64 bg-card border-r border-border flex-col z-50">
        {/* Logo */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img 
                src="https://media.base44.com/images/public/6a0db3181169f42924052c0d/650b247a7_amazon.PNG" 
                alt="Sift.ai Logo" 
                className="h-10 w-auto rounded-sm object-contain"
              />
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse border-2 border-card" />
            </div>
            <div className="flex-1" />
            <NotificationBell />
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const { path, icon: Icon, label, highlight } = item;
            const isActive = location.pathname === path;
            return (
              <Link
                key={path || label}
                to={path}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200 ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : highlight
                    ? 'text-fuchsia-400 hover:bg-fuchsia-400/10'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
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
            <span className="text-xs text-muted-foreground">System online</span>
          </div>
        </div>
      </aside>

      {/* ── MOBILE TOP BAR ── */}
      <header
        className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border px-4 py-3 flex items-center justify-between"
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
            <img 
              src="https://media.base44.com/images/public/6a0db3181169f42924052c0d/650b247a7_amazon.PNG" 
              alt="Sift.ai Logo" 
              className="h-8 w-auto rounded-sm object-contain"
            />
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full animate-pulse border-2 border-card" />
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
        <div className="lg:hidden fixed inset-0 z-[100] flex">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileMenuOpen(false)} />
          {/* Drawer */}
          <div className="relative ml-auto w-80 h-full bg-card border-l border-border flex flex-col overflow-visible">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Navigation</span>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1 rounded hover:bg-secondary">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const { path, icon: Icon, label, highlight } = item;
                const isActive = location.pathname === path;
                return (
                  <Link
                    key={path || label}
                    to={path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors duration-200 ${
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : highlight
                        ? 'text-accent hover:bg-accent/10'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
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
                <span className="text-xs text-muted-foreground">System online</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border flex" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
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
                  ? 'text-fuchsia-400'
                  : 'text-muted-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[11px] font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}