// A guard so a future run cannot print the labels this app removed.
//
// The banned shapes are: a win label, a per-behaviour win total, an "x of y
// blocked" total, a block rate, and a false-positive claim. If any of them comes
// back into the app's source, this exits non-zero and the build fails.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const BANNED = [
  { pattern: /defense[_\s-]?win/i, label: 'a win label on one arm' },
  { pattern: /sean[_\s-]?win/i, label: 'a personal win label' },
  { pattern: /\b6\s*\/\s*6\b/, label: 'a 6-of-6 total' },
  { pattern: /\b18\s*\/\s*18\b/, label: 'an 18-of-18 total' },
  { pattern: /\b20\s*\/\s*20\b/, label: 'a 20-of-20 total' },
  { pattern: /100%\s*blocked/i, label: 'a block-rate claim' },
  { pattern: /\b0\s+false\s+positives\b/i, label: 'a zero false positives claim' }
];

const ROOTS = ['src', 'base44', 'public', 'scripts'];
const FILES = ['README.md', 'README_DEPLOY.md', 'COMPLIANCE_NOTES.md', 'APP_PLAN.md'];
const TEXT = /\.(js|jsx|ts|tsx|json|jsonc|md|html|py|mjs)$/;

function walk(dir, out) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (TEXT.test(path)) out.push(path);
  }
}

const targets = [];
for (const root of ROOTS) {
  try {
    if (statSync(root).isDirectory()) walk(root, targets);
  } catch {
    /* root not present */
  }
}
for (const file of FILES) {
  try {
    if (statSync(file).isFile()) targets.push(file);
  } catch {
    /* file not present */
  }
}

const hits = [];
for (const file of targets) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, index) => {
    for (const { pattern, label } of BANNED) {
      if (pattern.test(line)) hits.push(`${file}:${index + 1}  ${label}  →  ${line.trim().slice(0, 120)}`);
    }
  });
}

if (hits.length > 0) {
  console.error('Banned result labels found. These are removed from the app on purpose:\n');
  for (const hit of hits) console.error(`  ${hit}`);
  console.error(`\n${hits.length} hit(s). Rewrite the line as a transcript or a rule statement, never a win or block total.`);
  process.exit(1);
}

console.log(`No banned result labels in ${targets.length} files.`);