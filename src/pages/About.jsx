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
            Sift-AI is a threat detection and deception platform. It combines browser-based device diagnostics, email and SMS threat analysis, live threat-intelligence lookups (VirusTotal, AlienVault OTX), firewall monitoring, and deception tools — honeypots and tarpits — that trap and slow down automated attackers instead of just blocking them.
          </p>
          <p>
            What exactly do we do? Our device scanner checks your browser environment for injected scripts, automation flags, and environmental anomalies — entirely client-side, without touching your personal files. Our email scanners analyze messages for phishing and scam indicators. And our proprietary human verification system, backed by strike-based lockouts and rate limiting, helps keep bots and automated agents out of protected areas. The specific verification methods are trade secrets and are not published.
          </p>
          <p>
            Who is this for? Sift-AI is built for security-conscious individuals, IT administrators, and enterprises who need verifiable visibility into what is happening on their devices and networks. If you are concerned about hidden trackers, unauthorized environmental access, or automated botnets scraping your infrastructure, our platform gives you the command center to neutralize them instantly.
          </p>
          <p>
            Who builds it? Sift-AI is developed by a dedicated team of cybersecurity researchers, AI engineers, and systems architects. We focus exclusively on proactive defense mechanisms—building real-time threat intelligence and deceptive networking tools to keep you one step ahead in an evolving digital arms race.
          </p>
        </CardContent>
      </Card>

      <div className="max-w-3xl w-full mt-12 text-center pb-12">
        <h2 className="text-xl font-bold mb-4">
          {isAuthenticated ? "Return to your secure console" : "Ready to secure your infrastructure?"}
        </h2>
        <Link to={isAuthenticated ? "/dashboard" : "/register"}>
          <Button size="lg" className="px-8 font-semibold">
            {isAuthenticated ? "Go to Dashboard" : "Start Free Trial"}
          </Button>
        </Link>
      </div>
      </div>
    </div>
  );
}