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