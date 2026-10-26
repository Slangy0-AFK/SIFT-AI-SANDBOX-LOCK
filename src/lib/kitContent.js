export const GRAY_SWAN_PROFILE = 'https://app.grayswan.ai/arena/user/6a15c8ba7b1ae32bf238bc32';
export const OWNER_SITE = 'https://sift-ai.net';

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
    summary: 'A 20-turn escalation ladder with safe twins, comparing prompt-only guardrails against a governor.'
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
    found: 'Repo selftest: 15 passed, 0 failed.',
    limits:
      'The scenarios are authored inside the repo. Passing the selftest means the checks behave as written, not that an agent is safe in general.',
    report: [
      {
        heading: 'What was run',
        text: 'The repo selftest, in our lab, over the scenario set that ships with the repo: 15 checks spanning the six behaviours.'
      },
      {
        heading: 'Where the numbers come from',
        text: 'The per-behaviour output of that selftest, from the run in our lab.'
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
      'A 20-turn eval with 3 pressure cycles. Every risky request is paired with a safe twin that carries written authorisation, so a block on the risky side and a pass on the safe side can be told apart.',
    found:
      'In our lab run, prompt-only guardrails and the scaler governor each blocked 18 of 18 dangerous cases, with 0 false positives on the safe twins.',
    limits:
      'This run did NOT reproduce a lab failure, so read it as a check, not as a claim of beating the labs. It was unblinded, it used a single target (Muse), and the scenarios are authored.',
    report: [
      {
        heading: 'What was run',
        text: '20 turns and 3 pressure cycles with Muse as the target, comparing prompt-only guardrails against the scaler governor.'
      },
      {
        heading: 'How it was counted',
        text: 'Dangerous cases blocked over dangerous cases tried (18 of 18), and safe twins passed over safe twins tried (0 false positives).'
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
    found: 'It prints the decisions themselves, so you read the choices instead of one number.',
    limits:
      'The output is a record of decisions inside a short simulated life. It is not a score for intelligence and it is not a safety result.',
    report: [
      {
        heading: 'What was run',
        text: 'The simulation as it ships, stepping an agent through a short life in a single file.'
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
    found: 'Repo validator: 20 passed.',
    limits: 'The validator checks that the simulation ran the way its author designed it. It is not an outside audit.',
    report: [
      {
        heading: 'What was run',
        text: 'The repo validator across the five phases: 20 checks passed.'
      },
      {
        heading: 'Where the numbers come from',
        text: 'The validator’s own 20 checks, run across the five phases in our lab.'
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
    found: 'Round 0: P3 contradicts P6, so P1 to P8 cannot all be true. Repo tests: 10 passed.',
    limits: 'This is a logic result inside the repo’s sandbox. It says nothing about any model’s safety.',
    report: [
      {
        heading: 'What was run',
        text: 'The repo’s own tests: 10 passed, with Round 0 finding that P3 contradicts P6.'
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