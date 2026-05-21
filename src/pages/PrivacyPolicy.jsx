import React from 'react';
import { Shield, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const LAST_UPDATED = 'May 20, 2026';
const APP_NAME = 'AEGIS Quantum Shield';
const CONTACT_EMAIL = import.meta.env.VITE_PRIVACY_EMAIL || 'support@aegis-security.app';

export default function PrivacyPolicy() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Link to="/settings" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <h1 className="font-mono text-xl font-bold tracking-wider text-foreground">PRIVACY POLICY</h1>
        </div>
      </div>
      <p className="font-mono text-[10px] text-muted-foreground tracking-widest">
        LAST UPDATED: {LAST_UPDATED} · {APP_NAME}
      </p>

      <div className="bg-card border border-border rounded-xl p-6 space-y-6 text-sm text-muted-foreground leading-relaxed">

        <section className="space-y-2">
          <h2 className="font-mono text-xs font-bold text-foreground tracking-wider uppercase">1. Introduction</h2>
          <p>
            {APP_NAME} ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect,
            use, disclose, and safeguard your information when you use our mobile application and web platform. By using the app,
            you consent to the data practices described in this policy.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-mono text-xs font-bold text-foreground tracking-wider uppercase">2. Information We Collect</h2>
          <p><span className="text-foreground font-semibold">Account Data:</span> Email address, display name, and role when you register or are invited.</p>
          <p><span className="text-foreground font-semibold">Device Data:</span> Device type, device fingerprint/identifier, and last-seen timestamps to manage licensed device slots.</p>
          <p><span className="text-foreground font-semibold">Security Event Data:</span> Threat logs, anomaly signatures, IP addresses, and security events generated within your own monitored environment.</p>
          <p><span className="text-foreground font-semibold">Subscription Data:</span> Plan type, billing cycle, Google Play purchase tokens, and order IDs for subscription management.</p>
          <p><span className="text-foreground font-semibold">Usage Data:</span> App interactions and analytics events (e.g., feature usage) to improve the platform. No personally identifiable information is attached to analytics events.</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-mono text-xs font-bold text-foreground tracking-wider uppercase">3. How We Use Your Information</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>To provide, operate, and maintain the AEGIS platform</li>
            <li>To manage your account, devices, and subscription</li>
            <li>To process and verify in-app purchases via Google Play Billing</li>
            <li>To send important service and security notifications</li>
            <li>To detect, prevent, and address technical issues</li>
            <li>To comply with legal obligations</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-mono text-xs font-bold text-foreground tracking-wider uppercase">4. Data Sharing and Disclosure</h2>
          <p>We do <span className="text-foreground font-semibold">not</span> sell your personal data. We may share data only in the following limited circumstances:</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li><span className="text-foreground font-semibold">Service Providers:</span> Infrastructure and hosting providers operating under strict data processing agreements</li>
            <li><span className="text-foreground font-semibold">Google Play:</span> Purchase verification and subscription management</li>
            <li><span className="text-foreground font-semibold">Legal Compliance:</span> When required by law, regulation, or valid legal process</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-mono text-xs font-bold text-foreground tracking-wider uppercase">5. Data Security</h2>
          <p>
            All data is transmitted over HTTPS/TLS. Security event data and threat intelligence are stored encrypted at rest.
            Access is restricted to authenticated, role-based users only. We implement industry-standard security measures,
            but no method of transmission over the internet is 100% secure.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-mono text-xs font-bold text-foreground tracking-wider uppercase">6. Data Retention</h2>
          <p>
            We retain your account data for as long as your account is active. Security event logs and threat records may be
            retained for up to 12 months for audit and compliance purposes. You may request deletion of your data at any time.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-mono text-xs font-bold text-foreground tracking-wider uppercase">7. Your Rights</h2>
          <p>Depending on your jurisdiction (GDPR, CCPA, etc.), you may have the right to:</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Access the personal data we hold about you</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your personal data</li>
            <li>Opt-out of non-essential data processing</li>
            <li>Data portability (receive your data in a portable format)</li>
          </ul>
          <p className="mt-2">To exercise these rights, contact us at <span className="text-primary font-mono">{CONTACT_EMAIL}</span></p>
        </section>

        <section className="space-y-2">
          <h2 className="font-mono text-xs font-bold text-foreground tracking-wider uppercase">8. Children's Privacy</h2>
          <p>
            AEGIS is a professional cybersecurity platform not directed at children under 13. We do not knowingly collect
            personal data from children. If we become aware of such collection, we will delete it immediately.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-mono text-xs font-bold text-foreground tracking-wider uppercase">9. Third-Party Services</h2>
          <p>The app integrates with the following third-party services, each governed by their own privacy policies:</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Google Play Billing (subscription management)</li>
            <li>Base44 Platform (authentication and database infrastructure)</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-mono text-xs font-bold text-foreground tracking-wider uppercase">10. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of significant changes via in-app notification
            or email. Continued use of the app after changes constitutes acceptance of the updated policy.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-mono text-xs font-bold text-foreground tracking-wider uppercase">12. International Data Transfers</h2>
          <p>
            Your data may be processed and stored in countries outside your jurisdiction. We ensure appropriate safeguards are in place,
            including standard contractual clauses and compliance with applicable data protection frameworks (GDPR, CCPA, etc.).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-mono text-xs font-bold text-foreground tracking-wider uppercase">13. Cookies and Tracking</h2>
          <p>
            We use minimal tracking technologies essential for service functionality:
          </p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Authentication cookies for session management</li>
            <li>Security tokens for threat detection and prevention</li>
            <li>Analytics (anonymized) to improve platform performance</li>
          </ul>
          <p className="mt-2">
            You can manage cookie preferences through your browser settings. Disabling essential cookies may affect service functionality.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-mono text-xs font-bold text-foreground tracking-wider uppercase">14. Contact Us</h2>
          <p>For privacy-related questions or requests, contact us at:</p>
          <p className="font-mono text-primary mt-1">{CONTACT_EMAIL}</p>
        </section>

      </div>
    </div>
  );
}