// The pattern library, on SIFT AI's side only.
//
// None of this is in the downloadable plug-in file. The rules are handed to a
// buyer's own plug-in only while a valid key is locked to a binding, and only
// for that binding. A copy of the file on its own has no rules and does nothing.
//
// Categories only, never a message: a rule names what it caught, and the
// customer's audit log records that name and nothing else.

export const GUARD_POLICY_VERSION = 1;

// What someone's message may not be. Each rule is a category and a shape.
const INPUT_PATTERNS: any[] = [
  {
    category: 'instruction_override',
    pattern:
      /\b(ignore|disregard|forget|override|bypass)\b[^.\n]{0,40}\b(previous|prior|earlier|above|all|any)\b[^.\n]{0,30}\b(instruction|instructions|rule|rules|prompt|direction|directions|setting|settings)\b/i
  },
  {
    category: 'instruction_override',
    pattern: /\b(new|updated|revised)\b[^.\n]{0,20}\binstructions?\b|\byou must now\b|\bfrom now on\b[^.\n]{0,20}\b(you|ignore|always)\b/i
  },
  { category: 'instruction_override', pattern: /\b(prompt injection|hidden instruction|injected instruction|system message)\b/i },
  {
    category: 'system_prompt_request',
    pattern:
      /\b(reveal|show|print|repeat|output|display|paste|give)\b[^.\n]{0,30}\b(your|the)\b[^.\n]{0,20}\b(system|developer|hidden|initial|original)\b[^.\n]{0,15}\b(prompt|message|instruction|instructions|rules)\b/i
  },
  {
    category: 'role_switch',
    pattern:
      /\byou are (now|no longer)\b|\bact as\b[^.\n]{0,30}\b(developer|admin|administrator|unrestricted|unfiltered|jailbroken)\b|\bdeveloper mode\b|\bjailbreak\b/i
  },
  {
    category: 'secret_request',
    pattern:
      /\b(give|send|share|tell|show|paste|enter|type|confirm|provide)\b[^.\n]{0,40}\b(password|passphrase|api[-_ ]?key|secret key|private key|one[-_ ]?time code|otp|verification code|card number|cvv|pin|imei|serial number)\b/i
  },
  {
    category: 'tool_override',
    pattern: /\b(run|execute|invoke|call)\b[^.\n]{0,20}\b(shell|terminal|command|subprocess|bash|powershell)\b/i
  }
];

// What a reply may not carry out of the model.
const REPLY_PATTERNS: any[] = [
  {
    category: 'leaked_instruction',
    pattern:
      /\b(my|the)\b[^.\n]{0,20}\b(system|developer|hidden|initial|original)\b[^.\n]{0,15}\b(prompt|message|instructions|rules)\b|\bhere (is|are) (my|the) instructions\b|\bmy instructions (say|are)\b|\bI was told to\b/i
  },
  {
    category: 'secret_request',
    pattern:
      /\b(send|give|share|paste|enter|type|provide|confirm|tell me)\b[^.\n]{0,40}\b(password|passphrase|api[-_ ]?key|secret key|private key|one[-_ ]?time code|otp|verification code|card number|cvv|pin|imei|serial number|bank details|account number)\b/i
  },
  {
    category: 'internal_name',
    pattern:
      /\b(sk-[A-Za-z0-9]{16,}|pk_(live|test)_[A-Za-z0-9]{8,}|ghp_[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{12,}|AIza[0-9A-Za-z_-]{20,})\b/
  },
  { category: 'internal_name', pattern: /\b[A-Z]{2,8}-[A-Z0-9]{3,4}(-[A-Z0-9]{3,4}){1,4}\b/ },
  { category: 'internal_name', pattern: /\b[0-9a-f]{32,}\b/i }
];

// Tool names no guardrail should ever pass through to a model.
export const GUARD_DENIED_TOOLS = [
  'shell',
  'exec',
  'execute',
  'eval',
  'system',
  'terminal',
  'bash',
  'sh',
  'cmd',
  'subprocess',
  'run_command',
  'read_file',
  'write_file',
  'delete_file',
  'fetch_url'
];

// The policy as the plug-in receives it: category names and rule shapes, with
// no wording of ours, no prompts and no internal names beyond the categories.
export function guardPolicy() {
  const asRules = (pairs: any[]) => pairs.map(({ category, pattern }) => ({ category, signature: pattern.source }));
  return {
    policy_version: GUARD_POLICY_VERSION,
    input: asRules(INPUT_PATTERNS),
    reply: asRules(REPLY_PATTERNS),
    denied_tools: GUARD_DENIED_TOOLS
  };
}