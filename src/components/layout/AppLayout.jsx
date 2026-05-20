import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAlertNotifications } from '../notifications/useAlertNotifications';

function AlertWatcher() {
  useAlertNotifications();
  return null;
}

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <AlertWatcher />
      <Sidebar />
      <main className="ml-64 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}