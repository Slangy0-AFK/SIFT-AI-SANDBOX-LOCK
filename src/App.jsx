import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/ProtectedRoute';

function PageTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="flex-1 flex flex-col w-full h-full"
    >
      {children}
    </motion.div>
  );
}
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
import About from '@/pages/About';
import Contact from '@/pages/Contact';
import Landing from '@/pages/Landing';
import MirrorDemo from '@/pages/MirrorDemo';
import ParadoxGate from '@/pages/ParadoxGate';
import IpAllowlist from '@/pages/IpAllowlist';
import SessionManagement from '@/pages/SessionManagement';
import DataRetention from '@/pages/DataRetention';
import AuditLogs from '@/pages/AuditLogs';
import EmailScanner from '@/pages/EmailScanner';

// Add page imports here

function AppRoutes() {
  useRealTimeSync();
  const location = useLocation();
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
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><Landing /></PageTransition>} />
        <Route path="/mirror-demo" element={<PageTransition><MirrorDemo /></PageTransition>} />
        <Route path="/paradox-gate" element={<PageTransition><ParadoxGate /></PageTransition>} />
        <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
        <Route path="/register" element={<PageTransition><Register /></PageTransition>} />
        <Route path="/forgot-password" element={<PageTransition><ForgotPassword /></PageTransition>} />
        <Route path="/reset-password" element={<PageTransition><ResetPassword /></PageTransition>} />
        <Route path="/about" element={<PageTransition><About /></PageTransition>} />
        <Route path="/contact" element={<PageTransition><Contact /></PageTransition>} />
        <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<PageTransition><Dashboard /></PageTransition>} />
            <Route path="/zero-day" element={<PageTransition><ZeroDayCenter /></PageTransition>} />
            <Route path="/threat-intel" element={<PageTransition><ThreatIntelligence /></PageTransition>} />
            <Route path="/firewall" element={<PageTransition><FirewallDashboard /></PageTransition>} />
            <Route path="/firewall/rules" element={<PageTransition><FirewallRules /></PageTransition>} />
            <Route path="/firewall/logs" element={<PageTransition><FirewallLogs /></PageTransition>} />
            <Route path="/firewall/ip-allowlist" element={<PageTransition><IpAllowlist /></PageTransition>} />
            <Route path="/firewall/sessions" element={<PageTransition><SessionManagement /></PageTransition>} />
            <Route path="/firewall/retention" element={<PageTransition><DataRetention /></PageTransition>} />
            <Route path="/firewall/audit-logs" element={<PageTransition><AuditLogs /></PageTransition>} />
            <Route path="/threat-scanner" element={<PageTransition><ThreatScanner /></PageTransition>} />
            <Route path="/email-scanner" element={<PageTransition><EmailScanner /></PageTransition>} />
            <Route path="/mirror-env" element={<PageTransition><MirrorEnvironment /></PageTransition>} />
            <Route path="/profile" element={<PageTransition><UserProfile /></PageTransition>} />
            <Route path="/subscription" element={<PageTransition><SubscriptionPage /></PageTransition>} />
            <Route path="/settings" element={<PageTransition><SettingsPage /></PageTransition>} />
          </Route>
        </Route>
        <Route path="*" element={<PageTransition><PageNotFound /></PageTransition>} />
      </Routes>
    </AnimatePresence>
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