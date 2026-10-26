import React from 'react';
import { Outlet } from 'react-router-dom';
import SiteNav from './SiteNav';
import SiteFooter from './SiteFooter';

export default function SiteLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteNav />
      <main className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}