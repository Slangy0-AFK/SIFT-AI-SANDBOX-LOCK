import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

export default function About() {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    base44.analytics.track({ eventName: 'view_about_page' });
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-6 pt-12 relative">
      <div 
        className="fixed inset-0 z-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=2072")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        }}
      />
      <div className="fixed inset-0 z-0 bg-background/80 pointer-events-none" />
      
      <div className="relative z-10 flex flex-col items-center w-full max-w-5xl">
        <div className="max-w-3xl w-full mb-6">
          <Link to={isAuthenticated ? "/dashboard" : "/"}>
          <Button variant="ghost" className="gap-2 -ml-4">
            <ArrowLeft className="w-4 h-4" /> {isAuthenticated ? "Back to Dashboard" : "Back to Home"}
          </Button>
        </Link>
      </div>
      <Card className="max-w-3xl w-full border-border">
        <CardHeader>
          <CardTitle className="text-2xl text-foreground text-center font-bold">
            <h1>About Sift-AI</h1>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-foreground/80 text-sm leading-relaxed">
          <p>
            Sift-AI is a practical threat detection toolkit. It combines browser-based device diagnostics, email and SMS threat analysis, live reputation lookups (VirusTotal, AlienVault OTX), and a human-verification widget and scanning API that developers can use in their own applications.
          </p>
          <p>
            What exactly do we do? Our device scanner inspects your browser environment for automation flags, tracking scripts, risky extensions, and other anomalies — entirely client-side, without touching your files. Our email and SMS scanners analyze messages for phishing and scam indicators. Our verification widget uses timed challenges, rate limiting, and strike-based lockouts to help keep automated traffic out of your forms.
          </p>
          <p>
            Who is this for? Individuals who want to check a suspicious link, email, or device, and developers who want to add human verification or threat scanning to their own site without building it from scratch.
          </p>
          <p>
            We only ship what we can actually do. Sift-AI does not run a network firewall, does not intercept traffic on your behalf, and does not claim protections it cannot deliver.
          </p>
        </CardContent>
      </Card>

      <div className="max-w-3xl w-full mt-12 text-center pb-12">
        <h2 className="text-xl font-bold mb-4">
          {isAuthenticated ? "Return to your secure console" : "Ready to secure your infrastructure?"}
        </h2>
        <Link to={isAuthenticated ? "/dashboard" : "/register"}>
          <Button size="lg" className="px-8 font-semibold">
            {isAuthenticated ? "Go to Dashboard" : "Get Started"}
          </Button>
        </Link>
      </div>
      </div>
    </div>
  );
}