import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Dashboard from './pages/Dashboard';
import BaseChain from './pages/BaseChain';
import ParadoxLock from './pages/ParadoxLock';
import MirrorEnvironment from './pages/MirrorEnvironment';
import ThreatLog from './pages/ThreatLog';
import SettingsPage from './pages/SettingsPage';
import AppLayout from './components/layout/AppLayout';
import SubscriptionPage from './pages/SubscriptionPage';
import ZeroDayCenter from './pages/ZeroDayCenter';
import WorkflowEngine from './pages/WorkflowEngine';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import ComplianceChecklist from './pages/ComplianceChecklist';

import FirewallDashboard from './pages/FirewallDashboard';
import ThreatIntelligence from './pages/ThreatIntelligence';
import FirewallRules from './pages/FirewallRules';
import FirewallLogs from './pages/FirewallLogs';
import UserProfile from './pages/UserProfile';
import Welcome from './pages/Welcome';
import ThreatScanner from './pages/ThreatScanner';
import OnboardingPermissions from './components/onboarding/OnboardingPermissions';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Welcome />} />
        <Route path="/onboarding" element={<OnboardingPermissions />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/profile" element={<UserProfile />} />
        <Route path="/base-chain" element={<BaseChain />} />
        <Route path="/paradox-lock" element={<ParadoxLock />} />
        <Route path="/mirror-env" element={<MirrorEnvironment />} />
        <Route path="/threat-log" element={<ThreatLog />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/subscription" element={<SubscriptionPage />} />
        <Route path="/zero-day" element={<ZeroDayCenter />} />
        <Route path="/workflow" element={<WorkflowEngine />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/compliance" element={<ComplianceChecklist />} />

        <Route path="/threat-intel" element={<ThreatIntelligence />} />
        <Route path="/firewall" element={<FirewallDashboard />} />
        <Route path="/firewall/rules" element={<FirewallRules />} />
        <Route path="/firewall/logs" element={<FirewallLogs />} />
        <Route path="/threat-scanner" element={<ThreatScanner />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App