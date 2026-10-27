"""SIFT AI guard plug-in — v1.0 (Python)

A guardrail layer around your model — stops bad instructions reaching it and
bad outputs leaving it.

It does NOT patch, fix, rewrite or retrain your model, and it never touches
model weights. It does not contain SIFT AI's pattern library, raw prompts or
any internal code: the rules below are a small starter set that belongs to you,
and you can add to them.

It never asks for a password, another service's API key, an IMEI, a serial
number or payment details.

Standard library only. Python 3.7+.

---------------------------------------------------------------------------
HOW TO USE IT (details and a test checklist: https://sift-ai.net/plugin)

    from sift_guard import SiftGuard

    guard = SiftGuard(allowed_tools={
        "lookup_order": {"args": {"order_id": {"required": True, "max": 40}}}
    })

    # Once, at start-up.
    state = guard.ready()
    if not state["active"]:
        print("SIFT AI guardrails are off:", state["status"])

    # On every message, before your model sees it.
    guard.begin_turn()
    check = guard.guard_message(user_text)
    if not check["allowed"]:
        return send(check["reply"])
    answer = my_model(user_text)
    safe = guard.filter_reply(answer)
    return send(answer if safe["clean"] else safe["reply"])

    # On every tool the model asks for, instead of calling it directly.
    run = guard.run_tool("lookup_order", {"order_id": order_id}, lambda a: lookup_order(a["order_id"]))

---------------------------------------------------------------------------
WHAT IT CHECKS, IN THIS ORDER
  1. the key, from SIFT_LICENSE_KEY
  2. the kill switch — on, or unreadable, stops everything
  3. the key against SIFT AI, with a short cache
  4. instruction attempts in a message, before your model sees it
  5. the tool gate, before any tool runs
  6. an audit entry, before the action — no entry, no action
  7. your action, then the reply is scanned before it goes out
  8. a step ceiling per turn
"""

import hashlib
import json
import os
import re
import time
import urllib.error
import urllib.request

DEFAULTS = {
    "endpoint": "https://siftai.base44.app/functions/validateLicense",
    "cache_seconds": 600,  # a good answer stands this long before it is checked again
    "grace_hours": 12,     # a check that cannot get through keeps guardrails on this long
    "timeout_seconds": 5,
    "max_steps": 12,
    "audit_log": "./sift-guard-audit.log",
}

# One short, plain refusal. It says nothing about what was caught.
REFUSAL = "That request cannot be run."
HELD_REPLY = "That reply cannot be shown."
STOP_REPLY = "This has been stopped."

# Tool names that are dangerous by default: allow_shell_tools=True turns this off.
SHELL_TOOLS = re.compile(
    r"^(shell|exec|execute|eval|system|terminal|bash|sh|cmd|subprocess|run_command"
    r"|read_file|write_file|delete_file|fetch_url)$",
    re.IGNORECASE,
)

EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]{2,}")
PHONE = re.compile(r"\+?\d[\d\s().-]{7,}\d")

# Starter rules. Yours go in extra_rules / extra_reply_rules. Message text is
# never logged, only the category a rule belongs to.
INPUT_RULES = [
    ("instruction_override", re.compile(
        r"\b(ignore|disregard|forget|override|bypass)\b[^.\n]{0,40}\b(previous|prior|earlier|above|all|any)\b"
        r"[^.\n]{0,30}\b(instruction|instructions|rule|rules|prompt|direction|directions|setting|settings)\b",
        re.IGNORECASE)),
    ("instruction_override", re.compile(
        r"\b(new|updated|revised)\b[^.\n]{0,20}\binstructions?\b|\byou must now\b|\bfrom now on\b[^.\n]{0,20}\b(you|ignore|always)\b",
        re.IGNORECASE)),
    ("instruction_override", re.compile(
        r"\b(prompt injection|hidden instruction|injected instruction|system message)\b", re.IGNORECASE)),
    ("system_prompt_request", re.compile(
        r"\b(reveal|show|print|repeat|output|display|paste|give)\b[^.\n]{0,30}\b(your|the)\b[^.\n]{0,20}"
        r"\b(system|developer|hidden|initial|original)\b[^.\n]{0,15}\b(prompt|message|instruction|instructions|rules)\b",
        re.IGNORECASE)),
    ("role_switch", re.compile(
        r"\byou are (now|no longer)\b|\bact as\b[^.\n]{0,30}\b(developer|admin|administrator|unrestricted|unfiltered|jailbroken)\b"
        r"|\bdeveloper mode\b|\bjailbreak\b",
        re.IGNORECASE)),
    ("secret_request", re.compile(
        r"\b(give|send|share|tell|show|paste|enter|type|confirm|provide)\b[^.\n]{0,40}"
        r"\b(password|passphrase|api[-_ ]?key|secret key|private key|one[-_ ]?time code|otp|verification code"
        r"|card number|cvv|pin|imei|serial number)\b",
        re.IGNORECASE)),
    ("tool_override", re.compile(
        r"\b(run|execute|invoke|call)\b[^.\n]{0,20}\b(shell|terminal|command|subprocess|bash|powershell)\b",
        re.IGNORECASE)),
]

