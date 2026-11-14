# Paradox Lab

The Paradox Lab is a user-controlled workspace for recording a theological paradox and exploring any numeric relationships the user chooses to express.

## User-authored interpretation

- The user submits the paradox in their own words. The exact submitted wording is displayed separately and remains unchanged if the draft is later edited.
- The app asks the user to clarify ambiguous terms and provides fields for user-identified assumptions, propositions, claim type, and an optional reformulation.
- These fields are notes from the user; the application does not infer propositions, rewrite beliefs, or present theological statements as facts.
- Paradox text and notes remain in browser memory. They are not sent to an API or saved between page reloads.

## Exact mathematical exploration

Users may write a mathematical hypothesis and compare two operands using exact equality, less-than, or greater-than. Both operands use the selected base and the math engine's integer, finite-radix, or exact-fraction syntax. The result displays the values in bases 2, 10, 12, and 60.

The comparison uses exact rational arithmetic; it does not use floating-point approximation. A successful comparison means only that the entered numeric relationship holds for those operands. It does not show that a mathematical model accurately represents a philosophical or theological claim.

A successful QRNG sample can be copied into the first operand as a base-2 value. Using a sample is an explicit action; generating a QRNG sample is not necessary to use the Lab.

## Privacy and limitations

This is not an AI interpreter, proof assistant, or theology engine. It does not resolve ambiguity automatically or determine which parts of a paradox are mathematical. The original text and notes are held in browser component state and are lost when the page is reloaded or closed.
