import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { VT_MANUAL_URL, VT_UNAVAILABLE } from '@/lib/virusTotalNotice';

// The plain-language compliance notes: what the outside services are, what SIFT AI
// stores, what it never asks for, and what a result does and does not mean.
function Section({ title, children }) {
  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-5 sm:p-6">
      <h2 className="font-heading text-lg font-bold tracking-tight">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

export default function Compliance() {
  useEffect(() => {
    document.title = 'Compliance & legal notes · SIFT AI';
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-12">
        <Link to="/scan" className="inline-flex items-center gap-2 font-mono text-xs text-primary hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to the scanner
        </Link>

        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">Compliance &amp; legal notes</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Plain notes on what SIFT AI is, what it uses, what it keeps, and what you agree to when you use it.
          </p>
        </div>

        <Section title="SIFT AI is a checker, not an antivirus">
          <p>
            SIFT AI is not an antivirus product and is not a substitute for one. Keep your own antivirus, your device updates and your
            common sense in place.
          </p>
          <p>
            SIFT AI does not guarantee that a device is clean or safe, and it cannot scan a whole device from a browser. Results are
            indicators only. They come from the item you give us, from the outside services named below, and from SIFT AI&apos;s own
            checklist — and an indicator can be wrong, out of date, or incomplete.
          </p>
        </Section>

        <Section title="VirusTotal">
          <p>
            VirusTotal is a service owned by Google that reports what many security engines say about a file, link, domain or IP
            address. VirusTotal&apos;s results are VirusTotal&apos;s, not ours.
          </p>
          <p className="text-foreground">{VT_UNAVAILABLE}</p>
          <p>
            SIFT AI therefore does not query VirusTotal, does not send anything to VirusTotal, and does not keep or show a VirusTotal
            result. No tier includes a VirusTotal check, including Pro, Device Check and Full Device Audit.
          </p>
          <p>
            If you want to look an item up yourself, you can do that directly at{' '}
            <a
              href={VT_MANUAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              virustotal.com <ExternalLink className="h-3 w-3" />
            </a>
            . That is your own visit to their service, under their terms. SIFT AI is not involved and receives no result from it.
          </p>
          <p>
            Do not upload confidential, personal or work files to VirusTotal. If you check something there, prefer a hash look-up over
            a file upload, because a hash tells the engines what to look up without you handing over the file itself.
          </p>
        </Section>

        <Section title="AlienVault OTX">
          <p>
            AlienVault OTX (Open Threat Exchange, now operated by LevelBlue) is a community threat-intelligence exchange. Its
            indicators are contributed by the community and are OTX&apos;s and the contributors&apos; data, not ours.
          </p>
          <p>
            Where a check you run uses OTX, SIFT AI shows you the indicator inside that one check. SIFT AI does not resell, redistribute
            or package OTX data as a product of its own, and it is not offered as a standalone feed.
          </p>
          <p>
            OTX is a third-party service under its own agreement with its own terms, which we do not control and which can change. Its
            agreement restricts commercial exploitation and use outside its intended use, so its commercial position for this app is not
            confirmed — that is flagged on the{' '}
            <Link to="/sources" className="text-primary hover:underline">
              Sources page
            </Link>
            . If you rely on an OTX indicator for anything important, treat it as one opinion among several.
          </p>
        </Section>

        <Section title="Where the checks come from">
          <p>
            A link, domain, IP address or file hash is checked against open threat feeds, each shown separately so you can see which one
            said what. They are named, with their terms position, on the{' '}
            <Link to="/sources" className="text-primary hover:underline">
              Sources page
            </Link>
            . When a feed has nothing on an item it reads “Not found in these feeds”, which is not the same as clean. The strongest an item
            can read is “No hits in the checks run”.
          </p>
          <p>
            Some of those feeds restrict commercial use, and SIFT AI does not claim any of them is commercial-safe until its terms are
            settled. That is flagged source by source on the Sources page.
          </p>
          <p>
            SIFT AI cannot run an antivirus engine for you. ClamAV is not run inside SIFT AI, no ClamAV result is produced, and none is
            ever invented. Until a separate ClamAV service is added, a file is checked by its hash together with the local scan checklist
            you run on your own machine. Your own antivirus is still the antivirus.
          </p>
        </Section>

        <Section title="What SIFT AI stores">
          <p>For a signed-in account we store: your checks and their results, the devices you add, your allowlist and blocklist entries, and your support tickets and their threads.</p>
          <p>
            We do not ask for and do not store: serial numbers, IMEI numbers, phone numbers, passwords, one-time codes, card or bank
            details. If you ever send one of those to us, it is not required for anything we do.
          </p>
          <p>
            Your checks, devices, lists and tickets are tied to your account and are visible to you. SIFT AI support can see a ticket
            you send; nobody else can see your scans or your lists. A ticket you send without an account is answered at the email you
            gave, and its thread is only visible to SIFT AI support.
          </p>
        </Section>

        <Section title="What you agree to when you check something">
          <p>
            Only check your own device, or an item you have permission to check. Do not check someone else&apos;s phone, account or
            files without their permission.
          </p>
          <p>
            Only submit items that are yours to submit, and keep other people&apos;s personal data out of your checks and tickets. You
            are responsible for what you upload or paste in.
          </p>
        </Section>

        <Section title="Paid tiers, refunds and Stripe">
          <p>
            The tiers and their prices are as stated on the{' '}
            <Link to="/plans" className="text-primary hover:underline">
              Plans page
            </Link>
            : Free at $0, Pro at $7 per month, Device Check at $49 one time, and Full Device Audit at $99 one time. Prices are shown in
            US dollars.
          </p>
          <p>
            Card payments are handled by Stripe. SIFT AI never sees or stores your card details, and you do not need an account to pay.
            A paid tier unlocks only after the payment is confirmed by Stripe.
          </p>
          <p>
            Refund terms are the ones stated with the tiers on the Plans page. Pro renews monthly and can be cancelled at any time;
            one-time tiers are charged once, at checkout.
          </p>
          <p>
            Nothing on this page is legal advice to you, and it does not replace the terms shown when you pay or the terms of the
            third-party services named above.
          </p>
        </Section>

        <p className="font-mono text-[11px] text-muted-foreground">
          Questions about any of this? Open a ticket from the{' '}
          <Link to="/support" className="text-primary hover:underline">
            Support page
          </Link>
          .
        </p>
      </main>
    </div>
  );
}