REPLY_RULES = [
    ("leaked_instruction", re.compile(
        r"\b(my|the)\b[^.\n]{0,20}\b(system|developer|hidden|initial|original)\b[^.\n]{0,15}"
        r"\b(prompt|message|instructions|rules)\b|\bhere (is|are) (my|the) instructions\b|\bmy instructions (say|are)\b"
        r"|\bI was told to\b",
        re.IGNORECASE)),
    ("secret_request", re.compile(
        r"\b(send|give|share|paste|enter|type|provide|confirm|tell me)\b[^.\n]{0,40}"
        r"\b(password|passphrase|api[-_ ]?key|secret key|private key|one[-_ ]?time code|otp|verification code"
        r"|card number|cvv|pin|imei|serial number|bank details|account number)\b",
        re.IGNORECASE)),
    ("internal_name", re.compile(
        r"\b(sk-[A-Za-z0-9]{16,}|pk_(live|test)_[A-Za-z0-9]{8,}|ghp_[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}"
        r"|AKIA[0-9A-Z]{12,}|AIza[0-9A-Za-z_-]{20,})\b")),
    ("internal_name", re.compile(r"\b[A-Z]{2,8}-[A-Z0-9]{3,4}(-[A-Z0-9]{3,4}){1,4}\b")),
    ("internal_name", re.compile(r"\b[0-9a-f]{32,}\b", re.IGNORECASE)),
]


def canonical_key(raw):
    """Whatever was pasted into SIFT_LICENSE_KEY, in the one shape SIFT AI
    matches: uppercase, no spaces. The hash is worked out from exactly this."""
    text = "" if raw is None else str(raw)
    clean = re.sub(r"[^A-Z0-9]", "", text.upper())
    if clean.startswith("SIFTLIC") and len(clean) == 23:
        body = clean[7:]
        return "SIFT-LIC-" + "-".join(body[i:i + 4] for i in range(0, 16, 4))
    return text.strip().upper()


def _is_pasted(text, index):
    before = text[:index]
    if before.count("```") % 2 == 1:
        return True
    line = before[before.rfind("\n") + 1:]
    return bool(re.match(r"^\s*>", line))


def _scan_input(text, extra_rules):
    for category, pattern in list(INPUT_RULES) + list(extra_rules or []):
        hit = pattern.search(text)
        if hit:
            # The same words inside something the person pasted in are their own
            # category: a document is not a person giving an order.
            return "pasted_instruction" if _is_pasted(text, hit.start()) else category
    return None


def _scan_reply(text, own_addresses, internal_names, extra_rules):
    for category, pattern in list(REPLY_RULES) + list(extra_rules or []):
        if pattern.search(text):
            return {"clean": False, "category": category}

    for name in internal_names or []:
        if str(name) and str(name).lower() in text.lower():
            return {"clean": False, "category": "internal_name"}

    own = [str(value).lower() for value in (own_addresses or [])]
    for found in EMAIL.findall(text):
        if found.lower() not in own:
            return {"clean": False, "category": "foreign_address"}
    own_digits = [re.sub(r"[^\d]", "", value) for value in own]
    for found in PHONE.findall(text):
        if re.sub(r"[^\d]", "", found) not in own_digits:
            return {"clean": False, "category": "foreign_address"}

    return {"clean": True, "category": "none"}


