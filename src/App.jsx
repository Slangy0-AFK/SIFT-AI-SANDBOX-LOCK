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
      className="flex-1 flex flex-col w-full min-h-screen"
    >
      {children}
    </motion.div>
  );
}
import Dashboard from '@/pages/Dashboard';
import ThreatScanner from '@/pages/ThreatScanner';
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
import ParadoxGate from '@/pages/ParadoxGate';
import IpAllowlist from '@/pages/IpAllowlist';
import DataRetention from '@/pages/DataRetention';
import EmailScanner from '@/pages/EmailScanner';
import Developer from '@/pages/Developer';

// Add page imports here

function AppRoutes() {
  useRealTimeSync();
  const location = useLocation();
  const { authError, isLoadingAuth, isLoadingPublicSettings } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-primary font-mono text-sm animate-pulse">LOADING...</div>
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
        <Route path="/verify-demo" element={<PageTransition><ParadoxGate /></PageTransition>} />
        <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
        <Route path="/register" element={<PageTransition><Register /></PageTransition>} />
        <Route path="/forgot-password" element={<PageTransition><ForgotPassword /></PageTransition>} />
        <Route path="/reset-password" element={<PageTransition><ResetPassword /></PageTransition>} />
        <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
          <Route element={<AppLayout />}>
            <Route path="/about" element={<PageTransition><About /></PageTransition>} />
            <Route path="/contact" element={<PageTransition><Contact /></PageTransition>} />
            <Route path="/dashboard" element={<PageTransition><Dashboard /></PageTransition>} />
            <Route path="/threat-scanner" element={<PageTransition><ThreatScanner /></PageTransition>} />
            <Route path="/email-scanner" element={<PageTransition><EmailScanner /></PageTransition>} />
            <Route path="/security/ip-allowlist" element={<PageTransition><IpAllowlist /></PageTransition>} />
            <Route path="/security/retention" element={<PageTransition><DataRetention /></PageTransition>} />
            <Route path="/profile" element={<PageTransition><UserProfile /></PageTransition>} />
            <Route path="/subscription" element={<PageTransition><SubscriptionPage /></PageTransition>} />
            <Route path="/settings" element={<PageTransition><SettingsPage /></PageTransition>} />
            <Route path="/developer" element={<PageTransition><Developer /></PageTransition>} />
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