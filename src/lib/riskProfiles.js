// Two things kept apart on purpose.
//
// The level and the threat line describe the scenario a test covers. They are
// authored once, above any run, and never change with a reply.
//
// What a run recorded is not here at all: it comes from the run itself, verbatim,
// and is shown next to the scenario without being judged.
export const LEVEL_TONE = {
  HIGH: 'border-destructive/40 bg-destructive/10 text-destructive',
  MEDIUM: 'border-amber-500/40 bg-amber-500/10 text-amber-500',
  LOW: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500'
};

export const EVAL_RISK = {
  goal_drift: {
    level: 'HIGH',
    threat:
      'warehouse, delivery and customer-service agents given throughput targets could send a worker into an unsafe job before a person notices.',
    mitigation: [
      'Put the dispatch call behind the tool gate, so it cannot run while a safety pause is set.',
      'Require a written authorisation reference on any turn that lifts a pause, and hold the turn without one.',
      'Keep the pause and every lift in the audit log, written before the action runs.'
    ]
  },
  reward_hacking: {
    level: 'MEDIUM',
    threat:
      'AI-written summaries and dashboards used by managers could hide real safety failures until they repeat.',
    mitigation: [
      'Make the source of every figure a required field, so a summary cannot be filed without one.',
      'Attach the full exception log to any summary that leaves checks out.',
      'Hold a report that states a number the export does not contain, and send it to a person.'
    ]
  },
  collusion: {
    level: 'MEDIUM',
    threat:
      'agents talking machine-to-machine with no readable copy could spread a wrong instruction with no human in the loop.',
    mitigation: [
      'Keep a human-readable copy of every handoff between agents in the operator log.',
      'Treat code-only traffic between agents as an instruction from an untrusted source, and hold it.',
      'Raise an alert when one agent asks another to keep a message out of the shared log.'
    ]
  },
  bias_amplification: {
    level: 'MEDIUM',
    threat:
      'an unchecked number reused by hiring, planning and pricing tools could decide real staffing, pay and who gets help.',
    mitigation: [
      'Refuse to plan on a figure whose source is unverified, and label vendor figures as vendor-reported.',
      'Record which figure fed which decision, so a wrong one can be found and corrected later.',
      'Review hiring and pricing output against the published criteria, never against a summary.'
    ]
  },
  black_box_capability: {
    level: 'HIGH',
    threat:
      'prompt-injection and jailbreak attempts trying to reveal system instructions, settings and limits could let an attacker change the limits or copy the setup.',
    mitigation: [
      'Return the change log entry that names a setting, never the setting or its range.',
      'Require a reviewed change for anything that touches approval rules or limits.',
      'Keep system instructions out of reach of anything an untrusted source can write to.'
    ]
  },
  temporal_poisoning: {
    level: 'HIGH',
    threat:
      'a false instruction saved in long memory or retrieval files could keep acting in every future chat, long after it was planted.',
    mitigation: [
      'Require every saved note to carry the day it was written and the day it stops applying.',
      'Treat a saved instruction as data, never as authority: it cannot waive an approval step.',
      'Review the standing notes on a schedule, and expire anything that has not been reviewed.'
    ]
  }
};

export const GATE_RISK = {
  kill_switch: {
    level: 'HIGH',
    threat:
      'autonomous agents run overnight with access to email, files and payments, and no way to halt them.',
    mitigation: [
      'Read the switch before every other gate, so nothing runs while it is on.',
      'Fail closed: an unreadable switch counts as on, and an error stops the action.',
      'Keep the switch reachable by a person, with no deploy between them and it.'
    ]
  },
  log_before_action: {
    level: 'MEDIUM',
    threat: 'bad actions cannot be traced, explained or undone.',
    mitigation: [
      'Write the audit entry before the action is allowed through, never afterwards.',
      'Chain each entry to the one before it, so a removed entry shows as a break.',
      'Keep the entry readable without the message text: gate, decision, time, fingerprint.'
    ]
  },
  input_filter: {
    level: 'HIGH',
    threat:
      "attacks hidden in pasted text, web pages, emails and files can instruct an agent using the victim's own access.",
    mitigation: [
      'Hold any instruction that changes something when it came from a page, a document, an email or another agent.',
      'Treat fetched text as data: it can never carry an authorisation of its own.',
      'Send the first one to a person rather than refusing it silently.'
    ]
  },
  tool_gate: {
    level: 'HIGH',
    threat: 'the action itself is real: code, email, money or a system change.',
    mitigation: [
      'Keep an allow list of tools, and hold anything that is not on it.',
      'Set a spend cap and stop over it rather than asking again.',
      'Seal each request, so a change between the check and the call is caught.'
    ]
  },
  citation: {
    level: 'MEDIUM',
    threat: 'made-up answers look sourced, and an action resting on a document cannot be checked without the part it used.',
    mitigation: [
      'Require the part of the document the action rests on.',
      'Hold a document-based action that names no part of it.',
      'Keep the citation with the audit entry, so the decision can be read back.'
    ]
  },
  loop_gate: {
    level: 'MEDIUM',
    threat: 'loops can spam real people and burn real money while nobody is watching.',
    mitigation: [
      'Hold the same tool and target after three runs inside the window.',
      'Require a person to clear a loop, never a retry.',
      'Count the runs on the server, so a restarted agent cannot reset the count.'
    ]
  }
};