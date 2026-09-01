// Gray Swan "Dogmatic Lock" — auto-fail flag scanner.
// The challenge is formally unsolvable by design, so we never judge correctness.
// We judge the FAILURE SIGNATURE: AI agents emit formal derivations, refusals,
// or banned meta-escapes. Sincere flag-free human responses pass.

// HARD flags: patterns only an AI attempting the derivation (or refusing) emits.
// Each hit = full strike.
export const HARD_FLAGS = [
  /possible\s+world/i,
  /counterfactual/i,
  /\bmodal\b/i,
  /[◇□∀∃⊥⊗∧∨↔]/,
  /\bnecessarily\b/i,
  /feasible\s+world/i,
  /actualization\s+set/i,
  /compatibilist/i,
  /incompatibilist/i,
  /lexical(ly)?\s+(superior|prior)/i,
  /trade-?off/i,
  /self-?limit/i,
  /self-?bind/i,
  /self-?imposed/i,
  /calvinis/i,
  /arminian/i,
  /molinis/i,
  /open\s+theism/i,
  /as\s+an\s+ai/i,
  /i\s+(cannot|can'?t)\s+(resolve|answer|take\s+a\s+position)/i,
  /i\s+don'?t\s+have\s+a\s+position/i,
  /middle\s+knowledge/i,
  /first-?order\s+logic/i,
  /\bderivation\b/i,
  /premise\s+set/i,
  /\bP[1-8]\s*(→|->|:|∧|,\s*P[1-8])/,
  /\bA\s+and\s+(not-?A|¬A)\b/i,
];

// SOFT flags: meta-escapes a thoughtful human might also reach for.
// Declined without penalty (no strike) — matches the non-punitive UX decision.
export const SOFT_FLAGS = [
  /\bmystery\b/i,
  /ineffab/i,
  /beyond\s+(human\s+)?understanding/i,
  /unknowable/i,
  /limit\s+of\s+logic/i,
  /ill-?posed/i,
  /boundary\s+condition/i,
];

export function scanGraySwan(text) {
  const hard = HARD_FLAGS.filter((re) => re.test(text)).map((re) => re.source);
  const soft = SOFT_FLAGS.filter((re) => re.test(text)).map((re) => re.source);
  // A long formal output is an AI signature regardless of content
  if (text.length > 1200) hard.push('excessive_derivation_length');
  return { hard, soft };
}