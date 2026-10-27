import React from 'react';
import { FileText, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const LAST_UPDATED = 'May 21, 2026';
const APP_NAME = 'SIFT AI';
const CONTACT_EMAIL = import.meta.env.VITE_LEGAL_EMAIL || 'support@sift-ai.net';

export default function RefundPolicy() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Link to="/settings" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h1 className="font-mono text-xl font-bold tracking-wider text-foreground">REFUND POLICY</h1>
        </div>
      </div>
      <p className="font-mono text-xs text-muted-foreground tracking-widest">
        LAST UPDATED: {LAST_UPDATED} · {APP_NAME}
      </p>

      <div className="bg-card border border-border rounded-xl p-6 space-y-6 text-sm text-muted-foreground leading-relaxed">

        <section className="space-y-2">
          <h2 className="font-mono text-xs font-bold text-foreground tracking-wider uppercase">1. Overview</h2>
          <p>
            This Refund Policy explains your rights and our procedures for processing refunds for SIFT AI subscriptions
            and in-app purchases. By purchasing our service, you agree to the terms outlined in this policy.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-mono text-xs font-bold text-foreground tracking-wider uppercase">2. Google Play Store Purchases</h2>
          <p>
            All subscriptions and in-app purchases made through Google Play Store are subject to Google's refund policy:
          </p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li><span className="text-foreground font-semibold">48-Hour Window:</span> You may request a refund within 48 hours of purchase through Google Play</li>
            <li><span className="text-foreground font-semibold">How to Request:</span> Visit play.google.com/store/account → Order History → Request a refund</li>
            <li><span className="text-foreground font-semibold">After 48 Hours:</span> Refund requests are evaluated by Google Play on a case-by-case basis</li>
            <li><span className="text-foreground font-semibold">Automatic Approval:</span> First-time refund requests within 48 hours are typically auto-approved</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-mono text-xs font-bold text-foreground tracking-wider uppercase">3. Direct Refund Requests</h2>
          <p>
            For exceptional circumstances not covered by Google Play's policy, you may contact us directly at:
          </p>
          <p className="font-mono text-primary mt-1">{CONTACT_EMAIL}</p>
          <p className="mt-2">
            <span className="text-foreground font-semibold">Eligible Scenarios:</span>
          </p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Technical issues preventing service use (with documented evidence)</li>
            <li>Billing errors or duplicate charges</li>
            <li>Service outages exceeding 48 consecutive hours</li>
            <li>Unauthorized purchases (with proof)</li>
            <li>Medical or emergency circumstances (case-by-case)</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-mono text-xs font-bold text-foreground tracking-wider uppercase">4. Refund Process</h2>
          <p><span className="text-foreground font-semibold">Step 1 - Request Submission:</span> Contact support with your order ID, account email, and reason for refund.</p>
          <p><span className="text-foreground font-semibold">Step 2 - Review:</span> Our team reviews your request within 2-3 business days.</p>
          <p><span className="text-foreground font-semibold">Step 3 - Decision:</span> You'll receive an email with our decision and next steps.</p>
          <p><span className="text-foreground font-semibold">Step 4 - Processing:</span> Approved refunds are processed within 5-10 business days.</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-mono text-xs font-bold text-foreground tracking-wider uppercase">5. Refund Timeline</h2>
          <p>
            <span className="text-foreground font-semibold">Processing Time:</span> 5-10 business days after approval
          </p>
          <p>
            <span className="text-foreground font-semibold">Refund Method:</span> Refunds are issued to the original payment method used for purchase.
          </p>
          <p>
            <span className="text-foreground font-semibold">Access During Review:</span> Your subscription access continues until the refund decision is finalized.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-mono text-xs font-bold text-foreground tracking-wider uppercase">6. Non-Refundable Scenarios</h2>
          <p>Refunds are <span className="text-foreground font-semibold">not</span> provided for:</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Change of mind after 48 hours (unless covered by Google Play)</li>
            <li>Failure to use the service after purchase</li>
            <li>Account termination due to Terms of Service violations</li>
            <li>Issues caused by unauthorized device modifications or rooting/jailbreaking</li>
            <li>Third-party app conflicts not caused by SIFT AI</li>
            <li>Purchases made more than 90 days ago (except billing errors)</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-mono text-xs font-bold text-foreground tracking-wider uppercase">7. Subscription Cancellations</h2>
          <p>
            <span className="text-foreground font-semibold">Cancellation Method:</span> Cancel anytime from the Plan page in the app, or through Google Play Store → Subscriptions → SIFT AI → Cancel.
          </p>
          <p>
            <span className="text-foreground font-semibold">Effective Date:</span> Cancelling stops the plan and the license key that came with it straight away. The month you are in was paid for in full and is not refunded.
          </p>
          <p>
            <span className="text-foreground font-semibold">No Partial Refunds:</span> We do not provide partial refunds for unused portions of a billing period.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-mono text-xs font-bold text-foreground tracking-wider uppercase">8. Plan Downgrades</h2>
          <p>
            Downgrading from Pro/Enterprise to Free plan:
          </p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Takes effect at the end of your current billing cycle</li>
            <li>No refund for the price difference for the current period</li>
            <li>Pro features remain accessible until the billing period ends</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-mono text-xs font-bold text-foreground tracking-wider uppercase">9. Promotional and Trial Offers</h2>
          <p>
            <span className="text-foreground font-semibold">Free Trials:</span> If offered, free trials automatically convert to paid subscriptions unless cancelled before trial ends.
          </p>
          <p>
            <span className="text-foreground font-semibold">Promotional Discounts:</span> Discounted purchases are eligible for refunds based on the actual amount paid.
          </p>
          <p>
            <span className="text-foreground font-semibold">Trial Abuse:</span> Multiple trial accounts or abuse of promotional offers may result in refund denial and account suspension.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-mono text-xs font-bold text-foreground tracking-wider uppercase">10. Disputes and Appeals</h2>
          <p>
            If your refund request is denied and you believe this was in error:
          </p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Reply to the denial email with additional documentation</li>
            <li>Provide evidence supporting your claim (screenshots, logs, etc.)</li>
            <li>Our senior support team will review within 5 business days</li>
            <li>Final decisions are binding but you may pursue Google Play dispute resolution</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-mono text-xs font-bold text-foreground tracking-wider uppercase">11. Contact Information</h2>
          <p>For refund-related inquiries:</p>
          <p className="font-mono text-primary mt-1">{CONTACT_EMAIL}</p>
          <p className="mt-2">
            <span className="text-foreground font-semibold">Response Time:</span> 2-3 business days
          </p>
          <p>
            <span className="text-foreground font-semibold">Support Hours:</span> Monday-Friday, 9 AM - 6 PM CST
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-mono text-xs font-bold text-foreground tracking-wider uppercase">12. Policy Updates</h2>
          <p>
            We may update this Refund Policy periodically. Material changes will be communicated via in-app notification
            or email at least 14 days before the effective date. Continued use of the service constitutes acceptance of updated terms.
          </p>
        </section>

      </div>
    </div>
  );
}