/* ============================================================================
 * SIFT AI guard plug-in — v1.1
 * ----------------------------------------------------------------------------
 * A guardrail layer around your model — stops bad instructions reaching it and
 * bad outputs leaving it.
 *
 * This file is thin on purpose. It carries no detection rules and no pattern
 * library: those arrive from SIFT AI only while your key is valid and locked to
 * your model. A copy of this file on its own does nothing.
 *
 * It does NOT patch, fix, rewrite or retrain your model, and it never touches
 * model weights.
 *
 * It never asks for a password, another service's API key, an IMEI, a serial
 * number or payment details.
 *
 * It reads from your environment:
 *   SIFT_LICENSE_KEY     your SIFT AI key. Required.
 *   SIFT_MODEL_NAME      the ONE model this key is for. Required.
 *   SIFT_DEPLOYMENT_ID   the deployment or domain it runs on. Required.
 *   SIFT_KILL_SWITCH     optional: on, or unreadable, stops everything first.
 *   SIFT_AUDIT_LOG       optional: where the audit entries are written.
 *   SIFT_VALIDATE_URL    optional: the SIFT AI check endpoint.
 *
 * One key, one model, one use. The first model to activate the key is the only
 * one it works with. Any other model is refused with:
 *   "This key is already locked to another model."
 *
 * ---------------------------------------------------------------------------
 * HOW TO USE IT (details and a test checklist: https://sift-ai.net/plugin)
 *
 *   const { createGuard } = require('./sift-guard.js');
 *
 *   const guard = createGuard({
 *     allowedTools: { lookup_order: { args: { order_id: { required: true, max: 40 } } } }
 *   });
 *
 *   const state = await guard.ready();
 *   if (!state.active) console.warn('SIFT AI guardrails are off:', state.status);
 *
 *   guard.beginTurn();
 *   const check = await guard.guardMessage(userText);
 *   if (!check.allowed) return send(check.reply);
 *   const answer = await myModel(userText);
 *   const safe = await guard.filterReply(answer);
 *   return send(safe.clean ? answer : safe.reply);
 *
 *   const run = await guard.runTool({
 *     name: 'lookup_order',
 *     args: { order_id: id },
 *     handler: (args) => lookupOrder(args.order_id)
 *   });
 *
 * ---------------------------------------------------------------------------
 * WHAT IT CHECKS, IN THIS ORDER
 *   1. the key, and the one model it is bound to
 *   2. the kill switch — on, or unreadable, stops everything
 *   3. the key and binding against SIFT AI, with a short cache
 *   4. instruction attempts in a message, before your model sees it
 *   5. the tool gate, before any tool runs
 *   6. an audit entry, before the action — no entry, no action
 *   7. your action, then the reply is shielded before it goes out
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
// uppercase, no spaces. The hash below is worked out from exactly this, and the
// key itself never leaves your product.
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

// The audit line lands before the next step runs. Only categories, decisions and
// tool names go in: never a message, never a prompt, never a key.
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

// The rules come from SIFT AI, already written, and are compiled here. Nothing
// in this file decides what a bad instruction looks like.
function compileRules(list) {
  var rules = [];
  var source = list || [];
  for (var i = 0; i < source.length; i += 1) {
    try {
      rules.push({ category: String(source[i].category || 'none'), test: new RegExp(String(source[i].signature || ''), 'i') });
    } catch (error) {
      // A rule this runtime cannot compile is skipped, never guessed at.
    }
  }
  return rules;
}

function firstHit(text, rules) {
  for (var i = 0; i < rules.length; i += 1) {
    var hit = text.match(rules[i].test);
    if (hit) return { category: rules[i].category, index: hit.index };
  }
  return null;
}

// The same words inside something the person pasted in are their own category: a
// document is not a person giving an order.
function insidePasted(text, index) {
  var before = text.slice(0, index);
  // An odd number of fences before the match means it sits inside a pasted block.
  if (before.split('```').length % 2 === 0) return true;
  var line = before.slice(before.lastIndexOf('\n') + 1);
  return /^\s*>/.test(line);
}

var EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]{2,}/g;
var PHONE = /\+?\d[\d\s().-]{7,}\d/g;

function createGuard(options) {
  var config = options || {};
  var endpoint = config.endpoint || safeEnv('SIFT_VALIDATE_URL') || DEFAULTS.endpoint;
  var auditPath = config.auditLog || safeEnv('SIFT_AUDIT_LOG') || DEFAULTS.auditLog;
  var cacheMs = Number(config.cacheSeconds || safeEnv('SIFT_CACHE_SECONDS') || DEFAULTS.cacheSeconds) * 1000;
  var graceMs = Number(config.graceHours || safeEnv('SIFT_GRACE_HOURS') || DEFAULTS.graceHours) * 3600 * 1000;
  var timeoutMs = Number(config.timeoutMs || DEFAULTS.timeoutMs);
  var maxSteps = Number(config.maxSteps || safeEnv('SIFT_MAX_STEPS') || DEFAULTS.maxSteps);
  var sink = config.sink || createSink(auditPath);
  var allowedTools = config.allowedTools || {};
  var allowShellTools = config.allowShellTools === true;
  var ownAddresses = (config.ownAddresses || []).map(function (value) { return String(value).toLowerCase(); });
  var internalNames = config.internalNames || [];

  var key = canonicalKey(config.licenseKey !== undefined ? config.licenseKey : safeEnv('SIFT_LICENSE_KEY'));
  var model = String(config.model || safeEnv('SIFT_MODEL_NAME') || '').trim();
  var deployment = String(config.deploymentId || safeEnv('SIFT_DEPLOYMENT_ID') || '').trim();

  var state = {
    hash: '',
    status: 'Invalid',
    active: false,
    lockedTo: '',
    expiresAt: null,
    message: '',
    cachedAt: 0,
    stopped: false,
    category: 'none',
    steps: 0,
    inputRules: [],
    replyRules: [],
    deniedTools: []
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
    state.active = false;
    state.category = category;
    writeAudit({ category: category, gate: 'kill_switch', decision: 'blocked' });
    return verdict();
  }

  function verdict() {
    return {
      status: state.stopped ? 'Stopped' : state.status,
      active: state.active === true && !state.stopped,
      stopped: state.stopped,
      category: state.category,
      lockedTo: state.lockedTo,
      expiresAt: state.expiresAt,
      message: state.message
    };
  }

  async function ask() {
    if (!state.hash) return { fresh: true, status: 'Invalid', active: false, message: 'No key was set.' };
    if (!model || !deployment) {
      return {
        fresh: true,
        status: 'Invalid',
        active: false,
        message: 'Set SIFT_MODEL_NAME to the one model this key is for, and SIFT_DEPLOYMENT_ID to the deployment it runs on.'
      };
    }

    var answer = await postJson(
      endpoint,
      { action: 'check', key_hash: state.hash, model: model, deployment_id: deployment },
      timeoutMs
    );
    if (answer.kind === 'refused') return { fresh: true, status: 'Invalid', active: false, message: answer.body.message || '' };
    if (answer.kind !== 'ok') return { fresh: false };

    var body = answer.body || {};
    return {
      fresh: true,
      status: String(body.status || 'Invalid'),
      active: body.active === true,
      lockedTo: String(body.locked_to || ''),
      expiresAt: body.expires_at || null,
      message: String(body.message || '')
    };
  }

  // The rules for this key and this binding. Fetched once, held in memory, and
  // only while the key is active and locked.
  async function ensurePolicy() {
    if (state.inputRules.length || state.replyRules.length) return true;
    var answer = await postJson(
      endpoint,
      { action: 'policy', key_hash: state.hash, model: model, deployment_id: deployment },
      timeoutMs
    );
    if (answer.kind !== 'ok') return false;
    var body = answer.body || {};
    state.inputRules = compileRules(body.input);
    state.replyRules = compileRules(body.reply);
    state.deniedTools = (body.denied_tools || []).map(String);
    return state.inputRules.length > 0 || state.replyRules.length > 0;
  }

  // Steps the key, the kill switch, the cache and the rules, in that order, on
  // every call.
  async function refresh() {
    if (state.stopped) return verdict();

    var local = readSwitch(config);
    if (local.on) return latch(local.unreadable ? 'kill_switch_unreadable' : 'kill_switch_local');
    state.category = 'none';

    // No key at all: nothing to hash and nothing to send. The guardrails stay
    // off, and your product carries on running as it normally would — this is
    // not a stop, only an absence of protection.
    if (!state.hash && key) state.hash = await sha256Hex(key);
    if (!state.hash) {
      state.status = 'Invalid';
      state.active = false;
      state.message = 'No key was set.';
      return verdict();
    }

    var now = Date.now();
    if (!state.cachedAt || now - state.cachedAt >= cacheMs) {
      var answer = await ask();
      if (answer.fresh) {
        // A Stopped answer is never cached and never softened.
        if (answer.status === 'Stopped') return latch('kill_switch_remote');
        state.cachedAt = now;
        state.status = answer.status;
        state.active = answer.active;
        state.lockedTo = answer.lockedTo || '';
        state.expiresAt = answer.expiresAt || null;
        state.message = answer.message || '';
      } else {
        // The check could not get through. The last good answer stands for the
        // grace window, so a brief outage does not turn the guardrails off
        // mid-day.
        var withinGrace = state.active === true && state.cachedAt > 0 && now - state.cachedAt < graceMs;
        writeAudit({ category: 'validation_outage', gate: 'license_check', decision: withinGrace ? 'allowed' : 'blocked' });
        if (!withinGrace) {
          state.status = 'Outage';
          state.active = false;
          return { status: 'Outage', active: false, stopped: false, category: 'validation_outage', lockedTo: state.lockedTo, expiresAt: state.expiresAt, message: 'The check could not be reached.' };
        }
      }
    }

    if (state.active) await ensurePolicy();
    return verdict();
  }

  function scanInput(text) {
    var hit = firstHit(text, state.inputRules);
    if (!hit) return null;
    return { category: insidePasted(text, hit.index) ? 'pasted_instruction' : hit.category };
  }

  function scanReply(text) {
    var hit = firstHit(text, state.replyRules);
    if (hit) return { clean: false, category: hit.category };

    for (var i = 0; i < internalNames.length; i += 1) {
      var name = String(internalNames[i] || '');
      if (name && text.toLowerCase().indexOf(name.toLowerCase()) !== -1) return { clean: false, category: 'internal_name' };
    }

    var mail = text.match(EMAIL) || [];
    for (var e = 0; e < mail.length; e += 1) {
      if (ownAddresses.indexOf(mail[e].toLowerCase()) === -1) return { clean: false, category: 'foreign_address' };
    }
    var digits = ownAddresses.map(function (value) { return value.replace(/[^\d]/g, ''); });
    var phones = text.match(PHONE) || [];
    for (var p = 0; p < phones.length; p += 1) {
      if (digits.indexOf(phones[p].replace(/[^\d]/g, '')) === -1) return { clean: false, category: 'foreign_address' };
    }

    return { clean: true, category: 'none' };
  }

  function checkTool(name, args) {
    if (!name) return { allowed: false, category: 'tool_not_allowed' };
    if (!allowShellTools && state.deniedTools.indexOf(name) !== -1) return { allowed: false, category: 'tool_not_allowed' };
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
    // Once, at start-up. Never throws: a key that is not active and locked
    // simply leaves the guardrails off.
    async ready() {
      return refresh();
    },

    state: function () {
      return Object.assign({}, verdict(), { steps: state.steps, keyed: state.hash !== '', model: model, deployment: deployment });
    },

    // Steps 1 to 4, and the audit entry, for every message.
    async guardMessage(text) {
      var now = await refresh();
      if (now.stopped) return { allowed: false, guarded: false, reply: STOP_REPLY, category: now.category };
      if (!now.active) {
        return {
          allowed: true,
          guarded: false,
          reply: null,
          category: now.status === 'Outage' ? 'validation_outage' : 'not_active',
          message: now.message
        };
      }
      if (!state.inputRules.length) return { allowed: true, guarded: false, reply: null, category: 'policy_unavailable' };

      var hit = scanInput(String(text === undefined || text === null ? '' : text));
      var written = writeAudit({ category: hit ? hit.category : 'none', gate: 'input_filter', decision: hit ? 'refused' : 'allowed' });
      if (!written) {
        latch('audit_unavailable');
        return { allowed: false, guarded: false, reply: STOP_REPLY, category: 'audit_unavailable' };
      }
      if (hit) return { allowed: false, guarded: true, reply: REFUSAL, category: hit.category };
      return { allowed: true, guarded: true, reply: null, category: 'none' };
    },

    // Steps 5 to 8, around one action of yours.
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
      if (!writeAudit({ category: 'tool_call', gate: 'audit', decision: 'allowed', tool: name, step: state.steps + 1 })) {
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
      if (typeof raw === 'string' && raw) {
        var held = scanReply(raw);
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

      var held = scanReply(String(text === undefined || text === null ? '' : text));
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
