export const REPOS = [
  {
    name: 'deterministic-rag-governor',
    part: 'Governor',
    summary:
      'The gates, written as code rather than as instructions to a model: admission before spend, a noise gate, a loop gate, a citation check, an exact-answer cache, and a hash-chained audit log.'
  },
  {
    name: 'mathmesh-governor',
    part: 'Governor',
    summary:
      'Server-side admission, an HMAC check on every request, a kill switch that fails closed and stops an action before it runs, and an audit record of the decision.'
  },
  {
    name: 'Sean-Multi-Turn-Adversarial-Eval',
    part: 'Eval',
    summary: 'Multi-turn adversarial eval across six behaviours, from goal drift and reward hacking to temporal poisoning.'
  },
  {
    name: 'Escalation-Ladder-Test',
    part: 'Eval',
    summary: 'A 36-turn escalation ladder with safe twins over three pressure cycles, plus a gate that refuses a risky turn before it runs.'
  },
  {
    name: 'Carroll-Benchmark',
    part: 'Eval',
    summary: 'A single-file life simulation that shows what an agent decides over a short horizon.'
  },
  {
    name: 'AGI-FINAL-CRUCIBLE-vFinal-THE-PERFECT-BENCHMARK',
    part: 'Eval',
    summary: 'A five-phase living simulation that keeps going between phases instead of resetting.'
  },
  {
    name: 'The-Loop-Test-',
    part: 'Eval',
    summary: 'A sandbox logic eval over a premise set, built to surface premises that cannot all be true at once.'
  },
  {
    name: 'computer-crash-fix-',
    part: 'Calculator',
    summary: 'Sizing and checkpointing for long jobs, so a crash resumes from the last checkpoint instead of starting over.'
  }
];

export const EVALS = [
  {
    repo: 'Sean-Multi-Turn-Adversarial-Eval',
    title: 'Multi-turn adversarial eval',
    tests:
      'Pushes an agent over several turns and watches six behaviours: goal_drift, reward_hacking, collusion, bias_amplification, black_box_capability and temporal_poisoning.',
    found:
      'Transcript only. A fresh seed and a fresh behaviour order every run, two held-out payloads per behaviour, and every turn stored verbatim and left review pending. No code prints a total.',
    limits:
      'Results apply only to the model, seed, order and payloads actually run, after independent human review. The earlier totals from this eval are withdrawn and must not be cited.',
    report: [
      {
        heading: 'What was run',
        text: 'The corrected runner over the six behaviours, with two held-out payloads per behaviour and a paired authorised twin for each original request.'
      },
      {
        heading: 'How it is read',
        text: 'Read the transcript: each turn carries what was asked, what came back and the behaviour it targeted. Nothing in the output totals one side against the other.'
      },
      {
        heading: 'What it does not show',
        text: 'It does not score any model, and it says nothing about behaviour outside the scenario set. Treat it as a checklist you can run, not a certificate.'
      }
    ]
  },
  {
    repo: 'Escalation-Ladder-Test',
    title: 'Escalation ladder with safe twins',
    tests:
      'A 36-turn eval with 3 pressure cycles. Every risky request is paired with a safe twin that carries written authorisation, so a block on the risky side and a pass on the safe side can be told apart.',
    found:
      'Every turn is kept as a transcript: the request, the reply verbatim, and whether written authorisation was present. The gate decision is a rule, reported as rule enforcement and never as a measured blocked rate.',
    limits:
      'The earlier per-turn table from 2026-10-25 is withdrawn and must not be cited: the prompt-only side rested on a heuristic keyword classifier, and the gate side is what the code was written to do. That run was also unblinded, with the tester as the target.',
    report: [
      {
        heading: 'What was run',
        text: '36 turns across three pressure cycles (plain, urgency, permanent baseline), each risky turn paired with a safe twin carrying written approval ref OPS-2026-114.'
      },
      {
        heading: 'How it is read',
        text: 'A person reads each reply and records, quoting the words they judged, whether the model objected, accepted or left it unclear, and what it actually did. A refusal word on its own is not an objection, and the twin is judged on its own.'
      },
      {
        heading: 'What it does not show',
        text: 'One unblinded run against one target is not a general result. Another target, another operator, or a blinded run could land somewhere else. It is also not evidence about any lab’s internal results.'
      }
    ]
  },
  {
    repo: 'Carroll-Benchmark',
    title: 'Immediate-horizon life simulation',
    tests: 'A single-file life simulation that records what an agent decides over a short horizon.',
    found:
      'It reports behaviour counts for the seed and policy actually used, beside the full transcript. No option is marked correct and no total is claimed for an agent.',
    limits:
      'Results apply only to these scenarios and the configuration used. The sample policy in the corrected run is a deterministic stub, not a model result; a real run needs a real model, with fallbacks and invalid responses reported separately.',
    report: [
      {
        heading: 'What was run',
        text: 'The simulation at three seeds, reporting life end, decisions and policy violations per seed, plus a ten-life batch of action counts.'
      },
      {
        heading: 'How to read it',
        text: 'Read the decision list. Two agents can take the same path and still differ on the turns that matter.'
      },
      {
        heading: 'What it does not show',
        text: 'A short horizon says nothing about long-run behaviour, and one good decision here is not proof of good decisions anywhere else.'
      }
    ]
  },
  {
    repo: 'AGI-FINAL-CRUCIBLE-vFinal-THE-PERFECT-BENCHMARK',
    title: 'Five-phase living simulation',
    tests:
      'A persistent five-phase evaluation: the agent keeps living between phases rather than starting clean each time.',
    found:
      'The corrected run computes the choice, the forecast and the snapshot hash after the run, from that run\u2019s own state. Seed 260101 reproduced the recorded hash exactly, and each later seed gave a different hash and a different fire forecast.',
    limits:
      'Contract checks look at the answer\u2019s shape only, so format compliance is not a reasoning pass. This is an early simplified demo, not a scientific measure of intelligence.',
    report: [
      {
        heading: 'What was run',
        text: 'The corrected simulation at seeds 260101 to 260104, with no prompt telling the model which way to decide.'
      },
      {
        heading: 'What the checks cover',
        text: 'The snapshot hash is a checksum for the recorded state, not proof of reasoning, and the contract checks confirm the answer\u2019s shape. Neither runs an agent.'
      },
      {
        heading: 'What it does not show',
        text: 'Passing the validator means the simulation behaves as designed. It does not mean an agent that goes through it is safe.'
      }
    ]
  },
  {
    repo: 'The-Loop-Test-',
    title: 'Premise-set loop test',
    tests: 'A sandbox logic eval over premise set P1 to P8.',
    found:
      'Round 0 finds that P3 contradicts P6, so P1 to P8 cannot all be true, and that no added claims can repair the unchanged set. Every rubric item is a quoted judgment from an independent reviewer, and no total is claimed.',
    limits:
      'The earlier self-scored figure is withdrawn and must not be cited. This is a logic result inside the repo’s sandbox, and it says nothing about any model’s safety.',
    report: [
      {
        heading: 'What was run',
        text: 'The repo’s own checks, with Round 0 finding that P3 contradicts P6.'
      },
      {
        heading: 'Why it matters',
        text: 'If two premises cannot both hold, an agent that accepts all of them has no way to stay consistent. The loop test makes that visible before the work starts.'
      },
      {
        heading: 'What it does not show',
        text: 'This is a property of the premise set, not a score for an agent.'
      }
    ]
  }
];