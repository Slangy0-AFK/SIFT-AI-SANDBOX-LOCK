/* ============================================================================
 * SIFT AI guard plug-in — v1.0
 * ----------------------------------------------------------------------------
 * A guardrail layer around your model — stops bad instructions reaching it and
 * bad outputs leaving it.
 *
 * It does NOT patch, fix, rewrite or retrain your model, and it never touches
 * model weights. It does not contain SIFT AI's pattern library, raw prompts or
 * any internal code: the rules below are a small starter set that belongs to
 * you, and you can add to them.
 *
 * It never asks for a password, another service's API key, an IMEI, a serial
 * number or payment details.
 *
 * No dependences. Node 18+ (or any runtime with fetch and crypto).
 *
 * ---------------------------------------------------------------------------
 * HOW TO USE IT (details and a test checklist: https://sift-ai.net/plugin)
 *
 *   const { createGuard } = require('./sift-guard.js');
 *
 *   const guard = createGuard({
 *     allowedTools: {
 *       lookup_order: { args: { order_id: { required: true, max: 40 } } }
 *     }
 *   });
 *
 *   // Once, at start-up.
 *   const state = await guard.ready();
 *   if (!state.active) console.warn('SIFT AI guardrails are off:', state.status);
 *
 *   // On every message, before your model sees it.
 *   guard.beginTurn();
 *   const check = await guard.guardMessage(userText);
 *   if (!check.allowed) return send(check.reply);
 *   const answer = await myModel(userText);
 *   const safe = await guard.filterReply(answer);
 *   return send(safe.clean ? answer : safe.reply);
 *
 *   // On every tool the model asks for, instead of calling it directly.
 *   const run = await guard.runTool({
 *     name: 'lookup_order',
 *     args: { order_id: id },
 *     handler: (args) => lookupOrder(args.order_id)
 *   });
 *
 * ---------------------------------------------------------------------------
 * WHAT IT CHECKS, IN THIS ORDER
 *   1. the key, from SIFT_LICENSE_KEY
 *   2. the kill switch — on, or unreadable, stops everything
 *   3. the key against SIFT AI, with a short cache
 *   4. instruction attempts in a message, before your model sees it
 *   5. the tool gate, before any tool runs
 *   6. an audit entry, before the action — no entry, no action
 *   7. your action, then the reply is scanned before it goes out
 *   8. a step ceiling per turn
 * ==========================================================================*/

'use strict';

var DEFAULTS = {
  endpoint: 'https://siftai.base44.app/functions/validateLicense',
  cacheSeconds: 600, // a good answer stands this long before it is checked again
  graceHours: 12, // a check that cannot get through keeps guardrails on this long
  timeoutMs: 5000,
  maxSteps: 12,
  auditLog: './sift-guard-audit.log'
};

// One short, plain refusal. It says nothing about what was caught.
var REFUSAL = 'That request cannot be run.';
var HELD_REPLY = 'That reply cannot be shown.';
var STOP_REPLY = 'This has been stopped.';

// Tool names that are dangerous by default: allowShellTools: true turns this off.
var SHELL_TOOLS = /^(shell|exec|execute|eval|system|terminal|bash|sh|cmd|subprocess|run_command|read_file|write_file|delete_file|fetch_url)$/i;

var EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]{2,}/g;
var PHONE = /\+?\d[\d\s().-]{7,}\d/g;

/* --- what counts as an instruction attempt, or as a reply that must not go out
 * These are starter rules. Your own rules go in extraRules. Message text is
 * never logged, only the category a rule belongs to. */
var INPUT_RULES = [
  {
    category: 'instruction_override',
    test: /\b(ignore|disregard|forget|override|bypass)\b[^.\n]{0,40}\b(previous|prior|earlier|above|all|any)\b[^.\n]{0,30}\b(instruction|instructions|rule|rules|prompt|direction|directions|setting|settings)\b/i
  },
  { category: 'instruction_override', test: /\b(new|updated|revised)\b[^.\n]{0,20}\binstructions?\b|\byou must now\b|\bfrom now on\b[^.\n]{0,20}\b(you|ignore|always)\b/i },
  { category: 'instruction_override', test: /\b(prompt injection|hidden instruction|injected instruction|system message)\b/i },
  {
    category: 'system_prompt_request',
    test: /\b(reveal|show|print|repeat|output|display|paste|give)\b[^.\n]{0,30}\b(your|the)\b[^.\n]{0,20}\b(system|developer|hidden|initial|original)\b[^.\n]{0,15}\b(prompt|message|instruction|instructions|rules)\b/i
  },
  {
    category: 'role_switch',
    test: /\byou are (now|no longer)\b|\bact as\b[^.\n]{0,30}\b(developer|admin|administrator|unrestricted|unfiltered|jailbroken)\b|\bdeveloper mode\b|\bjailbreak\b/i
  },
  {
    category: 'secret_request',
    test: /\b(give|send|share|tell|show|paste|enter|type|confirm|provide)\b[^.\n]{0,40}\b(password|passphrase|api[-_ ]?key|secret key|private key|one[-_ ]?time code|otp|verification code|card number|cvv|pin|imei|serial number)\b/i
  },
  { category: 'tool_override', test: /\b(run|execute|invoke|call)\b[^.\n]{0,20}\b(shell|terminal|command|subprocess|bash|powershell)\b/i }
];

