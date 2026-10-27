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
import Developer from '@/pages/Developer';
import Home from '@/pages/Home';
import GovernorDemo from '@/pages/GovernorDemo';
import Evals from '@/pages/Evals';
import SizingCalculator from '@/pages/SizingCalculator';
import Scaler from '@/pages/Scaler';
import Pricing from '@/pages/Pricing';
import About from '@/pages/About';
import ThankYou from '@/pages/ThankYou';
import MyRuns from '@/pages/MyRuns';
import AdminDashboard from '@/pages/AdminDashboard';
import AdminTickets from '@/pages/AdminTickets';
import SiteLayout from '@/components/kit/SiteLayout';
import PromptGuard from '@/pages/PromptGuard';
import ScannerPlans from '@/pages/ScannerPlans';
import Receipt from '@/pages/Receipt';
import ScannerTools from '@/pages/ScannerTools';
import ScanNow from '@/pages/ScanNow';
import Support from '@/pages/Support';
import MyDevices from '@/pages/MyDevices';
import AllowBlock from '@/pages/AllowBlock';
import HistoryPage from '@/pages/History';
import CheckDetail from '@/pages/CheckDetail';
import Compliance from '@/pages/Compliance';
import Sources from '@/pages/Sources';
import TermsOfService from '@/pages/TermsOfService';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import RefundPolicy from '@/pages/RefundPolicy';
import AcceptInvite from '@/pages/AcceptInvite';
import StripeConnect from '@/pages/StripeConnect';
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
        <Route element={<SiteLayout />}>
          <Route path="/" element={<PageTransition><Home /></PageTransition>} />
          <Route path="/governor-demo" element={<PageTransition><GovernorDemo /></PageTransition>} />
          <Route path="/evals" element={<PageTransition><Evals /></PageTransition>} />
          <Route path="/sizing-calculator" element={<PageTransition><SizingCalculator /></PageTransition>} />
          <Route path="/scaler" element={<PageTransition><Scaler /></PageTransition>} />
          <Route path="/pricing" element={<PageTransition><Pricing /></PageTransition>} />
          <Route path="/about" element={<PageTransition><About /></PageTransition>} />
          <Route path="/thank-you" element={<PageTransition><ThankYou /></PageTransition>} />
          <Route path="/scan" element={<PageTransition><ScanNow /></PageTransition>} />
          <Route path="/support" element={<PageTransition><Support /></PageTransition>} />
          <Route path="/stripe-connect" element={<PageTransition><StripeConnect /></PageTransition>} />
        </Route>
        <Route path="/plans" element={<PageTransition><ScannerPlans /></PageTransition>} />
        <Route path="/compliance" element={<PageTransition><Compliance /></PageTransition>} />
        <Route path="/sources" element={<PageTransition><Sources /></PageTransition>} />
        <Route path="/terms" element={<PageTransition><TermsOfService /></PageTransition>} />
        <Route path="/privacy-policy" element={<PageTransition><PrivacyPolicy /></PageTransition>} />
        <Route path="/refund-policy" element={<PageTransition><RefundPolicy /></PageTransition>} />
        <Route path="/accept-invite/:token" element={<PageTransition><AcceptInvite /></PageTransition>} />
        <Route path="/receipt" element={<PageTransition><Receipt /></PageTransition>} />
        <Route path="/verify-demo" element={<Navigate to="/governor-demo" replace />} />
        <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
        <Route path="/register" element={<PageTransition><Register /></PageTransition>} />
        <Route path="/forgot-password" element={<PageTransition><ForgotPassword /></PageTransition>} />
        <Route path="/reset-password" element={<PageTransition><ResetPassword /></PageTransition>} />
        <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
          <Route element={<SiteLayout />}>
            <Route path="/dashboard" element={<PageTransition><MyRuns /></PageTransition>} />
            <Route path="/scanner" element={<PageTransition><ScannerTools /></PageTransition>} />
            <Route path="/devices" element={<PageTransition><MyDevices /></PageTransition>} />
            <Route path="/allow-block" element={<PageTransition><AllowBlock /></PageTransition>} />
            <Route path="/history" element={<PageTransition><HistoryPage /></PageTransition>} />
            <Route path="/check/:id" element={<PageTransition><CheckDetail /></PageTransition>} />
            <Route path="/admin" element={<PageTransition><AdminDashboard /></PageTransition>} />
            <Route path="/admin/tickets" element={<PageTransition><AdminTickets /></PageTransition>} />
          </Route>
          <Route element={<AppLayout />}>
            <Route path="/prompt-guard" element={<PageTransition><PromptGuard /></PageTransition>} />
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