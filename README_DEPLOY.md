AEGIS — Deploy & Test Guide
===========================

This guide covers two paths:
- Production deploy (GitHub Pages + Base44 functions)
- Local testing without Base44 credits (mock + ngrok)

1) GitHub Pages (frontend) + Base44 (functions)
- Ensure you have Base44 credits and the Base44 project configured.
- Set these repository secrets in GitHub: `VITE_BASE44_APP_ID`, `VIRUSTOTAL_API_KEY`, `AUTH_CHALLENGE`, `AUTH_CHALLENGE_ANSWER`, other secrets (GMAIL_CLIENT_ID/SECRET).
- The workflow `.github/workflows/deploy-gh-pages.yml` builds and publishes `dist/` to GitHub Pages on push to `main`.
- Deploy Base44 functions: follow Base44's CLI / console to upload `base44/functions/*` (not automated here). Set function env vars in the Base44 console.

2) Local testing without Base44 credits (mocked backend)
- We included a lightweight in-memory mock of the Base44 client at `src/api/base44Mock.js`.
- Enable mock by setting `VITE_BASE44_MOCK=true`.
- If you are out of Base44 credits, use the mock path until tokens are available again. This gives you the full UI and threat workflow experience without live Base44 execution.
- Start dev server bound to all interfaces (for tunneling):
```bash
npm install
VITE_BASE44_MOCK=true npm run start:public
```
- Use ngrok to expose your local server (`ngrok` must be installed):
```bash
npm run tunnel
# or
ngrok http 5173 --host-header=localhost:5173
```
- The mock will auto-advance threats through QRNG cycles and create sample events/zero-day anomalies.

3) Switching to real Base44
- Set `VITE_BASE44_MOCK=false` and set `VITE_BASE44_APP_ID` in env or GitHub secrets.
- Set `VITE_BASE44_APP_BASE_URL=https://sift-ai.net` to point the frontend at your live Sift AI deployment.
- Optionally set `VITE_BASE44_ACCESS_TOKEN` if you want to pre-authenticate with an existing Base44 token or integration token.
- Set `AUTH_CHALLENGE=Do you accept?` and `AUTH_CHALLENGE_ANSWER=Yes` in the Base44 function runtime env.
- Deploy Base44 functions and ensure runtime env vars are set in Base44.

Notes & Limitations
- The mock is for UI and flow testing only — it does not perform VirusTotal or Gmail OAuth calls.
- For real VirusTotal/Gmail features, deploy backend functions to Base44 and provide API keys and OAuth credentials.