var REPLY_RULES = [
  {
    category: 'leaked_instruction',
    test: /\b(my|the)\b[^.\n]{0,20}\b(system|developer|hidden|initial|original)\b[^.\n]{0,15}\b(prompt|message|instructions|rules)\b|\bhere (is|are) (my|the) instructions\b|\bmy instructions (say|are)\b|\bI was told to\b/i
  },
  {
    category: 'secret_request',
    test: /\b(send|give|share|paste|enter|type|provide|confirm|tell me)\b[^.\n]{0,40}\b(password|passphrase|api[-_ ]?key|secret key|private key|one[-_ ]?time code|otp|verification code|card number|cvv|pin|imei|serial number|bank details|account number)\b/i
  },
  { category: 'internal_name', test: /\b(sk-[A-Za-z0-9]{16,}|pk_(live|test)_[A-Za-z0-9]{8,}|ghp_[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{12,}|AIza[0-9A-Za-z_-]{20,})\b/ },
  { category: 'internal_name', test: /\b[A-Z]{2,8}-[A-Z0-9]{3,4}(-[A-Z0-9]{3,4}){1,4}\b/ },
  { category: 'internal_name', test: /\b[0-9a-f]{32,}\b/i }
];

function safeEnv(name) {
  try {
    if (typeof process !== 'undefined' && process.env && Object.prototype.hasOwnProperty.call(process.env, name)) {
      return process.env[name];
    }
  } catch (error) {
    return undefined;
  }
  return undefined;
}

// The kill switch is read before anything else. A switch that cannot be read is
// a stop, not a pass.
function readSwitch(config) {
  if (config && Object.prototype.hasOwnProperty.call(config, 'killSwitch')) {
    var set = config.killSwitch;
    return { on: set === true || set === 1 || String(set).toLowerCase() === 'true', unreadable: false };
  }
  var raw;
  try {
    raw = safeEnv('SIFT_KILL_SWITCH');
  } catch (error) {
    return { on: true, unreadable: true };
  }
  if (raw === undefined || raw === null || String(raw).trim() === '') return { on: false, unreadable: false };
  var value = String(raw).trim().toLowerCase();
  return { on: ['1', 'true', 'on', 'yes', 'stop', 'stopped'].indexOf(value) !== -1, unreadable: false };
}

// Whatever was pasted into SIFT_LICENSE_KEY, in the one shape SIFT AI matches:
// uppercase, no spaces. The hash below is worked out from exactly this.
function canonicalKey(raw) {
  var text = raw === undefined || raw === null ? '' : String(raw);
  var clean = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (clean.slice(0, 7) === 'SIFTLIC' && clean.length === 23) {
    return 'SIFT-LIC-' + (clean.slice(7).match(/.{4}/g) || []).join('-');
  }
  return text.trim().toUpperCase();
}

async function sha256Hex(text) {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle) {
    var digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(digest)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }
  if (typeof require === 'function') {
    var nodeCrypto = require('crypto');
    return nodeCrypto.createHash('sha256').update(text, 'utf8').digest('hex');
  }
  return '';
}

