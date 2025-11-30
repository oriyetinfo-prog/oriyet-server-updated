# End-to-end Local Test (ngrok + simulated provider)

This guide walks through running an end-to-end local test for the payment flow. It simulates the provider webhook locally (useful for development). For real sandbox provider flow, use the provider sandbox and ngrok.

Prerequisites
- Node.js installed
- `npm install` run in `server/` directory
- Local server running: `npm run dev` (or `node index.js`)
- (Optional) `ngrok` for exposing local server to provider sandbox

Steps

1. Start server

```powershell
cd 'F:\web projects\paid projects\youth employment\server'
npm install
npm run dev
```

2. (Optional) Expose with ngrok (for real provider sandbox)

```powershell
ngrok http 3000
# copy the https ngrok URL and set SERVER_BASE_URL to it in your .env
```

3. Configure environment variables (for the test script)
- Create a `.env` or export variables in shell:
  - `API_BASE` (default `http://localhost:3000`)
  - `TEST_SESSION_ID` (an existing session id in DB)
  - `TEST_USER_EMAIL` (an existing user email or new one)
  - `UDDOKTA_API_KEY` (optional — header used by webhook validator)

4. Run E2E test script (this will call create-checkout then POST a simulated webhook)

```powershell
# from server folder
node scripts/e2e_test.js
```

Notes
- The test script simulates the provider webhook payload and sends `rt-uddoktapay-api-key` header if `UDDOKTA_API_KEY` is set.
- For a real sandbox flow, after creating checkout you should complete payment in provider sandbox and provider will call your webhook (use ngrok to expose).
- Verify DB state and `isEmailSent` flag to confirm email sent (email sending must be configured).

If you want, I can run this test here (if you provide temporary sandbox API key and allow me to run ngrok), or I can walk you through running it on your machine.
