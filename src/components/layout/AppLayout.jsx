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
      <div className="pointer-events-none fixed inset-0 z-0 bg-gradient-to-b from-primary/5 via-background to-background" />
      
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