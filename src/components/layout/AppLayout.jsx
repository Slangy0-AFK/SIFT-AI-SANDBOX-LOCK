import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAlertNotifications } from '../notifications/useAlertNotifications';
import TermsAgreementModal from '../onboarding/TermsAgreementModal';
import { useAutoRegisterDevice } from '@/hooks/useAutoRegisterDevice';

function AlertWatcher() {
  useAlertNotifications();
  return null;
}

export default function AppLayout() {
  useAutoRegisterDevice();

  return (
    <div className="min-h-screen bg-background relative">
      <div 
        className="fixed inset-0 z-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80&w=2034")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        }}
      />
      <div className="fixed inset-0 z-0 bg-background/90 pointer-events-none" />
      
      <div className="relative z-10">
        <AlertWatcher />
        <TermsAgreementModal />
        <Sidebar />
      {/* desktop: offset for sidebar | mobile: offset for top bar + bottom nav */}
        <main className="lg:ml-64 min-h-screen pt-0 lg:pt-0 mt-14 lg:mt-0 pb-32 lg:pb-16">
          <Outlet />
        </main>
      </div>
    </div>
  );
}