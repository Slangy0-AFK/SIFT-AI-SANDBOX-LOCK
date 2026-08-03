import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Shield, Activity, Bug, FileText, Settings, CreditCard, Radiation, Menu, X, User, ShieldAlert, Mail, ChevronLeft } from 'lucide-react';
import NotificationBell from '../notifications/NotificationBell';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

import { ChevronDown, ChevronRight, Filter, ShieldCheck, Database, List } from 'lucide-react';

const allNavItems = [
  { path: '/dashboard', icon: Activity, label: 'Command Center' },
  { path: '/zero-day', icon: Radiation, label: 'Zero-Day Center' },
  { path: '/threat-intel', icon: ShieldAlert, label: 'Threat Intel' },
  { 
    label: 'Firewall', icon: Shield, 
    subItems: [
      { path: '/firewall', label: 'Dashboard' },
      { path: '/firewall/rules', label: 'Rules' },
      { path: '/firewall/logs', label: 'Logs' },
      { path: '/firewall/ip-allowlist', label: 'IP Allowlist' },
      { path: '/firewall/sessions', label: 'Session Management' },
      { path: '/firewall/retention', label: 'Data Retention' },
      { path: '/firewall/audit-logs', label: 'Audit Logs' }
    ]
  },
  { path: '/threat-scanner', icon: ShieldCheck, label: 'Device Scanner' },
  // { path: '/email-scanner', icon: Mail, label: 'Email Scanner' }, // Hidden for now, ready to reinstall
  { path: '/mirror-env', icon: Bug, label: 'Mirror Environment' },
  { path: '/profile', icon: User, label: 'Profile' },
  { path: '/subscription', icon: CreditCard, label: 'Subscription' },
  { path: '/settings', icon: Settings, label: 'Settings' },
  { path: '/about', icon: FileText, label: 'About', adminOnly: false },
  { path: '/contact', icon: Mail, label: 'Contact', adminOnly: false },
];

// Bottom nav shows 5 most-used items on mobile
const mobileBottomNav = [
  { path: '/', icon: Activity, label: 'Dashboard' },
  { path: '/zero-day', icon: Radiation, label: 'Zero-Day' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

const ROOT_PATHS = ['/', '/dashboard'];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({ Firewall: true });

  const toggleMenu = (label) => {
    setExpandedMenus(prev => ({ ...prev, [label]: !prev[label] }));
  };

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
            if (item.subItems) {
              const isSubActive = item.subItems.some(sub => location.pathname === sub.path);
              const SubMenuIcon = item.icon;
              const isExpanded = expandedMenus[item.label];
              
              return (
                <div key={item.label} className="space-y-1">
                  <button 
                    onClick={() => toggleMenu(item.label)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-mono text-xs tracking-wide transition-colors ${
                      isSubActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <SubMenuIcon className="w-4 h-4" />
                      {item.label}
                    </div>
                    {isExpanded ? <ChevronDown className="w-4 h-4 opacity-50" /> : <ChevronRight className="w-4 h-4 opacity-50" />}
                  </button>
                  {isExpanded && (
                  <div className="pl-9 space-y-1">
                    {item.subItems.map(sub => {
                      const isActive = location.pathname === sub.path;
                      return (
                        <Link
                          key={sub.path}
                          to={sub.path}
                          className={`flex items-center px-3 py-2 rounded-lg font-mono text-[11px] tracking-wide transition-all duration-200 ${
                            isActive
                              ? 'bg-primary/10 text-primary border border-primary/20'
                              : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                          }`}
                        >
                          {sub.label}
                        </Link>
                      );
                    })}
                  </div>
                  )}
                </div>
              );
            }

            const { path, icon: Icon, label, highlight } = item;
            const isActive = location.pathname === path;
            return (
              <Link
                key={path || label}
                to={path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-mono text-xs tracking-wide transition-all duration-200 ${
                  isActive
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : highlight
                    ? 'text-fuchsia-400 border border-fuchsia-400/20 hover:bg-fuchsia-400/10'
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
            <span className="font-mono text-xs text-muted-foreground tracking-wider">SYSTEM ONLINE</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
            <span className="font-mono text-xs text-muted-foreground tracking-wider">QRNG ACTIVE</span>
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
              <span className="font-mono text-xs font-bold text-foreground tracking-wider">NAVIGATION</span>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1 rounded hover:bg-secondary">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                if (item.subItems) {
                  const SubMenuIconMobile = item.icon;
                  const isExpanded = expandedMenus[item.label];
                  const isSubActive = item.subItems.some(sub => location.pathname === sub.path);
                  
                  return (
                    <div key={item.label} className="space-y-1">
                      <button 
                        onClick={() => toggleMenu(item.label)}
                        className={`w-full flex items-center justify-between px-3 py-3 rounded-lg font-mono text-xs tracking-wide transition-colors ${
                          isSubActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <SubMenuIconMobile className="w-4 h-4" />
                          {item.label}
                        </div>
                        {isExpanded ? <ChevronDown className="w-4 h-4 opacity-50" /> : <ChevronRight className="w-4 h-4 opacity-50" />}
                      </button>
                      {isExpanded && (
                      <div className="pl-9 space-y-1">
                        {item.subItems.map(sub => {
                          const isActive = location.pathname === sub.path;
                          return (
                            <Link
                              key={sub.path}
                              to={sub.path}
                              onClick={() => setMobileMenuOpen(false)}
                              className={`flex items-center px-3 py-2 rounded-lg font-mono text-[11px] tracking-wide transition-all duration-200 ${
                                isActive
                                  ? 'bg-primary/10 text-primary border border-primary/20'
                                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                              }`}
                            >
                              {sub.label}
                            </Link>
                          );
                        })}
                      </div>
                      )}
                    </div>
                  );
                }

                const { path, icon: Icon, label, highlight } = item;
                const isActive = location.pathname === path;
                return (
                  <Link
                    key={path || label}
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
                <span className="font-mono text-xs text-muted-foreground tracking-wider">SYSTEM ONLINE</span>
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
              <span className="font-mono text-xs tracking-wide">{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}