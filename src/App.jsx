import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import Dashboard from '@/pages/Dashboard';
import ZeroDayCenter from '@/pages/ZeroDayCenter';
import ThreatIntelligence from '@/pages/ThreatIntelligence';
import FirewallDashboard from '@/pages/FirewallDashboard';
import FirewallRules from '@/pages/FirewallRules';
import FirewallLogs from '@/pages/FirewallLogs';
import ThreatScanner from '@/pages/ThreatScanner';
import MirrorEnvironment from '@/pages/MirrorEnvironment';
import UserProfile from '@/pages/UserProfile';
import SubscriptionPage from '@/pages/SubscriptionPage';
import SettingsPage from '@/pages/SettingsPage';
import PageNotFound from '@/lib/PageNotFound';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import useRealTimeSync from '@/hooks/useRealTimeSync';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';

// Add page imports here

function AppRoutes() {
  useRealTimeSync();
  const { authError, isLoadingAuth, isLoadingPublicSettings } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-primary font-mono text-sm animate-pulse">AEGIS INITIALIZING...</div>
      </div>
    );
  }

  if (authError?.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/zero-day" element={<ZeroDayCenter />} />
          <Route path="/threat-intel" element={<ThreatIntelligence />} />
          <Route path="/firewall" element={<FirewallDashboard />} />
          <Route path="/firewall/rules" element={<FirewallRules />} />
          <Route path="/firewall/logs" element={<FirewallLogs />} />
          <Route path="/threat-scanner" element={<ThreatScanner />} />
          <Route path="/mirror-env" element={<MirrorEnvironment />} />
          <Route path="/profile" element={<UserProfile />} />
          <Route path="/subscription" element={<SubscriptionPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <Toaster />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}