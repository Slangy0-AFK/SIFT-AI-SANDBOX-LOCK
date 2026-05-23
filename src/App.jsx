import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import ZeroDayCenter from '@/pages/ZeroDayCenter';
import ThreatIntelligence from '@/pages/ThreatIntelligence';
import FirewallDashboard from '@/pages/FirewallDashboard';
import ThreatScanner from '@/pages/ThreatScanner';
import MirrorEnvironment from '@/pages/MirrorEnvironment';
import ThreatLog from '@/pages/ThreatLog';
import UserProfile from '@/pages/UserProfile';
import SubscriptionPage from '@/pages/SubscriptionPage';
import SettingsPage from '@/pages/SettingsPage';
import PageNotFound from '@/lib/PageNotFound';
import useRealTimeSync from '@/hooks/useRealTimeSync';

export default function App() {
  useRealTimeSync();
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/zero-day" element={<ZeroDayCenter />} />
          <Route path="/threat-intel" element={<ThreatIntelligence />} />
          <Route path="/firewall" element={<FirewallDashboard />} />
          <Route path="/threat-scanner" element={<ThreatScanner />} />
          <Route path="/mirror-env" element={<MirrorEnvironment />} />
          <Route path="/threat-log" element={<ThreatLog />} />
          <Route path="/profile" element={<UserProfile />} />
          <Route path="/subscription" element={<SubscriptionPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<PageNotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
