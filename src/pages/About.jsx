import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield, Cpu, Lock } from 'lucide-react';
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
            <h1>About Sift-AI Quantum Shield</h1>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-foreground/80 text-sm leading-relaxed">
          <p>
            Welcome to Sift-AI Quantum Shield. We build a high-interaction, serverless web honeypot designed to secure web applications and APIs against sophisticated modern attacks—including autonomous AI agents, headless browser bots, and automated exploit scanners. We protect your infrastructure by deploying an active defense architecture: identifying malicious intent through HTTP request analysis and payload interception, seamlessly redirecting bad actors into decoy endpoints and tarpits where their resources are safely exhausted.
          </p>
          <p>
            What exactly do we do and protect? Our engine operates entirely in a serverless environment. Because there is no underlying operating system, uploaded malware and traditional backdoors are physically incapable of executing. We safely capture malicious payloads, credential-stuffing attempts, and API abuse, feeding the data directly into our AI for instant threat classification. Our Paradox Lock technology further ensures that highly advanced bots and AI models cannot bypass critical security checkpoints without revealing their nature.
          </p>
          <p>
            Who is this for? Sift-AI is built for security-conscious enterprises and developers who want to safely gather threat intelligence and waste attackers' time. If you are concerned about API abuse, credential stuffing, or automated botnets probing your web endpoints, our platform gives you the safe decoy environment to trap them instantly.
          </p>
          <p>
            Who builds it? Sift-AI is developed by a dedicated team of cybersecurity researchers, AI engineers, and systems architects. We focus exclusively on proactive defense mechanisms—building real-time threat intelligence and deceptive networking tools to keep you one step ahead in an evolving digital arms race.
          </p>
        </CardContent>
      </Card>

      <div className="max-w-3xl w-full grid md:grid-cols-2 gap-6 mt-6">
        <Card className="border-border/50 bg-secondary/20">
          <CardHeader>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
              <Cpu className="w-5 h-5 text-primary" />
            </div>
            <CardTitle className="text-lg">The Need for Math Logic</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground leading-relaxed">
            <p>
              Traditional CAPTCHAs rely on visual recognition, which modern vision-language models can solve faster than humans. By shifting verification to advanced cryptographic math logic and non-deterministic sequences, we force the attacking client to consume disproportionate computational resources. 
              This algorithmic asymmetry ensures that automated bots reveal their synthetic nature through unnatural execution speeds, while remaining seamlessly solvable by genuine human cognition paths.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-secondary/20">
          <CardHeader>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
              <Lock className="w-5 h-5 text-primary" />
            </div>
            <CardTitle className="text-lg">The Theological Paradox</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground leading-relaxed">
            <p>
              Large Language Models (LLMs) are trained to be universally helpful, highly logical, and consensus-driven. Our "Theological Paradox" leverages this architecture against them.
              We present an unresolvable logical trap disguised as a philosophical or theological query. While a human easily recognizes the subjective or impossible nature of the prompt and bypasses it using intuition, an autonomous AI agent enters an infinite loop of attempting to mathematically resolve the paradox, triggering our detection heuristics.
            </p>
          </CardContent>
        </Card>
      </div>

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