"""SIFT AI guard plug-in — v1.1 (Python)

A guardrail layer around your model — stops bad instructions reaching it and
bad outputs leaving it.

This file is thin on purpose. It carries no detection rules and no pattern
library: those arrive from SIFT AI only while your key is valid and locked to
your model. A copy of this file on its own does nothing.

It does NOT patch, fix, rewrite or retrain your model, and it never touches
model weights.

It never asks for a password, another service's API key, an IMEI, a serial
number or payment details.

It reads from your environment:
    SIFT_LICENSE_KEY     your SIFT AI key. Required.
    SIFT_MODEL_NAME      the ONE model this key is for. Required.
    SIFT_DEPLOYMENT_ID   the deployment or domain it runs on. Required.
    SIFT_KILL_SWITCH     optional: on, or unreadable, stops everything first.
    SIFT_AUDIT_LOG       optional: where the audit entries are written.
    SIFT_VALIDATE_URL    optional: the SIFT AI check endpoint.

Grace-period settings are ignored: a failed validation blocks actions.
Custom audit sinks must synchronously persist the entry and return True.

One key, one model, one use. The first model to activate the key is the only one
it works with. Any other model is refused with:
    "This key is already locked to another model."

Standard library only. Python 3.7+.

---------------------------------------------------------------------------
HOW TO USE IT (details and a test checklist: https://sift-ai.net/plugin)

    from sift_guard import SiftGuard

    guard = SiftGuard(allowed_tools={
        "lookup_order": {"args": {"order_id": {"required": True, "max": 40}}}
    })

    state = guard.ready()
    if not state["active"]:
        print("SIFT AI guardrails are off:", state["status"], state.get("message"))

    guard.begin_turn()
    check = guard.guard_message(user_text)
    if not check["allowed"]:
        return send(check["reply"])
    answer = my_model(user_text)
    safe = guard.filter_reply(answer)
    return send(answer if safe["clean"] else safe["reply"])

    run = guard.run_tool("lookup_order", {"order_id": order_id}, lambda a: lookup_order(a["order_id"]))

---------------------------------------------------------------------------
WHAT IT CHECKS, IN THIS ORDER
  1. the key, and the one model it is bound to
  2. the kill switch — on, or unreadable, stops everything
  3. the key and binding against SIFT AI, with a short cache
  4. instruction attempts in a message, before your model sees it
  5. the tool gate, before any tool runs
  6. an audit entry, before the action — no entry, no action
  7. your action, then the reply is shielded before it goes out
  8. a step ceiling per turn
"""

import hashlib
import datetime
import json
import math
import os
import re
import threading
import time
import urllib.error
import urllib.parse
import urllib.request

DEFAULTS = {
    "endpoint": "https://siftai.base44.app/functions/validateLicense",
    "cache_seconds": 600,  # a good answer stands this long before it is checked again
    "timeout_seconds": 5,
    "max_steps": 12,
    "audit_log": "./sift-guard-audit.log",
}

# One short, plain refusal. It says nothing about what was caught.
REFUSAL = "That request cannot be run."
HELD_REPLY = "That reply cannot be shown."
STOP_REPLY = "This has been stopped."

EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]{2,}")
PHONE = re.compile(r"\+?\d[\d\s().-]{7,}\d")

class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def canonical_key(raw):
    """Whatever was pasted into SIFT_LICENSE_KEY, in the one shape SIFT AI
    matches: uppercase, no spaces. The hash is worked out from exactly this, and
    the key itself never leaves your product."""
    text = "" if raw is None else str(raw)
    clean = re.sub(r"[^A-Z0-9]", "", text.upper())
    if clean.startswith("SIFTLIC") and len(clean) == 23:
        body = clean[7:]
        return "SIFT-LIC-" + "-".join(body[i:i + 4] for i in range(0, 16, 4))
    return text.strip().upper()


def compile_rules(rules):
    """The rules come from SIFT AI, already written, and are compiled here.
    Nothing in this file decides what a bad instruction looks like."""
    compiled = []
    if not isinstance(rules, list) or not rules:
        return []
    for rule in rules:
        if not isinstance(rule, dict) or not isinstance(rule.get("signature"), str) or not rule["signature"]:
            return []
        try:
            compiled.append((str(rule.get("category") or "none"), re.compile(rule["signature"], re.IGNORECASE)))
        except re.error:
            return []
    return compiled


