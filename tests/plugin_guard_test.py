import importlib.util
import pathlib
from concurrent.futures import ThreadPoolExecutor
import threading
import time
import unittest
from unittest.mock import patch

path = pathlib.Path(__file__).resolve().parents[1] / "public" / "plugin" / "sift_guard.py"
spec = importlib.util.spec_from_file_location("sift_guard", path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

POLICY = {
    "locked_to": "model",
    "input": [{"category": "blocked", "signature": "forbidden"}],
    "reply": [{"category": "secret", "signature": "secret"}],
    "denied_tools": ["shell"],
}


class GuardTest(unittest.TestCase):
    def guard(self, **kwargs):
        options = {
            "license_key": "key", "model": "model", "deployment_id": "deployment",
            "endpoint": "https://license.example/check", "cache_seconds": 0.001,
            "allowed_tools": {"lookup": {"args": {}}}, "kill_switch": False,
            "sink": lambda _: True,
        }
        options.update(kwargs)
        return module.SiftGuard(**options)

    def test_inactive_and_untrusted_inputs_never_run(self):
        guard = self.guard()
        guard._post = lambda _: {"kind": "unavailable", "body": {}}
        called = []
        self.assertFalse(guard.guard_message("hello")["allowed"])
        self.assertFalse(guard.filter_reply("hello")["clean"])
        self.assertFalse(guard.run_tool("lookup", {}, lambda _: called.append(True))["ran"])
        self.assertEqual(called, [])

        guard._post = lambda request: {
            "kind": "ok",
            "body": {"status": "Active", "active": True, "locked_to": "wrong"}
        }
        self.assertFalse(guard.ready()["active"])
        self.assertFalse(self.guard(license_key="").guard_message("hello")["allowed"])

    def test_valid_policy_and_outage_after_cache_expiry(self):
        guard = self.guard()
        down = [False]

        def post(request):
            if down[0]:
                return {"kind": "unavailable", "body": {}}
            return {"kind": "ok", "body": POLICY if request["action"] == "policy" else {
                "status": "Active", "active": True, "locked_to": "model"
            }}

        guard._post = post
        self.assertTrue(guard.ready()["active"])
        self.assertTrue(guard.guard_message("hello")["allowed"])
        self.assertFalse(guard.guard_message("forbidden")["allowed"])
        self.assertFalse(guard.filter_reply("secret")["clean"])
        self.assertEqual(guard.run_tool("lookup", {}, lambda _: "ok")["result"], "ok")
        down[0] = True
        time.sleep(0.01)
        self.assertFalse(guard.guard_message("hello")["allowed"])
        called = []
        self.assertTrue(guard.run_tool("lookup", {}, lambda _: called.append(True))["blocked"])
        self.assertEqual(called, [])

    def test_invalid_policy_expiry_and_kill_switch_fail_closed(self):
        guard = self.guard()
        guard._post = lambda request: {"kind": "ok", "body": (
            {**POLICY, "reply": [{"signature": "("}]} if request["action"] == "policy" else
            {"status": "Active", "active": True, "locked_to": "model"}
        )}
        self.assertFalse(guard.ready()["active"])
        self.assertFalse(guard.guard_message("hello")["allowed"])
        guard._post = lambda _: {"kind": "ok", "body": {
            "status": "Active", "active": True, "locked_to": "model", "expires_at": "2000-01-01T00:00:00Z"
        }}
        self.assertFalse(guard.ready()["active"])
        remote = self.guard()
        remote._post = lambda _: {"kind": "ok", "body": {
            "status": "Active", "active": True, "locked_to": "model", "kill_switch": True
        }}
        self.assertTrue(remote.ready()["stopped"])
        guard.kill_switch = "unexpected"
        self.assertTrue(guard.ready()["stopped"])
        self.assertEqual(guard.verdict()["category"], "kill_switch_unreadable")
        with patch.dict("os.environ", {"SIFT_KILL_SWITCH": "on"}):
            self.assertTrue(self.guard(kill_switch=False).ready()["stopped"])

    def test_insecure_endpoint_is_refused(self):
        guard = self.guard()
        guard.endpoint = "http://license.example/check"
        self.assertEqual(guard._post({"action": "check"})["kind"], "unavailable")
        self.assertIsNone(module._NoRedirect().redirect_request(None, None, 302, "", {}, "http://example.com"))

    def test_invalid_cache_and_failed_reply_audit(self):
        for value in (float("nan"), -1, 601):
            with self.assertRaises(ValueError):
                self.guard(cache_seconds=value)
        guard = self.guard()
        guard._post = lambda request: {"kind": "ok", "body": (
            POLICY if request["action"] == "policy" else
            {"status": "Active", "active": True, "locked_to": "model"}
        )}
        self.assertTrue(guard.ready()["active"])
        guard.sink = lambda _: None
        self.assertFalse(guard.filter_reply("hello")["clean"])
        self.assertTrue(guard.verdict()["stopped"])

    def test_concurrent_checks_share_validation_and_recheck_switch(self):
        guard = self.guard(cache_seconds=600)
        calls = []

        def post(request):
            calls.append(request["action"])
            time.sleep(0.01)
            return {"kind": "ok", "body": (
                POLICY if request["action"] == "policy" else
                {"status": "Active", "active": True, "locked_to": "model"}
            )}

        guard._post = post
        with ThreadPoolExecutor(max_workers=4) as executor:
            results = list(executor.map(lambda _: guard.ready(), range(4)))
        self.assertTrue(all(result["active"] for result in results))
        self.assertEqual(calls, ["check", "policy"])

        waiting = threading.Event()
        release = threading.Event()
        second = self.guard()

        def paused_post(request):
            if request["action"] == "check":
                waiting.set()
                release.wait(timeout=5)
            return {"kind": "ok", "body": (
                POLICY if request["action"] == "policy" else
                {"status": "Active", "active": True, "locked_to": "model"}
            )}

        second._post = paused_post
        with patch.dict("os.environ", {}, clear=False), ThreadPoolExecutor(max_workers=1) as executor:
            result = executor.submit(second.ready)
            try:
                self.assertTrue(waiting.wait(timeout=5))
                import os
                os.environ["SIFT_KILL_SWITCH"] = "on"
            finally:
                release.set()
            self.assertTrue(result.result(timeout=5)["stopped"])


if __name__ == "__main__":
    unittest.main()
