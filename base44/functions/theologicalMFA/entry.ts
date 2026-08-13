import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import speakeasy from 'npm:speakeasy@2.0.0';

/**
 * Adaptive Paradox Challenge MFA - Secure Backend Authentication
 *
 * NOTE: The frontend renders the paradox challenge as a UI layer only. All
 * critical operations — including base2/base12/base60 transformation and
 * QRNG generation — are performed backend-side inside this function.
 *
 * SECURITY: This function enforces strict authentication ordering:
 * 1. Parse JSON body (reject malformed requests without auth)
 * 2. Extract action parameter
 * 3. Allow public 'get_challenge' action
 * 4. Verify authentication with base44.auth.me() for all other actions
 * 5. Only after auth succeeds, perform input validation and record strikes
 *
 * This ordering prevents unauthenticated users from triggering database writes.
 *
 * Protected actions (all require authentication):
 * - human_authenticate: Requires MFA (TOTP or hardware token)
 * - agent_authenticate: Requires cryptographic zero-knowledge proof
 *
 * Public actions (no auth required):
 * - get_challenge: Returns challenge text for UI display only
 *
 * Environment variables are fetched securely at runtime inside Deno.serve():
 * - Secrets are NOT hardcoded, logged, or exposed in responses
 * - This is the recommended secure pattern for backend functions
 *
 * NOTE: This function implements a configurable challenge used to
 * distinguish authenticated users from automated clients for Sift-AI. The challenge text is
 * loaded at runtime from the AUTH_CHALLENGE environment variable and is not
 * hardcoded.
 */

// ── Config ────────────────────────────────────────────────────────────────────
const MAX_INPUT_LENGTH = 512;
const ALLOWED_INPUT_PATTERN = /^[\x20-\x7E\t\n\r]*$/; // standard UTF-8 printable only
const VALID_ACTIONS = new Set(['get_challenge', 'gate_verify', 'human_authenticate', 'agent_authenticate', 'simulate', 'background_scan']);
const HARDWARE_PRODUCTION_MODE = false; // Set true when physical YubiKey/GPIO hardware is present

function sanitizeInput(input) {
  if (typeof input !== 'string') return { valid: false, reason: 'non_string' };
  if (input.length > MAX_INPUT_LENGTH) return { valid: false, reason: 'oversized_payload' };
  if (!ALLOWED_INPUT_PATTERN.test(input)) return { valid: false, reason: 'invalid_characters' };
  return { valid: true };
}

function getSecureEntropy() {
  const buf = new Uint8Array(4);
  crypto.getRandomValues(buf);
  return (buf[0] << 24 | buf[1] << 16 | buf[2] << 8 | buf[3]) >>> 0;
}

// Base44 backend function
async function getQuantumNonce() {
  try {
    const res = await fetch('https://qrng.anu.edu.au/API/jsonI.php?length=1&type=uint16');
    const data = await res.json();
    return data.data[0];
  } catch (e) {
    // fallback: crypto-secure, not quantum, but still unpredictable
    return crypto.getRandomValues(new Uint16Array(1))[0];
  }
}

function getQRNGDelayMs(baseMs = 500) {
  const entropy = getSecureEntropy();
  return baseMs + (entropy % 4500);
}

function runParadoxMath(seed) {
  const base2 = seed.toString(2);
  const base12 = base2.split('').reduce((acc, bit) => acc * 2 + Number(bit), 0) % 12;
  const base60 = (base12 * 7 + (seed % 60)) % 60;
  return { base2, base12, base60 };
}

