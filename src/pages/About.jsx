import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield, Cpu, Lock } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function About() {
  useEffect(() => {
    base44.analytics.track({ eventName: 'view_about_page' });
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-6 pt-12">
      <div className="max-w-3xl w-full mb-6">
        <Link to="/">
          <Button variant="ghost" className="gap-2 -ml-4">
            <ArrowLeft className="w-4 h-4" /> Back to Home
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
            Welcome to Sift-AI Quantum Shield. We build an autonomous threat detection and deception platform designed to secure devices and networks against sophisticated modern attacks—including autonomous AI agents, headless browser bots, and zero-day exploits. We protect your infrastructure by deploying an active defense architecture: identifying malicious intent through browser and device telemetry, and seamlessly redirecting bad actors into adaptive honeypots and tarpits where their resources are safely exhausted.
          </p>
          <p>
            What exactly do we do and protect? Our engine actively scans for injected scripts, prototype tampering, proxy anomalies, and automation flags without ever touching your personal files. It provides continuous monitoring against data exfiltration, Claude leak attacks, and polymorphic behavior. Our Paradox Lock technology further ensures that highly advanced bots and AI models cannot bypass critical security checkpoints, offering an impenetrable layer of verification. In short: we hunt the threats trying to hunt you, intercepting them before they ever reach your actual data.
          </p>
          <p>
            Who is this for? Sift-AI is built for security-conscious individuals, IT administrators, and enterprises who need verifiable visibility into what is happening on their devices and networks. If you are concerned about hidden trackers, unauthorized environmental access, or automated botnets scraping your infrastructure, our platform gives you the command center to neutralize them instantly.
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
        <h2 className="text-xl font-bold mb-4">Ready to secure your infrastructure?</h2>
        <Link to="/register">
          <Button size="lg" className="px-8 font-semibold">Start Free Trial</Button>
        </Link>
      </div>
    </div>
  );
}