def first_hit(text, rules):
    for category, pattern in rules:
        hit = pattern.search(text)
        if hit:
            return {"category": category, "index": hit.start()}
    return None


def inside_pasted(text, index):
    """The same words inside something the person pasted in are their own
    category: a document is not a person giving an order."""
    before = text[:index]
    if before.count("```") % 2 == 1:
        return True
    return bool(re.match(r"^\s*>", before[before.rfind("\n") + 1:]))


class SiftGuard:
    def __init__(self, license_key=None, model=None, deployment_id=None, kill_switch=None,
                 endpoint=None, audit_log=None, cache_seconds=None, grace_hours=None,
                 timeout_seconds=None, max_steps=None, allowed_tools=None,
                 own_addresses=None, internal_names=None, allow_shell_tools=False, sink=None):
        self.endpoint = endpoint or os.environ.get("SIFT_VALIDATE_URL") or DEFAULTS["endpoint"]
        self.audit_log = audit_log or os.environ.get("SIFT_AUDIT_LOG") or DEFAULTS["audit_log"]
        cache_value = cache_seconds if cache_seconds is not None else os.environ.get("SIFT_CACHE_SECONDS") or DEFAULTS["cache_seconds"]
        self.cache_seconds = float(cache_value)
        if not math.isfinite(self.cache_seconds) or not 0 <= self.cache_seconds <= 600:
            raise ValueError("SIFT_CACHE_SECONDS must be between 0 and 600")
        self.timeout_seconds = float(timeout_seconds or DEFAULTS["timeout_seconds"])
        self.max_steps = int(max_steps or os.environ.get("SIFT_MAX_STEPS") or DEFAULTS["max_steps"])
        self.allowed_tools = allowed_tools or {}
        self.own_addresses = [str(value).lower() for value in (own_addresses or [])]
        self.internal_names = internal_names or []
        self.allow_shell_tools = allow_shell_tools
        self.sink = sink or self._file_sink

        key = license_key if license_key is not None else os.environ.get("SIFT_LICENSE_KEY")
        self.key = canonical_key(key)
        self.hash = hashlib.sha256(self.key.encode("utf-8")).hexdigest() if self.key else ""

        # The one model this key is for, and the deployment it runs on. The check
        # binds the key to them, and to nothing else.
        self.model = str(model if model is not None else os.environ.get("SIFT_MODEL_NAME") or "").strip()
        self.deployment = str(deployment_id if deployment_id is not None else os.environ.get("SIFT_DEPLOYMENT_ID") or "").strip()

        # Both configured and environment switches are read on every check.
        self.kill_switch = kill_switch
        self.status = "Invalid"
        self.active = False
        self.locked_to = ""
        self.expires_at = None
        self.message = ""
        self.cached_at = 0.0
        self.stopped = False
        self.steps = 0
        self.category = "none"
        self.input_rules = []
        self.reply_rules = []
        self.denied_tools = []
        self._refresh_lock = threading.Lock()

    # ------------------------------------------------------------------ audit

    def _file_sink(self, line):
        with open(self.audit_log, "a", encoding="utf-8") as handle:
            handle.write(line + "\n")
        return True

    def write_audit(self, **fields):
        """Only categories, decisions and tool names go in: never a message,
        never a prompt, never a key."""
        entry = {
            "at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "category": str(fields.get("category") or "none"),
            "gate": str(fields.get("gate") or "none"),
            "decision": str(fields.get("decision") or "none"),
        }
        if fields.get("tool"):
            entry["tool"] = str(fields["tool"])
        if fields.get("step") is not None:
            entry["step"] = int(fields["step"])
        try:
            return self.sink(json.dumps(entry)) is True
        except Exception:
            return False

    # ------------------------------------------------------- kill switch, key

    def read_switch(self):
        """The kill switch is read before anything else. A switch that cannot be
        read is a stop, not a pass."""
        try:
            values = [self.kill_switch, os.environ.get("SIFT_KILL_SWITCH")]
            for raw in values:
                if raw is None or str(raw).strip() == "":
                    continue
                value = str(raw).strip().lower()
                if value in ("0", "false", "off", "no"):
                    continue
                if value in ("1", "true", "on", "yes", "stop", "stopped"):
                    return {"on": True, "unreadable": False}
                return {"on": True, "unreadable": True}
        except Exception:
            return {"on": True, "unreadable": True}
        return {"on": False, "unreadable": False}

    def _post(self, payload):
        try:
            target = urllib.parse.urlsplit(self.endpoint)
            if target.scheme != "https" or not target.hostname or target.username or target.password or target.fragment:
                return {"kind": "unavailable", "body": {}}
            body = json.dumps(payload).encode("utf-8")
            request = urllib.request.Request(
                self.endpoint, data=body, headers={"content-type": "application/json"}, method="POST"
            )
            with urllib.request.build_opener(_NoRedirect()).open(request, timeout=self.timeout_seconds) as response:
                body = json.loads(response.read().decode("utf-8"))
                return {"kind": "ok", "body": body} if isinstance(body, dict) else {"kind": "unavailable", "body": {}}
        except urllib.error.HTTPError as error:
            if error.code in (400, 403):
                return {"kind": "refused", "body": {}}
            return {"kind": "unavailable", "body": {}}
        except Exception:
            return {"kind": "unavailable", "body": {}}

    def _ask(self):
        if not self.hash:
            return {"fresh": True, "status": "Invalid", "active": False, "message": "No key was set."}
        if not self.model or not self.deployment:
            return {
                "fresh": True,
                "status": "Invalid",
                "active": False,
                "message": "Set SIFT_MODEL_NAME to the one model this key is for, and SIFT_DEPLOYMENT_ID to the deployment it runs on.",
            }

        answer = self._post({"action": "check", "key_hash": self.hash, "model": self.model, "deployment_id": self.deployment})
        if answer["kind"] == "refused":
            return {"fresh": True, "status": "Invalid", "active": False, "message": answer["body"].get("message", "")}
        if answer["kind"] != "ok":
            return {"fresh": False}

        body = answer["body"] or {}
        if body.get("kill_switch") is True:
            return {"fresh": True, "status": "Stopped", "active": False}
        active = body.get("active") is True
        if active and (body.get("status") != "Active" or not isinstance(body.get("locked_to"), str) or
                       body["locked_to"].strip().lower() != self.model.lower()):
            return {"fresh": True, "status": "Invalid", "active": False, "message": "Invalid validation response."}
        return {
            "fresh": True,
            "status": str(body.get("status") or "Invalid"),
            "active": active,
            "locked_to": str(body.get("locked_to") or ""),
            "expires_at": body.get("expires_at"),
            "message": str(body.get("message") or ""),
        }

    def ensure_policy(self):
        """The rules for this key and this binding. Fetched once, held in memory,
        and only while the key is active and locked."""
        if self.input_rules or self.reply_rules:
            return True
        answer = self._post({"action": "policy", "key_hash": self.hash, "model": self.model, "deployment_id": self.deployment})
        if answer["kind"] != "ok":
            return False
        body = answer["body"] or {}
        if (body.get("kill_switch") is True or not isinstance(body.get("locked_to"), str) or
                body["locked_to"].strip().lower() != self.model.lower() or
                not isinstance(body.get("denied_tools"), list) or not body["denied_tools"] or
                not all(isinstance(name, str) and name for name in body["denied_tools"])):
            return False
        input_rules = compile_rules(body.get("input"))
        reply_rules = compile_rules(body.get("reply"))
        if not input_rules or not reply_rules:
            return False
        self.input_rules = input_rules
        self.reply_rules = reply_rules
        self.denied_tools = body["denied_tools"]
        return True

    def _latch(self, category):
        self.stopped = True
        self.active = False
        self.category = category
        self.write_audit(category=category, gate="kill_switch", decision="blocked")
        return self.verdict()

    def verdict(self):
        return {
            "status": "Stopped" if self.stopped else self.status,
            "active": self.active is True and not self.stopped,
            "stopped": self.stopped,
            "category": self.category,
            "locked_to": self.locked_to,
            "expires_at": self.expires_at,
            "message": self.message,
        }

    def refresh(self):
        """Steps the key, the kill switch, the cache and the rules, in that
        order, on every call."""
        with self._refresh_lock:
            result = self._refresh_locked()
            if not self.stopped:
                local = self.read_switch()
                if local["on"]:
                    return self._latch("kill_switch_unreadable" if local["unreadable"] else "kill_switch_local")
            return result

    def _refresh_locked(self):
        if self.stopped:
            return self.verdict()

        local = self.read_switch()
        if local["on"]:
            return self._latch("kill_switch_unreadable" if local["unreadable"] else "kill_switch_local")
        self.category = "none"

        if not self.hash:
            self.status = "Invalid"
            self.active = False
            self.message = "No key was set."
            return self.verdict()

        now = time.time()
        if not self.cached_at or now < self.cached_at or now - self.cached_at >= self.cache_seconds:
            answer = self._ask()
            if answer["fresh"]:
                # A Stopped answer is never cached and never softened.
                if answer["status"] == "Stopped":
                    return self._latch("kill_switch_remote")
                self.cached_at = now
                self.status = answer["status"]
                self.active = answer["active"]
                self.locked_to = answer.get("locked_to") or ""
                self.expires_at = answer.get("expires_at")
                self.message = answer.get("message") or ""
                self.input_rules = []
                self.reply_rules = []
                self.denied_tools = []
            else:
                self.write_audit(category="validation_outage", gate="license_check",
                                 decision="blocked")
                self.status = "Outage"
                self.active = False
                self.message = "The check could not be reached."
                return self.verdict()

        if self.active and self.expires_at is not None:
            try:
                if not isinstance(self.expires_at, str):
                    raise ValueError("Invalid expiration")
                expiry = datetime.datetime.fromisoformat(str(self.expires_at).replace("Z", "+00:00"))
                if expiry.tzinfo is None or expiry.timestamp() <= now:
                    self.status, self.active = "Expired", False
            except (ValueError, OverflowError, OSError):
                self.status, self.active = "Invalid", False
        if self.active and not self.ensure_policy():
            self.status = "PolicyUnavailable"
            self.active = False
            self.cached_at = 0.0
            self.message = "The guard policy could not be verified."
        return self.verdict()

    # ---------------------------------------------------------------- the gate

    def _scan_input(self, text):
        hit = first_hit(text, self.input_rules)
        if not hit:
            return None
        return "pasted_instruction" if inside_pasted(text, hit["index"]) else hit["category"]

    def _scan_reply(self, text):
        hit = first_hit(text, self.reply_rules)
        if hit:
            return {"clean": False, "category": hit["category"]}

        for name in self.internal_names:
            if str(name) and str(name).lower() in text.lower():
                return {"clean": False, "category": "internal_name"}

        for found in EMAIL.findall(text):
            if found.lower() not in self.own_addresses:
                return {"clean": False, "category": "foreign_address"}
        own_digits = [re.sub(r"[^\d]", "", value) for value in self.own_addresses]
        for found in PHONE.findall(text):
            if re.sub(r"[^\d]", "", found) not in own_digits:
                return {"clean": False, "category": "foreign_address"}

        return {"clean": True, "category": "none"}

    def check_tool(self, name, args):
        if not name:
            return {"allowed": False, "category": "tool_not_allowed"}
        if not self.allow_shell_tools and name in self.denied_tools:
            return {"allowed": False, "category": "tool_not_allowed"}
        if name not in self.allowed_tools:
            return {"allowed": False, "category": "tool_not_allowed"}

        rule = self.allowed_tools.get(name) or {}
        permitted = rule.get("args") or {}
        given = list((args or {}).keys())
        if len(given) > int(rule.get("max_args") or 8):
            return {"allowed": False, "category": "tool_argument_refused"}

        for key in given:
            if key not in permitted:
                return {"allowed": False, "category": "tool_unknown_argument"}
            spec = permitted.get(key) or {}
            value = "" if args.get(key) is None else str(args.get(key))
            if spec.get("max") and len(value) > int(spec["max"]):
                return {"allowed": False, "category": "tool_argument_refused"}
            if spec.get("pattern") and not re.search(str(spec["pattern"]), value):
                return {"allowed": False, "category": "tool_argument_refused"}
            if spec.get("allowed") is not None and value not in [str(item) for item in spec["allowed"]]:
                return {"allowed": False, "category": "tool_argument_refused"}

        for key, spec in permitted.items():
            if (spec or {}).get("required") and key not in given:
                return {"allowed": False, "category": "tool_argument_refused"}
        return {"allowed": True, "category": "none"}

    # -------------------------------------------------------------- the calls

    def ready(self):
        """Check readiness; inactive or unverifiable protection blocks actions."""
        return self.refresh()

    def state(self):
        current = dict(self.verdict())
        current["steps"] = self.steps
        current["keyed"] = bool(self.hash)
        current["model"] = self.model
        current["deployment"] = self.deployment
        return current

    def guard_message(self, text):
        """Steps 1 to 4, and the audit entry, for every message."""
        now = self.refresh()
        if now["stopped"]:
            return {"allowed": False, "guarded": False, "reply": STOP_REPLY, "category": now["category"]}
        if not now["active"]:
            return {"allowed": False, "guarded": False, "reply": STOP_REPLY,
                    "category": "validation_outage" if now["status"] == "Outage" else "not_active",
                    "message": now["message"]}
        if not self.input_rules:
            return {"allowed": False, "guarded": False, "reply": STOP_REPLY, "category": "policy_unavailable"}

        hit = self._scan_input("" if text is None else str(text))
        written = self.write_audit(category=hit or "none", gate="input_filter",
                                   decision="refused" if hit else "allowed")
        if not written:
            self._latch("audit_unavailable")
            return {"allowed": False, "guarded": False, "reply": STOP_REPLY, "category": "audit_unavailable"}
        if hit:
            return {"allowed": False, "guarded": True, "reply": REFUSAL, "category": hit}
        return {"allowed": True, "guarded": True, "reply": None, "category": "none"}

    def run_tool(self, name, args=None, handler=None):
        """Steps 5 to 8, around one action of yours."""
        now = self.refresh()
        if now["stopped"]:
            self.write_audit(category=now["category"], gate="kill_switch", decision="blocked", tool=name)
            return {"ran": False, "blocked": True, "guarded": False, "reply": STOP_REPLY, "category": now["category"]}
        if not now["active"]:
            return {"ran": False, "blocked": True, "guarded": False, "reply": STOP_REPLY, "category": "not_active"}

        gate = self.check_tool(name, args or {})
        if not gate["allowed"]:
            self.write_audit(category=gate["category"], gate="tool_gate", decision="blocked", tool=name)
            return {"ran": False, "blocked": True, "guarded": True, "reply": REFUSAL, "category": gate["category"]}

        # The entry goes in before the action. If it cannot be written, the action
        # does not happen.
        if not self.write_audit(category="tool_call", gate="audit", decision="allowed",
                                tool=name, step=self.steps + 1):
            self._latch("audit_unavailable")
            return {"ran": False, "blocked": True, "guarded": True, "reply": STOP_REPLY, "category": "audit_unavailable"}

        self.steps += 1
        if self.steps > self.max_steps:
            self._latch("step_ceiling")
            self.write_audit(category="step_ceiling", gate="loop_gate", decision="blocked", tool=name, step=self.steps)
            return {"ran": False, "blocked": True, "guarded": True, "reply": STOP_REPLY, "category": "step_ceiling"}

        raw = handler(args or {}) if handler else None
        if isinstance(raw, str) and raw:
            held = self._scan_reply(raw)
            if not held["clean"]:
                self.write_audit(category=held["category"], gate="reply_filter", decision="held", tool=name)
                return {"ran": True, "blocked": False, "guarded": True, "result": None,
                        "reply": HELD_REPLY, "category": held["category"]}
        return {"ran": True, "blocked": False, "guarded": True, "result": raw, "reply": None, "category": "none"}

    def filter_reply(self, text):
        """Step 7 on its own, for a reply that does not come from run_tool."""
        now = self.refresh()
        if now["stopped"]:
            return {"clean": False, "guarded": False, "reply": STOP_REPLY, "category": now["category"]}
        if not now["active"]:
            return {"clean": False, "guarded": False, "reply": STOP_REPLY, "category": "not_active"}

        held = self._scan_reply("" if text is None else str(text))
        if not self.write_audit(category="none" if held["clean"] else held["category"], gate="reply_filter",
                                decision="allowed" if held["clean"] else "held"):
            self._latch("audit_unavailable")
            return {"clean": False, "guarded": False, "reply": STOP_REPLY, "category": "audit_unavailable"}
        if held["clean"]:
            return {"clean": True, "guarded": True, "reply": None, "category": "none"}
        return {"clean": False, "guarded": True, "reply": HELD_REPLY, "category": held["category"]}

    def begin_turn(self):
        """A new turn: the step ceiling counts from zero again. Explicit on
        purpose — nothing here restarts itself."""
        self.steps = 0
        return self.state()

    def reset(self):
        """Clears a latched stop and the cached answer. Only you call this."""
        self.stopped = False
        self.cached_at = 0.0
        self.steps = 0
        self.category = "none"
        return self.state()