// Only the hash of the key is ever sent. The key itself stays in your config.
async function postJson(url, payload, timeoutMs) {
  var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  var timer = controller ? setTimeout(function () { controller.abort(); }, timeoutMs) : null;
  try {
    var response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller ? controller.signal : undefined
    });
    var text = await response.text();
    var body = {};
    try { body = JSON.parse(text); } catch (error) { body = {}; }
    if (response.status === 200) return { kind: 'ok', body: body };
    if (response.status === 400 || response.status === 403) return { kind: 'refused', body: body };
    return { kind: 'unavailable', body: body };
  } catch (error) {
    return { kind: 'unavailable', body: {} };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// The audit line is written the moment it is handed over, so the caller knows
// it landed before the next step runs. Only categories, decisions and tool
// names go in: never a message, never a prompt, never a key.
function createSink(path) {
  var fs = null;
  try {
    if (typeof require === 'function' && typeof process !== 'undefined') fs = require('fs');
  } catch (error) {
    fs = null;
  }
  if (!fs) {
    return function (line) {
      if (typeof console !== 'undefined' && console.info) console.info(line);
      return true;
    };
  }
  return function (line) {
    fs.appendFileSync(path, line + '\n', { encoding: 'utf8' });
    return true;
  };
}

function scanInput(text, extraRules) {
  var rules = INPUT_RULES.concat(extraRules || []);
  for (var i = 0; i < rules.length; i += 1) {
    var hit = text.match(rules[i].test);
    if (hit) {
      // The same words inside something the person pasted in are their own
      // category: a document is not a person giving an order.
      return { category: isPasted(text, hit.index) ? 'pasted_instruction' : rules[i].category };
    }
  }
  return null;
}

function isPasted(text, index) {
  var before = text.slice(0, index);
  var fences = before.split('```').length - 1;
  if (fences % 2 === 1) return true;
  var line = before.slice(before.lastIndexOf('\n') + 1);
  return /^\s*>/.test(line);
}

function scanReply(text, config) {
  var rules = REPLY_RULES.concat((config && config.extraReplyRules) || []);
  for (var i = 0; i < rules.length; i += 1) {
    if (rules[i].test.test(text)) return { clean: false, category: rules[i].category };
  }

  var names = (config && config.internalNames) || [];
  for (var n = 0; n < names.length; n += 1) {
    if (String(names[n]) && text.toLowerCase().indexOf(String(names[n]).toLowerCase()) !== -1) {
      return { clean: false, category: 'internal_name' };
    }
  }

  var own = ((config && config.ownAddresses) || []).map(function (value) { return String(value).toLowerCase(); });
  var mail = text.match(EMAIL) || [];
  for (var e = 0; e < mail.length; e += 1) {
    if (own.indexOf(mail[e].toLowerCase()) === -1) return { clean: false, category: 'foreign_address' };
  }
  var digits = own.map(function (value) { return value.replace(/[^\d]/g, ''); });
  var phones = text.match(PHONE) || [];
  for (var p = 0; p < phones.length; p += 1) {
    if (digits.indexOf(phones[p].replace(/[^\d]/g, '')) === -1) return { clean: false, category: 'foreign_address' };
  }

  return { clean: true, category: 'none' };
}

function createGuard(options) {
  var config = options || {};
  var endpoint = config.endpoint || safeEnv('SIFT_VALIDATE_URL') || DEFAULTS.endpoint;
  var auditPath = config.auditLog || safeEnv('SIFT_AUDIT_LOG') || DEFAULTS.auditLog;
  var cacheMs = Number(config.cacheSeconds || safeEnv('SIFT_CACHE_SECONDS') || DEFAULTS.cacheSeconds) * 1000;
  var graceMs = Number(config.graceHours || safeEnv('SIFT_GRACE_HOURS') || DEFAULTS.graceHours) * 3600 * 1000;
  var timeoutMs = Number(config.timeoutMs || DEFAULTS.timeoutMs);
  var maxSteps = Number(config.maxSteps || safeEnv('SIFT_MAX_STEPS') || DEFAULTS.maxSteps);
  var sink = config.sink || createSink(auditPath);
  var extraRules = config.extraRules || [];
  var allowShellTools = config.allowShellTools === true;
  var allowedTools = config.allowedTools || {};

  var state = {
    key: canonicalKey(config.licenseKey !== undefined ? config.licenseKey : safeEnv('SIFT_LICENSE_KEY')),
    hash: '',
    status: 'Invalid',
    active: false,
    expiresAt: null,
    cachedAt: 0,
    stopped: false,
    stopCategory: '',
    steps: 0,
    category: 'none'
  };

  function writeAudit(fields) {
    var entry = {
      at: new Date().toISOString(),
      category: String(fields.category || 'none'),
      gate: String(fields.gate || 'none'),
      decision: String(fields.decision || 'none')
    };
    if (fields.tool) entry.tool = String(fields.tool);
    if (fields.step !== undefined) entry.step = Number(fields.step);
    try {
      return sink(JSON.stringify(entry)) !== false;
    } catch (error) {
      return false;
    }
  }

  function latch(category) {
    state.stopped = true;
    state.stopCategory = category;
    state.active = false;
    state.category = category;
    writeAudit({ category: category, gate: 'kill_switch', decision: 'blocked' });
    return verdict();
  }

  function verdict() {
    return { status: state.stopped ? 'Stopped' : state.status, active: state.active === true && !state.stopped, stopped: state.stopped, category: state.category, expiresAt: state.expiresAt };
  }

  async function ask() {
    if (!state.hash) return { fresh: true, status: 'Invalid', active: false, expiresAt: null };
    var answer = await postJson(endpoint, { key_hash: state.hash }, timeoutMs);
    if (answer.kind === 'refused') return { fresh: true, status: 'Invalid', active: false, expiresAt: null };
    if (answer.kind !== 'ok') return { fresh: false };
    var body = answer.body || {};
    return { fresh: true, status: String(body.status || 'Invalid'), active: body.active === true, expiresAt: body.expires_at || null };
  }

  // Steps the key, the kill switch and the cache, in that order, on every call.
  async function refresh() {
    if (state.stopped) return verdict();

    var local = readSwitch(config);
    if (local.on) return latch(local.unreadable ? 'kill_switch_unreadable' : 'kill_switch_local');
    state.category = 'none';

    if (!state.hash) state.hash = await sha256Hex(state.key);
    if (!state.hash) return latch('no_key');

    var now = Date.now();
    if (state.cachedAt && now - state.cachedAt < cacheMs) return verdict();

    var answer = await ask();
    if (answer.fresh) {
      // A Stopped answer is never cached and never softened.
      if (answer.status === 'Stopped') return latch('kill_switch_remote');
      state.cachedAt = now;
      state.status = answer.status;
      state.active = answer.active;
      state.expiresAt = answer.expiresAt;
      return verdict();
    }

    // The check could not get through. The last good answer stands for the grace
    // window, so a brief outage does not turn the guardrails off mid-day.
    var withinGrace = state.active === true && state.cachedAt > 0 && now - state.cachedAt < graceMs;
    writeAudit({ category: 'validation_outage', gate: 'license_check', decision: withinGrace ? 'allowed' : 'blocked' });
    return withinGrace ? verdict() : { status: 'Outage', active: false, stopped: false, category: 'validation_outage', expiresAt: state.expiresAt };
  }

  function checkTool(name, args) {
    if (!name) return { allowed: false, category: 'tool_not_allowed' };
    if (!allowShellTools && SHELL_TOOLS.test(name)) return { allowed: false, category: 'tool_not_allowed' };
    if (!Object.prototype.hasOwnProperty.call(allowedTools, name)) return { allowed: false, category: 'tool_not_allowed' };

    var rule = allowedTools[name] || {};
    var permitted = rule.args || {};
    var given = Object.keys(args || {});
    if (given.length > Number(rule.maxArgs || 8)) return { allowed: false, category: 'tool_argument_refused' };

    for (var i = 0; i < given.length; i += 1) {
      var key = given[i];
      if (!Object.prototype.hasOwnProperty.call(permitted, key)) return { allowed: false, category: 'tool_unknown_argument' };
      var spec = permitted[key] || {};
      var value = args[key] === undefined || args[key] === null ? '' : String(args[key]);
      if (spec.max && value.length > Number(spec.max)) return { allowed: false, category: 'tool_argument_refused' };
      if (spec.pattern) {
        var pattern = spec.pattern instanceof RegExp ? new RegExp(spec.pattern.source, spec.pattern.flags.replace('g', '')) : new RegExp(String(spec.pattern));
        if (!pattern.test(value)) return { allowed: false, category: 'tool_argument_refused' };
      }
      if (spec.allowed && spec.allowed.map(String).indexOf(value) === -1) return { allowed: false, category: 'tool_argument_refused' };
    }

    var needed = Object.keys(permitted);
    for (var n = 0; n < needed.length; n += 1) {
      if ((permitted[needed[n]] || {}).required && given.indexOf(needed[n]) === -1) return { allowed: false, category: 'tool_argument_refused' };
    }
    return { allowed: true, category: 'none' };
  }

  var guard = {
    // Once, at start-up. Never throws: a bad key leaves the guardrails off.
    async ready() {
      return refresh();
    },

    state: function () {
      return Object.assign({}, verdict(), { steps: state.steps, keyed: state.hash !== '' });
    },

    // Step 1 to 4, and the audit entry, for every message.
    async guardMessage(text) {
      var now = await refresh();
      if (now.stopped) return { allowed: false, guarded: false, reply: STOP_REPLY, category: now.category };
      if (!now.active) return { allowed: true, guarded: false, reply: null, category: now.status === 'Outage' ? 'validation_outage' : 'not_active' };

      var hit = scanInput(String(text === undefined || text === null ? '' : text), extraRules);
      var written = writeAudit({ category: hit ? hit.category : 'none', gate: 'input_filter', decision: hit ? 'refused' : 'allowed' });
      if (!written) {
        latch('audit_unavailable');
        return { allowed: false, guarded: false, reply: STOP_REPLY, category: 'audit_unavailable' };
      }
      if (hit) return { allowed: false, guarded: true, reply: REFUSAL, category: hit.category };
      return { allowed: true, guarded: true, reply: null, category: 'none' };
    },

    // Step 5 to 8, around one action of yours.
    async runTool(input) {
      var asked = input || {};
      var name = String(asked.name || '');
      var args = asked.args || {};
      var handler = asked.handler;

      var now = await refresh();
      if (now.stopped) {
        writeAudit({ category: now.category, gate: 'kill_switch', decision: 'blocked', tool: name });
        return { ran: false, blocked: true, guarded: false, reply: STOP_REPLY, category: now.category };
      }
      if (!now.active) {
        var loose = handler ? await handler(args) : null;
        return { ran: true, blocked: false, guarded: false, result: loose, reply: null, category: 'not_active' };
      }

      var gate = checkTool(name, args);
      if (!gate.allowed) {
        writeAudit({ category: gate.category, gate: 'tool_gate', decision: 'blocked', tool: name });
        return { ran: false, blocked: true, guarded: true, reply: REFUSAL, category: gate.category };
      }

      // The entry goes in before the action. If it cannot be written, the action
      // does not happen.
      var logged = writeAudit({ category: 'tool_call', gate: 'audit', decision: 'allowed', tool: name, step: state.steps + 1 });
      if (!logged) {
        latch('audit_unavailable');
        return { ran: false, blocked: true, guarded: true, reply: STOP_REPLY, category: 'audit_unavailable' };
      }

      state.steps += 1;
      if (state.steps > maxSteps) {
        latch('step_ceiling');
        writeAudit({ category: 'step_ceiling', gate: 'loop_gate', decision: 'blocked', tool: name, step: state.steps });
        return { ran: false, blocked: true, guarded: true, reply: STOP_REPLY, category: 'step_ceiling' };
      }

      var raw = handler ? await handler(args) : null;
      var said = typeof raw === 'string' ? raw : '';
      if (said) {
        var held = scanReply(said, config);
        if (!held.clean) {
          writeAudit({ category: held.category, gate: 'reply_filter', decision: 'held', tool: name });
          return { ran: true, blocked: false, guarded: true, result: null, reply: HELD_REPLY, category: held.category };
        }
      }
      return { ran: true, blocked: false, guarded: true, result: raw, reply: null, category: 'none' };
    },

    // Step 7 on its own, for a reply that does not come from runTool.
    async filterReply(text) {
      var now = await refresh();
      if (now.stopped) return { clean: false, guarded: false, reply: STOP_REPLY, category: now.category };
      if (!now.active) return { clean: true, guarded: false, reply: null, category: 'not_active' };

      var held = scanReply(String(text === undefined || text === null ? '' : text), config);
      writeAudit({ category: held.clean ? 'none' : held.category, gate: 'reply_filter', decision: held.clean ? 'allowed' : 'held' });
      if (held.clean) return { clean: true, guarded: true, reply: null, category: 'none' };
      return { clean: false, guarded: true, reply: HELD_REPLY, category: held.category };
    },

    // A new turn: the step ceiling counts from zero again. Explicit on purpose —
    // nothing here restarts itself.
    beginTurn: function () {
      state.steps = 0;
      return guard.state();
    },

    // Clears a latched stop and the cached answer. Only you call this.
    reset: function () {
      state.stopped = false;
      state.stopCategory = '';
      state.cachedAt = 0;
      state.steps = 0;
      state.category = 'none';
      return guard.state();
    }
  };

  return guard;
}

var api = { createGuard: createGuard };

if (typeof module !== 'undefined' && module.exports) module.exports = api;
if (typeof globalThis !== 'undefined') globalThis.SiftGuard = api;
