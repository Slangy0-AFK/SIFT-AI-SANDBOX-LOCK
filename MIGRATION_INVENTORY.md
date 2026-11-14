# Independent backend migration inventory

Baseline: main commit `fcd383120244d288b255e4472ba4d15ef596b1b1`.
This is an inventory, not evidence that any functionality has been migrated.
All function and entity replacements below are **pending**; no production data
has been imported. Preserve the existing definitions until replacements and
their response, access-control, and data contracts have been verified.

## Application routes

The route declarations and nesting in `src/App.jsx` are the source of truth.
The home and about pages are public; invitation, login, registration, password
recovery, and redirect routes sit outside the authenticated route wrapper.
The remaining listed application routes use that wrapper. This is a frontend
gate, not a substitute for server-side authorization.

- Public or outside the authenticated wrapper: `/`, `/about`,
  `/accept-invite/:token`, `/verify-demo` (redirect), `/login`, `/register`,
  `/forgot-password`, `/reset-password`.
- Authenticated: `/marketplace`, `/governor-demo`, `/evals`,
  `/behaviour-test`, `/sizing-calculator`, `/scaler`, `/pricing`, `/plans`,
  `/thank-you`, `/receipt`, `/scan`, `/support`, `/plugin`, `/stripe-connect`,
  `/compliance`, `/sources`, `/terms`, `/privacy-policy`, `/refund-policy`,
  `/dashboard`, `/scanner`, `/devices`, `/allow-block`, `/history`,
  `/license`, `/check/:id`, `/admin`, `/admin/tickets`, `/prompt-guard`,
  `/chat`, `/profile`, `/subscription`, `/settings`, `/developer`.
- Unmatched paths render the not-found page.

These are static declarations, not a completed route-by-route functional test.

## Existing function inventory (62)

Each name below identifies an existing function entry point. Its independent
endpoint, validation, authorization, error contract, and tests are pending.

- acceptInvitation
- analyzeTextThreat
- appSupport
- autoResolveTicket
- backgroundAutoScan
- backupData
- behaviourTest
- cacheThreatFeeds
- cancelSubscription
- chatBotShield
- checkAlienVault
- checkIpAccess
- checkVirusTotal
- claimAdminAccess
- claimFoundingPlace
- cleanupOldData
- completeInvitationEnrollment
- createApiKey
- deviceScan
- encryptData
- exportAudit
- generateCaptcha
- generateReport
- getDemoTelemetry
- getThreatSignatures
- gmailThreatHandler
- governorDemo
- kitCheckout
- kitPurchaseStatus
- licenseKey
- manageDevice
- marketTest
- openSourceScan
- phishingAnalyzer
- phoneRecovery
- processDeviceLog
- promptGuard
- promptGuardApi
- rateLimiter
- scanApi
- scanGmail
- scanOutlook
- scannerCheckout
- scannerHelper
- scannerPricing
- scannerPurchaseStatus
- scheduledBackup
- sendEmail
- sendInvitation
- sendSlackNotification
- sendThreatAlert
- stripeCheckout
- stripeConnect
- stripeStatus
- stripeWebhook
- supportAutomation
- threatDetectionEngine
- trackParadoxDemo
- trackScan
- trackVisit
- validateLicense
- widgetApi

## Existing entity inventory (45)

All PostgreSQL mappings are pending. Existing entity definitions remain the
source for fields, required values, validation, defaults, and row-level access
rules; these must be examined individually rather than inferred from names.

- AnalyticsEvent
- ApiKey
- AuditRequest
- BehaviourRun
- BehaviourTurn
- CachedThreatFeed
- CreditGuardEvent
- DailyCounter
- DailyVisitor
- Device
- DeviceLog
- DeviceSubmission
- EmailThreat
- FirewallLog
- FirewallRule
- FoundingOffer
- FoundingPlace
- GovernorRun
- HoneypotSession
- Invitation
- KitPurchase
- KitSettings
- License
- ListEntry
- PhoneRecoveryOtp
- PluginControl
- PromptGuardEvent
- ScanSession
- ScannerPurchase
- SecurityBenchmark
- SecurityEvent
- SiteStat
- StripeConnectAccount
- StripeConnectState
- Subscription
- SupportAudit
- SupportAutomation
- SupportTicket
- TextThreat
- Threat
- TicketMessage
- User
- WidgetChallenge
- WorkflowPolicy
- ZeroDayAnomaly

## Shared modules (33)

Existing shared modules must also be assessed for behavior and dependencies:

`apiKeys`, `behaviourTest`, `captcha`, `chatBotShield`, `chatGuard`,
`chatbotRules`, `clientAddress`, `constantTime`, `creditGuard`, `emailSafe`,
`emailThreat`, `evalPuzzles`, `foundingSeats`, `guardPolicy`, `license`,
`openFeeds`, `planAccess`, `pluginGate`, `pricing`, `promptGuard`,
`runtimeSecrets`, `scamText`, `scannerFulfillment`, `scannerPlans`,
`statCounter`, `stripeConnect`, `stripeEnv`, `supportHarness`, `supportHelp`,
`supportIntake`, `supportReply`, `ticketNotices`, `virusTotal`.

## Dependencies and security boundaries

- The frontend currently uses the platform SDK for authentication, entity
  access, function calls, and subscriptions. `src/lib/AuthContext.jsx`,
  `src/components/ProtectedRoute.jsx`, and `src/hooks/useRealTimeSync.jsx`
  are key integration points. Four entity subscriptions invalidate query caches.
- The Vite configuration uses the platform plugin. The existing Pages workflow
  builds and deploys the frontend; it does not deploy an independent backend.
- Existing integration entry points include Stripe checkout, Connect and
  webhooks; Gmail and Outlook; email and Slack; VirusTotal and threat feeds;
  licensing; scanner and device operations. Their credentials and live behavior
  have not been verified by this inventory.
- License definitions contain status, model and deployment binding, hashes,
  encrypted key material, and access rules. The two guard plugins currently
  require the existing validation service and policy response; do not remove
  it until a tested independent replacement exists. In particular, verify
  expiration, revocation, kill-switch, cache, and unavailable-service behavior.
- A stored firewall rule does not establish network isolation. OS-level
  enforcement, egress restrictions, and auditability require separate design
  and testing; this inventory makes no claim that they already exist.
- No authorized export has been supplied or imported. Migration must not invent
  records or credentials, and must document export, import, and rollback.

This baseline is not an exhaustive security review, endpoint contract analysis,
deployment verification, or test result. Complete those before declaring the
migration ready or removing the existing runtime.
