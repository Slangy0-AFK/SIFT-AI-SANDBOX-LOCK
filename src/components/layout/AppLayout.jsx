import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAlertNotifications } from '../notifications/useAlertNotifications';
import TermsAgreementModal from '../onboarding/TermsAgreementModal';
import useParadoxBackground from '@/hooks/useParadoxBackground';
import { useAutoRegisterDevice } from '@/hooks/useAutoRegisterDevice';

function AlertWatcher() {
  useAlertNotifications();
  return null;
}

function ParadoxWatcher() {
  useParadoxBackground();
  return null;
}

export default function AppLayout() {
  useAutoRegisterDevice();

  return (
    <div className="min-h-screen bg-background">
      <AlertWatcher />
      <ParadoxWatcher />
      <TermsAgreementModal />
      <Sidebar />
      {/* desktop: offset for sidebar | mobile: offset for top bar + bottom nav */}
      <main className="md:ml-64 min-h-screen pt-0 md:pt-0 mt-14 md:mt-0 pb-32 md:pb-16">
        <Outlet />
      </main>
    </div>
  );
}