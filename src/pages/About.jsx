import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function About() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <Card className="max-w-3xl w-full border-primary/20">
        <CardHeader>
          <CardTitle className="font-mono text-2xl text-primary text-center">
            <h1>About Sift-AI Quantum Shield</h1>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-foreground/80 font-mono text-sm">
          <p>
            Welcome to Sift-AI Quantum Shield, the next generation in proactive cybersecurity and autonomous threat detection. Our platform is designed to provide enterprise-grade protection for both organizations and individuals against an ever-evolving landscape of digital threats. By leveraging advanced artificial intelligence, behavioral analytics, and a multi-layered deception architecture including honeypots and tarpits, we intercept, analyze, and neutralize threats before they can compromise your valuable assets.
          </p>
          <p>
            Who is this for? Sift-AI is built for security professionals, IT administrators, and privacy-conscious users who require unparalleled visibility into their network and device integrity. Whether you are safeguarding a corporate infrastructure from zero-day exploits, protecting your team against sophisticated phishing campaigns, or ensuring your personal devices are free from injected scripts and hidden trackers, Sift-AI delivers the comprehensive oversight and automated remediation necessary to maintain a secure posture.
          </p>
          <p>
            Who builds it? The platform is developed by a dedicated team of cybersecurity researchers, AI engineers, and system architects at Base44. We are committed to pushing the boundaries of what is possible in threat intelligence. By combining our expertise in machine learning with deep insights into adversarial tactics, we have created an autonomous system that not only reacts to known signatures but also predicts and mitigates novel attack vectors, keeping you one step ahead in the digital arms race.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}