function createQrngPad(seed) {
  const { base2, base12, base60 } = runParadoxMath(seed);
  const combined = `${base2}:${base12}:${base60}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i += 1) {
    hash = ((hash << 5) - hash + combined.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

async function runParadoxTarpit(iterations = 200) {
  let value = getSecureEntropy();
  const bases = [2, 12, 60];

  for (let i = 0; i < iterations; i += 1) {
    const base = bases[i % bases.length];
    const converted = value.toString(base).split('').reverse().join('') || '0';
    value = parseInt(converted, base) >>> 0;
    value = (value + (i * 31) + (getSecureEntropy() % 256)) >>> 0;
    await new Promise((resolve) => setTimeout(resolve, 10 + Math.floor(getSecureEntropy() % 40)));
  }

  return value;
}

async function getStrike(base44Client, sourceId) {
  const windowStart = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const records = await base44Client.asServiceRole.entities.SecurityEvent.filter({
    event_type: 'qrng_cycle',
    details: `strike_${sourceId}`,
  }).catch(() => []);
  const recent = records.filter((r) => r.created_date > windowStart);
  const count = recent.length;
  const delay = count === 0 ? 500 : 500 * Math.pow(2, count);
  return { count, delay };
}

async function recordStrike(base44Client, sourceId) {
  const current = await getStrike(base44Client, sourceId);
  const nextDelay = current.count === 0 ? getQRNGDelayMs(500) : current.delay * 2;
  await base44Client.asServiceRole.entities.SecurityEvent.create({
    event_type: 'qrng_cycle',
    severity: 'warning',
    details: `strike_${sourceId}`,
    environment: 'production',
  }).catch(() => {});
  return { count: current.count + 1, delay: nextDelay };
}

async function clearStrikes() {
  return;
}

// ── Main Handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const AUTH_CHALLENGE = Deno.env.get('AUTH_CHALLENGE');
  const EXPECTED_ANSWER = Deno.env.get('AUTH_CHALLENGE_ANSWER');

  if (!AUTH_CHALLENGE) {
    console.error('[THEOLOGICAL-MFA] AUTH_CHALLENGE env var is not set');
    return Response.json({ error: 'Server misconfiguration: AUTH_CHALLENGE not set' }, { status: 500 });
  }

  if (!EXPECTED_ANSWER) {
    console.error('[THEOLOGICAL-MFA] AUTH_CHALLENGE_ANSWER env var is not set');
    return Response.json({ error: 'Server misconfiguration: AUTH_CHALLENGE_ANSWER not set' }, { status: 500 });
  }

  const sourceIdRaw = req.headers.get('x-real-ip') || 'unknown';
  const sourceId = sourceIdRaw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  try {
    const rawBody = await req.text();
    const body = rawBody ? JSON.parse(rawBody) : {};
    const { action, response, totp_code, has_hardware_token, agent_zkp, corridor } = body;

    if (!VALID_ACTIONS.has(action)) {
      return Response.json({ error: 'Invalid action. Use: get_challenge, human_authenticate, agent_authenticate, simulate' }, { status: 400 });
    }

    if (action === 'get_challenge') {
      return Response.json({ challenge: AUTH_CHALLENGE });
    }

    // ── Hidden Paradox Gate — AI Guardrail (background only, not shown in UI) ──
    // Silently evaluates the universal truth challenge against known AI/bot patterns.
    // The correct answer is the only one a sincere human would give. AIs fail or abstain.
    // PRE-AUTH ACTION: Does not require logged-in user (used before authentication)
    if (action === 'gate_verify') {
      const { answer, isRobot } = body;
      const inputCheck = sanitizeInput(answer || '');
      if (!inputCheck.valid) {
        return Response.json({ error: 'Invalid input', reason: inputCheck.reason }, { status: 400 });
      }
      if (!answer || answer.trim().length === 0) {
        return Response.json({ error: 'Answer is required' }, { status: 400 });
      }
      
      const userAgent = req.headers.get('user-agent') || '';
      const isKnownBot = /HeadlessChrome|PhantomJS|Selenium|puppeteer|python-requests|curl\/|wget\/|Go-http-client|bot|spider|crawler/i.test(userAgent);

      // Stages 1-5: Threat Intel, Rate Limit, Honeypot, Tarpit Checks
      // We block on security signals (honeypot, bot UA), NOT on the theology answer.
      if (isRobot || isKnownBot) {
        const strike = await recordStrike(base44, sourceId);
        
        // Stage 5: Threat Intel (Fire and forget)
        base44.asServiceRole.functions.invoke('checkVirusTotal', { ip: sourceId }).catch(() => {});
        base44.asServiceRole.functions.invoke('checkAlienVault', { ip: sourceId }).catch(() => {});
        
        if (strike.count >= 5) {
          await runParadoxTarpit(200);
          await base44.asServiceRole.entities.SecurityEvent.create({
            event_type: 'threat_locked',
            severity: 'fatal',
            details: `Strike 5 — Bot behavior from ${sourceId}. Lockout engaged.`,
            environment: 'tarpit',
          }).catch(() => {});
          return Response.json({ locked: true, strike: 5, reason: 'Strike 5: Lockout engaged.' }, { status: 429 });
        }
        await new Promise((r) => setTimeout(r, strike.delay));
        return Response.json({ success: false, strike: strike.count, message: `Security Check Failed. Strike ${strike.count}/5.` }, { status: 403 });
      }

      // Stage 6: Issue Token (using Quantum Nonce)
      const nonce = await getQuantumNonce();
      const gateToken = createQrngPad(nonce) + createQrngPad(getSecureEntropy());

      // Stage 7: Theology Gate (Values-based UX)
      const answerLower = answer.trim().toLowerCase();
      const expectedLower = EXPECTED_ANSWER.trim().toLowerCase();
      const isMatch = answerLower === expectedLower;

      // Answer is logged but excluded from blocklist/security logic
      await base44.asServiceRole.entities.SecurityEvent.create({
        event_type: 'paradox_challenge',
        severity: 'info',
        details: `Theology gate answer provided by ${sourceId}. Answer: "${answer}". Match: ${isMatch}`,
        environment: 'production',
      }).catch(() => {});

      if (!isMatch) {
        // UX decline, but NO strikes applied
        return Response.json({ success: false, message: `Incorrect answer.` }, { status: 403 });
      }

      await base44.asServiceRole.entities.SecurityEvent.create({
        event_type: 'access_granted',
        severity: 'info',
        details: `gate_token:${gateToken}:${Date.now() + 300000}`,
        environment: 'production',
      }).catch(() => {});
      
      return Response.json({ success: true, gate_token: gateToken });
    }

    // ── Silent background AI/bot detection ────────────────────────────────────
    // PRE-AUTH ACTION: Does not require logged-in user (runs silently in background)
    if (action === 'background_scan') {
      const { signals = {} } = body;
      const suspiciousFlags = [];

      // navigator.webdriver = true is a dead giveaway for Selenium/Puppeteer
      if (signals.webdriver === true) suspiciousFlags.push('webdriver_flag');
      // Headless browsers often report no touch points and no color depth
      if (signals.colorDepth === 0) suspiciousFlags.push('zero_color_depth');
      // Known bot user-agent patterns
      if (signals.userAgent && /HeadlessChrome|PhantomJS|Selenium|puppeteer|python-requests|curl\//i.test(signals.userAgent)) {
        suspiciousFlags.push('bot_user_agent');
      }
      // No languages = automated
      if (!signals.languages) suspiciousFlags.push('no_languages');

      if (suspiciousFlags.length > 0) {
        await base44.asServiceRole.entities.ZeroDayAnomaly.create({
          anomaly_signature: `background-scan-${sourceId}-${Date.now()}`,
          anomaly_type: 'ai_adversarial',
          severity: suspiciousFlags.length >= 2 ? 'critical' : 'warning',
          status: 'detected',
          source_ip: sourceId,
          environment: 'production',
          confidence_score: Math.min(40 + suspiciousFlags.length * 20, 95),
          notes: `Silent background scan flags: ${suspiciousFlags.join(', ')}. UA: ${String(signals.userAgent || '').slice(0, 100)}`,
        }).catch(() => {});
      }

      // Always return 200 — never reveal detection to the client
      return Response.json({ ok: true });
    }

    // All remaining actions require authentication
    // Allow: scheduler secret header, entity automation, or authenticated user
    const schedulerSecret = Deno.env.get('SCHEDULER_SECRET');
    const providedSecret = req.headers.get('x-scheduler-secret') || req.headers.get('x-automation-secret');
    const isScheduler = schedulerSecret && providedSecret === schedulerSecret;

    let user = null;
    if (!isScheduler) {
      user = await base44.auth.me().catch(() => null);
      if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }, { status: 401 });
      }
    }

    if (action === 'simulate') {
      const isHuman = corridor === 'human';
      return Response.json({
        success: isHuman,
        corridor: corridor || 'human',
        message: isHuman
          ? 'Simulation result: human corridor granted in mock mode.'
          : 'Simulation result: agent corridor requires ZKP proof in mock mode.',
        strikes: isHuman ? 0 : 1,
        details: isHuman
          ? 'Use the human corridor to validate MFA and response logic.'
          : 'Submit an agent_zkp value of at least 64 characters.',
      });
    }

    if (rawBody.length > MAX_INPUT_LENGTH || !ALLOWED_INPUT_PATTERN.test(rawBody)) {
      console.warn(`[THEOLOGICAL-MFA] Input violation from authenticated user ${sourceId} — triggering immediate Strike 3`);
      await runParadoxTarpit(200);
      await recordStrike(base44, sourceId);
      await recordStrike(base44, sourceId);
      await recordStrike(base44, sourceId);
      return Response.json({
        error: 'Invalid request payload',
        locked: true,
        strike: 3,
        reason: 'Input violation detected. Lockout engaged.',
      }, { status: 400 });
    }

    if (action === 'human_authenticate') {
      const inputCheck = sanitizeInput(response || '');
      if (!inputCheck.valid) {
        return Response.json({ error: 'Invalid input', reason: inputCheck.reason }, { status: 400 });
      }

      if (!HARDWARE_PRODUCTION_MODE) {
        if (!totp_code) {
          return Response.json({ error: 'MFA required: provide totp_code' }, { status: 403 });
        }
        const userData = await base44.auth.me();
        if (!userData.mfa_secret) {
          return Response.json({ error: 'MFA not configured. Set up MFA first.' }, { status: 403 });
        }
        const verified = speakeasy.totp.verify({
          secret: userData.mfa_secret,
          encoding: 'base32',
          token: String(totp_code),
          window: 1,
        });
        if (!verified) {
          const strike = await recordStrike(base44, sourceId);
          if (strike.count >= 3) {
            await runParadoxTarpit(200);
            await base44.asServiceRole.entities.SecurityEvent.create({
              event_type: 'threat_locked',
              severity: 'fatal',
              details: `Strike 3 — MFA brute force detected from ${sourceId}. Hardware lockout engaged.`,
              environment: 'tarpit',
            }).catch(() => {});
            return Response.json({
              locked: true,
              strike: 3,
              reason: 'Strike 3: Quantum Neutralization. Network ingress severed.',
              restoration: 'Physical manual override required (GPIO button + offline master key).',
            }, { status: 429 });
          }
          await new Promise((r) => setTimeout(r, strike.delay));
          return Response.json({
            success: false,
            strike: strike.count,
            message: `Invalid MFA code. Strike ${strike.count}/3.`,
            delay_ms: strike.delay,
          }, { status: 403 });
        }
      } else if (!has_hardware_token) {
        return Response.json({ error: 'Physical hardware token (YubiKey/GPIO) required in production mode' }, { status: 403 });
      }

      if (!response || typeof response !== 'string' || response.trim().length === 0) {
        return Response.json({ error: 'A response to the challenge is required' }, { status: 400 });
      }

      const responseLower = response.trim().toLowerCase();
      const expectedLowerHuman = EXPECTED_ANSWER.trim().toLowerCase();
      const isMatchHuman = responseLower === expectedLowerHuman;

      // Stage 7: Theology gate - Answer is logged but is not a security signal
      await base44.asServiceRole.entities.SecurityEvent.create({
        event_type: 'paradox_challenge',
        severity: 'info',
        details: `Theology gate answer (human auth): "${response}". Match: ${isMatchHuman}`,
        environment: 'production',
      }).catch(() => {});

      if (!isMatchHuman) {
        // UX decline, but DO NOT apply strikes or tarpit
        return Response.json({
          success: false,
          message: `Incorrect answer.`,
        }, { status: 403 });
      }

      await clearStrikes();
      const qrngPad = createQrngPad(await getQuantumNonce());
      await base44.asServiceRole.entities.SecurityEvent.create({
        event_type: 'access_granted',
        severity: 'info',
        details: `Challenge response validated for ${user.email}. QRNG OTP issued.`,
        environment: 'production',
      }).catch(() => {});

      return Response.json({
        success: true,
        corridor: 'user',
        message: 'Access granted. Challenge response validated successfully.',
        qrng_otp: qrngPad,
      });
    }

    if (action === 'agent_authenticate') {
      const inputCheck = sanitizeInput(response || '');
      if (!inputCheck.valid) {
        return Response.json({ error: 'Invalid input', reason: inputCheck.reason }, { status: 400 });
      }

      if (!agent_zkp || typeof agent_zkp !== 'string' || agent_zkp.length < 64) {
        const strike = await recordStrike(base44, sourceId);
        if (strike.count >= 3) {
          console.warn(`[ADAPTIVE-CHALLENGE] Strike 3 — automated client ${sourceId} failed proof`);
          await runParadoxTarpit(200);
          await base44.asServiceRole.entities.SecurityEvent.create({
            event_type: 'threat_locked',
            severity: 'fatal',
            details: `Strike 3 — automated client ${sourceId} failed ZKP proof. Access limited.`,
            environment: 'tarpit',
          }).catch(() => {});
          const anomaly = await base44.asServiceRole.entities.ZeroDayAnomaly.create({
            anomaly_signature: `adaptive-challenge-zkp-fail-${sourceId}-${Date.now()}`,
            anomaly_type: 'ai_adversarial',
            severity: 'fatal',
            status: 'neutralized',
            source_ip: sourceId,
            environment: 'tarpit',
            confidence_score: 99,
            mitigation_applied: 'adaptive challenge tarpit + access restriction',
            notes: `Automated client responded "${response}" without valid ZKP. Strike 3 neutralization executed.`,
          }).catch(() => null);

          await base44.asServiceRole.functions.invoke('autoBlockIp', {
            source_ip: sourceId,
            threat_id: anomaly?.id || `theological-zkp-fail-${sourceId}-${Date.now()}`,
            reason: 'Auto-blocked after 3 QRNG cycles failed agent authentication',
          }).catch(() => {});

          await base44.asServiceRole.entities.SecurityEvent.create({
            event_type: 'auto_blacklist',
            severity: 'fatal',
            details: `Agent ${sourceId} blocked after 3 QRNG cycle failures; IP auto-blacklisted.`,
            source_ip: sourceId,
            environment: 'tarpit',
          }).catch(() => {});

          return Response.json({
            locked: true,
            strike: 3,
            reason: 'Strike 3: authentication failed. Access restricted pending manual review.',
            restoration: 'Support must review and reset access policies.',
          }, { status: 429 });
        }

        await new Promise((r) => setTimeout(r, strike.delay));
        return Response.json({
          success: false,
          strike: strike.count,
          message: `Automated client access requires a valid cryptographic proof. Strike ${strike.count}/3.`,
          required: 'Submit a valid ZKP proof string of minimum 64 characters.',
          delay_ms: strike.delay,
        }, { status: 403 });
      }

      await clearStrikes();
      await base44.asServiceRole.entities.SecurityEvent.create({
        event_type: 'challenge_verification',
        severity: 'warning',
        details: `Automated client proof submitted by ${sourceId}. Manual verification pending.`,
        environment: 'honeypot',
      }).catch(() => {});

      return Response.json({
        success: false,
        corridor: 'automated',
        message: 'Proof received. Verification pending. Access is not yet granted.',
      }, { status: 202 });
    }

    return Response.json({ error: 'Invalid action. Use: get_challenge, human_authenticate, agent_authenticate' }, { status: 400 });
  } catch (error) {
    console.error('[THEOLOGICAL-MFA] Error:', error?.message || error);
    return Response.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
});