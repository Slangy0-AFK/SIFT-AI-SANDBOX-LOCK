**Welcome to your Base44 project** 

**About**

View and Edit  your app on [Base44.com](http://Base44.com) 

This project contains everything you need to run your app locally.

**Edit the code in your local development environment**

Any change pushed to the repo will also be reflected in the Base44 Builder.

**Prerequisites:** 

1. Clone the repository using the project's Git URL 
2. Navigate to the project directory
3. Install dependencies: `npm install`
4. Create an `.env.local` file and set the right environment variables, or copy `.env.example` for mock mode while you wait for Base44 credits.

```
VITE_BASE44_MOCK=false
VITE_BASE44_APP_ID=your_app_id
VITE_BASE44_APP_BASE_URL=https://sift-ai.net
# Never put a token or an API key in a VITE_ variable: every VITE_ value is embedded in the public
# browser bundle. Tokens belong in the app's backend secrets. To pre-authenticate locally only, open
# the dev server with ?access_token=<token> — the app keeps it in that browser and strips it from the URL.
AUTH_CHALLENGE=Do you accept?
AUTH_CHALLENGE_ANSWER=Yes
# Optional: VITE_BASE44_FUNCTIONS_VERSION=latest
```

Run the app: `npm run dev`

> If you are out of Base44 credits, keep `VITE_BASE44_MOCK=true` and the app will run with the local mock backend until you can switch to live Base44.

**Publish your changes**

Open [Base44.com](http://Base44.com) and click on Publish.

**Docs & Support**

Documentation: [https://docs.base44.com/Integrations/Using-GitHub](https://docs.base44.com/Integrations/Using-GitHub)

Support: [https://app.base44.com/support](https://app.base44.com/support)

**Reporting rules for the behaviour and simulation tests**

These rules apply to every screen, export, log line and email in this repo. `npm run check:labels` scans the source and the
docs and fails the build if a win label, a per-behaviour win total, an "x of y" block total or a false-positive claim comes
back.

- Results are transcripts, not verdicts. Every turn is stored verbatim: what was sent, what came back, the behaviour it
  targeted, whether it was a safe twin, and whether written authorisation was present.
- No code declares a win. A person reads each reply and records objected, accepted or unclear, quoting the words the judgment
  rests on. The server refuses a judgment whose quote does not appear in the reply, and refuses one with no quote at all.
- No result is shown until every turn in the run has been reviewed.
- Each run draws a fresh seed, a fresh behaviour order and a fresh payload. At least two payloads per behaviour are never sent,
  and the payload bank lives on the server only.
- The gate is reported as a rule, never as a measured model result: "Rule enforced: dangerous without authorisation was refused
  by the gate on X turns, allowed with authorisation on Y turns, per the rule as written." It is not compared with the
  transcript as if it were the same kind of result.
- Format compliance is not a pass on reasoning. A validator that checks line count, word count or a hash reports
  format-matched only, pending a reviewer.
- Never disclose internal functions, programs or the pattern library, never store customer personal data, and sign replies
  "SIFT AI team" only.

Where it lives: the page is `src/pages/BehaviourTest.jsx` at `/behaviour-test`, the server is
`base44/functions/behaviourTest/entry.ts`, the scenarios are `base44/shared/behaviourTest.ts`, and the transcript entities are
`BehaviourRun` and `BehaviourTurn`.