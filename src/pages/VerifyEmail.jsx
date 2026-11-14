import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout';
import { authClient } from '@/api/authClient';

export default function VerifyEmail() {
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const token = new URLSearchParams(window.location.hash.slice(1)).get('token');
    if (!token) {
      setStatus('invalid');
      return;
    }

    window.history.replaceState(null, '', window.location.pathname);
    authClient.verifyEmail(token)
      .then(() => setStatus('verified'))
      .catch((error) => setStatus(!error.status || error.status >= 500 ? 'unavailable' : 'invalid'));
  }, []);

  if (status === 'loading') {
    return (
      <AuthLayout
        icon={Loader2}
        title="Verifying email"
        subtitle="Please wait"
        footer={<Link to="/login" className="text-primary font-medium hover:underline">Go to log in</Link>}
      >
        <Loader2 className="w-6 h-6 animate-spin mx-auto" aria-label="Verifying" />
      </AuthLayout>
    );
  }

  const verified = status === 'verified';
  const unavailable = status === 'unavailable';
  return (
    <AuthLayout
      icon={verified ? CheckCircle : AlertTriangle}
      title={verified ? 'Email verified' : unavailable ? 'Verification unavailable' : 'Verification link invalid'}
      subtitle={verified
        ? 'Your account is ready to use.'
        : unavailable
          ? 'The account service could not verify your email. Please try again later.'
          : 'Request a new verification email and try again.'}
      footer={<Link to="/login" className="text-primary font-medium hover:underline">Go to log in</Link>}
    >
      <p className="text-sm text-center text-muted-foreground">
        {verified
          ? 'You can now sign in with your email and password.'
          : unavailable
            ? 'Your account was not activated. Try again once the account service is available.'
            : 'The verification link may have expired or already been used.'}
      </p>
    </AuthLayout>
  );
}
