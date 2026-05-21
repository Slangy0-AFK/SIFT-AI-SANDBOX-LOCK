import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAlertNotifications } from '../notifications/useAlertNotifications';
import TermsAgreementModal from '../onboarding/TermsAgreementModal';

function AlertWatcher() {
  useAlertNotifications();
  return null;
}

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <AlertWatcher />
      <TermsAgreementModal />
      <Sidebar />
      {/* desktop: offset for sidebar | mobile: offset for top bar + bottom nav */}
      <main className="md:ml-64 min-h-screen pt-0 md:pt-0 mt-14 md:mt-0 mb-16 md:mb-0">
        <Outlet />
      </main>
    </div>
  );
}