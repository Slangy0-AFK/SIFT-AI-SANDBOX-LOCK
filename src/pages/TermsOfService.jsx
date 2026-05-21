import React from 'react';
import { FileText, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const LAST_UPDATED = 'May 20, 2026';
const APP_NAME = 'AEGIS Quantum Shield';
const CONTACT_EMAIL = import.meta.env.VITE_LEGAL_EMAIL || 'legal@aegis-security.app';

export default function TermsOfService() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Link to="/settings" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h1 className="font-mono text-xl font-bold tracking-wider text-foreground">TERMS OF SERVICE</h1>
        </div>
      </div>
      <p className="font-mono text-[10px] text-muted-foreground tracking-widest">
        LAST UPDATED: {LAST_UPDATED} · {APP_NAME}
      </p>

      <div className="bg-card border border-border rounded-xl p-6 space-y-6 text-sm text-muted-foreground leading-relaxed">

        <section className="space-y-2">
          <h2 className="font-mono text-xs font-bold text-foreground tracking-wider uppercase">1. Acceptance of Terms</h2>
          <p>
            By accessing or using {APP_NAME} ("the Service"), you agree to be bound by these Terms of Service. If you do not agree
            to these terms, do not use the Service. These terms apply to all users, including administrators and regular users.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-mono text-xs font-bold text-foreground tracking-wider uppercase">2. Description of Service</h2>
          <p>
            AEGIS Quantum Shield is a cybersecurity monitoring and threat detection platform that provides real-time threat analysis,
            zero-day anomaly detection, honeypot/tarpit environments, workflow automation, and security event logging. The Service
            is intended for professional security operations and enterprise use.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-mono text-xs font-bold text-foreground tracking-wider uppercase">3. Permitted Use</h2>
          <p>You agree to use the Service only for lawful purposes. You may not:</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Use the platform to conduct unauthorized attacks on systems you do not own or have explicit permission to test</li>
            <li>Attempt to reverse engineer, decompile, or tamper with the platform's security mechanisms</li>
            <li>Share account credentials or exceed your licensed device count</li>
            <li>Use the simulation tools against live external infrastructure without authorization</li>
            <li>Circumvent subscription restrictions or billing systems</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-mono text-xs font-bold text-foreground tracking-wider uppercase">4. Subscriptions and Billing</h2>
          <p>
            AEGIS offers Free, Pro, and Enterprise subscription tiers. Subscriptions are billed through Google Play Billing.
            By subscribing, you authorize recurring charges based on your selected plan and billing cycle (monthly or annual).
          </p>
          <p className="mt-2">
            <span className="text-foreground font-semibold">Cancellations</span> must be managed through your Google Play account.
            Refunds are governed by Google Play's refund policy. Downgrading your plan takes effect at the end of your current billing period.
          </p>
          <p className="mt-2">
            <span className="text-foreground font-semibold">Device Limits:</span> Free (1 device), Pro (5 devices), Enterprise (unlimited).
            Exceeding your device limit will require upgrading your subscription.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-mono text-xs font-bold text-foreground tracking-wider uppercase">5. User Accounts</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account credentials. You must notify us immediately
            of any unauthorized use of your account. Accounts are non-transferable. Admin users are responsible for the actions
            of invited users within their organization.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-mono text-xs font-bold text-foreground tracking-wider uppercase">6. Intellectual Property</h2>
          <p>
            All content, features, and functionality of the Service — including algorithms, UI, brand assets, and threat detection
            logic — are owned by AEGIS and protected by applicable intellectual property laws. You may not reproduce or distribute
            any part of the Service without written permission.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-mono text-xs font-bold text-foreground tracking-wider uppercase">7. Data Ownership</h2>
          <p>
            You retain ownership of all security data, threat logs, and event records generated within your account.
            By using the Service, you grant us a limited license to process and store this data solely to provide and improve the Service.
            We do not use your security intelligence data for any commercial purpose.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-mono text-xs font-bold text-foreground tracking-wider uppercase">8. Disclaimer of Warranties</h2>
          <p>
            The Service is provided "as is" and "as available" without warranties of any kind. We do not warrant that the Service
            will be uninterrupted, error-free, or completely secure. Cybersecurity tools are aids — they do not guarantee absolute protection.
            Users are responsible for maintaining their own security posture.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-mono text-xs font-bold text-foreground tracking-wider uppercase">9. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, AEGIS shall not be liable for any indirect, incidental, special, or consequential
            damages arising from your use of the Service, including data breaches, security incidents, or loss of business,
            even if we have been advised of the possibility of such damages.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-mono text-xs font-bold text-foreground tracking-wider uppercase">10. Termination</h2>
          <p>
            We reserve the right to suspend or terminate accounts that violate these Terms. Upon termination, your right to use the
            Service ceases immediately. You may export your data within 30 days of termination before it is permanently deleted.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-mono text-xs font-bold text-foreground tracking-wider uppercase">11. Governing Law</h2>
          <p>
            These Terms are governed by applicable law. Any disputes shall be resolved through binding arbitration, except where
            prohibited by law. You waive any right to participate in class-action lawsuits against AEGIS.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-mono text-xs font-bold text-foreground tracking-wider uppercase">12. Changes to Terms</h2>
          <p>
            We may update these Terms at any time. Material changes will be communicated via in-app notification or email with
            at least 14 days notice. Continued use of the Service after the effective date constitutes acceptance of the new Terms.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-mono text-xs font-bold text-foreground tracking-wider uppercase">13. Contact</h2>
          <p>For legal inquiries, contact us at:</p>
          <p className="font-mono text-primary mt-1">{CONTACT_EMAIL}</p>
        </section>

      </div>
    </div>
  );
}