class SiftGuard:
    def __init__(self, license_key=None, kill_switch=None, endpoint=None, audit_log=None,
                 cache_seconds=None, grace_hours=None, timeout_seconds=None, max_steps=None,
                 allowed_tools=None, own_addresses=None, internal_names=None,
                 extra_rules=None, extra_reply_rules=None, allow_shell_tools=False, sink=None):
        self.endpoint = endpoint or os.environ.get("SIFT_VALIDATE_URL") or DEFAULTS["endpoint"]
        self.audit_log = audit_log or os.environ.get("SIFT_AUDIT_LOG") or DEFAULTS["audit_log"]
        self.cache_seconds = float(cache_seconds or os.environ.get("SIFT_CACHE_SECONDS") or DEFAULTS["cache_seconds"])
        self.grace_seconds = float(grace_hours or os.environ.get("SIFT_GRACE_HOURS") or DEFAULTS["grace_hours"]) * 3600
        self.timeout_seconds = float(timeout_seconds or DEFAULTS["timeout_seconds"])
        self.max_steps = int(max_steps or os.environ.get("SIFT_MAX_STEPS") or DEFAULTS["max_steps"])
        self.allowed_tools = allowed_tools or {}
        self.own_addresses = own_addresses or []
        self.internal_names = internal_names or []
        self.extra_rules = extra_rules or []
        self.extra_reply_rules = extra_reply_rules or []
        self.allow_shell_tools = allow_shell_tools
        self.sink = sink or self._file_sink

        key = license_key if license_key is not None else os.environ.get("SIFT_LICENSE_KEY")
        self.key = canonical_key(key)
        self.hash = hashlib.sha256(self.key.encode("utf-8")).hexdigest() if self.key else ""

        # A kill switch given here wins; otherwise the environment is read on
        # every check, so flipping it stops the very next action.
        self.kill_switch = kill_switch
        self.status = "Invalid"
        self.active = False
        self.expires_at = None
        self.cached_at = 0.0
        self.stopped = False
        self.stop_category = ""
        self.steps = 0
        self.category = "none"

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
            return self.sink(json.dumps(entry)) is not False
        except Exception:
            return False

    # ------------------------------------------------------- kill switch, key

    def read_switch(self):
        """The kill switch is read before anything else. A switch that cannot be
        read is a stop, not a pass."""
        if self.kill_switch is not None:
            return {"on": bool(self.kill_switch), "unreadable": False}
        try:
            raw = os.environ.get("SIFT_KILL_SWITCH")
        except Exception:
            return {"on": True, "unreadable": True}
        if raw is None or str(raw).strip() == "":
            return {"on": False, "unreadable": False}
        return {"on": str(raw).strip().lower() in ("1", "true", "on", "yes", "stop", "stopped"), "unreadable": False}

    def _ask(self):
        if not self.hash:
            return {"fresh": True, "status": "Invalid", "active": False, "expires_at": None}
        try:
            body = json.dumps({"key_hash": self.hash}).encode("utf-8")
            request = urllib.request.Request(
                self.endpoint, data=body, headers={"content-type": "application/json"}, method="POST"
            )
            with urllib.request.urlopen(request, timeout=self.timeout_seconds) as response:
                answer = json.loads(response.read().decode("utf-8"))
            return {
                "fresh": True,
                "status": str(answer.get("status") or "Invalid"),
                "active": answer.get("active") is True,
                "expires_at": answer.get("expires_at"),
            }
        except urllib.error.HTTPError as error:
            if error.code in (400, 403):
                return {"fresh": True, "status": "Invalid", "active": False, "expires_at": None}
            return {"fresh": False}
        except Exception:
            return {"fresh": False}

    def _latch(self, category):
        self.stopped = True
        self.stop_category = category
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
            "expires_at": self.expires_at,
        }

    def refresh(self):
        """Steps the key, the kill switch and the cache, in that order, on every
        call."""
        if self.stopped:
            return self.verdict()

        local = self.read_switch()
        if local["on"]:
            return self._latch("kill_switch_unreadable" if local["unreadable"] else "kill_switch_local")
        self.category = "none"

        if not self.hash:
            return self._latch("no_key")

        now = time.time()
        if self.cached_at and now - self.cached_at < self.cache_seconds:
            return self.verdict()

        answer = self._ask()
        if answer["fresh"]:
            # A Stopped answer is never cached and never softened.
            if answer["status"] == "Stopped":
                return self._latch("kill_switch_remote")
            self.cached_at = now
            self.status = answer["status"]
            self.active = answer["active"]
            self.expires_at = answer["expires_at"]
            return self.verdict()

        # The check could not get through. The last good answer stands for the
        # grace window, so a brief outage does not turn the guardrails off
        # mid-day.
        within_grace = self.active is True and self.cached_at > 0 and now - self.cached_at < self.grace_seconds
        self.write_audit(category="validation_outage", gate="license_check",
                         decision="allowed" if within_grace else "blocked")
        if within_grace:
            return self.verdict()
        return {"status": "Outage", "active": False, "stopped": False,
                "category": "validation_outage", "expires_at": self.expires_at}

    # ---------------------------------------------------------------- the gate

    def check_tool(self, name, args):
        if not name:
            return {"allowed": False, "category": "tool_not_allowed"}
        if not self.allow_shell_tools and SHELL_TOOLS.match(name):
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
        """Once, at start-up. Never raises: a bad key leaves the guardrails off."""
        return self.refresh()

    def state(self):
        current = dict(self.verdict())
        current["steps"] = self.steps
        current["keyed"] = bool(self.hash)
        return current

    def guard_message(self, text):
        """Step 1 to 4, and the audit entry, for every message."""
        now = self.refresh()
        if now["stopped"]:
            return {"allowed": False, "guarded": False, "reply": STOP_REPLY, "category": now["category"]}
        if not now["active"]:
            return {"allowed": True, "guarded": False, "reply": None,
                    "category": "validation_outage" if now["status"] == "Outage" else "not_active"}

        hit = _scan_input("" if text is None else str(text), self.extra_rules)
        written = self.write_audit(category=hit or "none", gate="input_filter",
                                   decision="refused" if hit else "allowed")
        if not written:
            self._latch("audit_unavailable")
            return {"allowed": False, "guarded": False, "reply": STOP_REPLY, "category": "audit_unavailable"}
        if hit:
            return {"allowed": False, "guarded": True, "reply": REFUSAL, "category": hit}
        return {"allowed": True, "guarded": True, "reply": None, "category": "none"}

    def run_tool(self, name, args=None, handler=None):
        """Step 5 to 8, around one action of yours."""
        now = self.refresh()
        if now["stopped"]:
            self.write_audit(category=now["category"], gate="kill_switch", decision="blocked", tool=name)
            return {"ran": False, "blocked": True, "guarded": False, "reply": STOP_REPLY, "category": now["category"]}
        if not now["active"]:
            loose = handler(args or {}) if handler else None
            return {"ran": True, "blocked": False, "guarded": False, "result": loose, "reply": None, "category": "not_active"}

        gate = self.check_tool(name, args or {})
        if not gate["allowed"]:
            self.write_audit(category=gate["category"], gate="tool_gate", decision="blocked", tool=name)
            return {"ran": False, "blocked": True, "guarded": True, "reply": REFUSAL, "category": gate["category"]}

        # The entry goes in before the action. If it cannot be written, the
        # action does not happen.
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
            held = _scan_reply(raw, self.own_addresses, self.internal_names, self.extra_reply_rules)
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
            return {"clean": True, "guarded": False, "reply": None, "category": "not_active"}

        held = _scan_reply("" if text is None else str(text), self.own_addresses, self.internal_names, self.extra_reply_rules)
        self.write_audit(category="none" if held["clean"] else held["category"], gate="reply_filter",
                         decision="allowed" if held["clean"] else "held")
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
        self.stop_category = ""
        self.cached_at = 0.0
        self.steps = 0
        self.category = "none"
        return self.state()
