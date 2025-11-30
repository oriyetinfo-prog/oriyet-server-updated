Payment integration deployment notes

- Ensure environment variables in `.env` are set from `.env.example`.
  - `UDDOKTA_API_KEY` must be the production key when deploying live.
  - `UDDOKTA_WEBHOOK_SECRET` must be set in production. The webhook handler will reject unsigned requests.
  - `SERVER_BASE_URL` must be the public URL reachable by the payment provider (https) for webhook delivery.
  - `CLIENT_BASE_URL` is used for redirecting users after payment.

- Webhook setup
  - Register the webhook URL in your payment provider dashboard: `${SERVER_BASE_URL}/api/payments/webhook`.
  - Use the `UDDOKTA_WEBHOOK_SECRET` value to validate incoming webhooks. Keep it secret.

- Local testing
  - Run the server with `npm run dev` (or `node index.js`) after installing dependencies.
  - Use `ngrok` to expose your local server: `ngrok http 3000` and set `SERVER_BASE_URL` to the `https` ngrok URL.

- Prisma / DB
  - Ensure `DATABASE_URL` is set and Prisma migrations are applied.
  - Registration model currently stores `amount` as an integer (whole units). If you want to store cents or fractional amounts, update Prisma schema and migrate.

- Monitoring and retries
  - Webhook handlers are idempotent on `registrationId` + `transactionId`.
  - Keep logs and monitoring in place to detect failed webhook deliveries and retry if needed.

- Security
  - Do not log secrets or full provider responses in production. The controller limits sensitive output.

If you want, I can:
- Add an automated health-check endpoint for payments.
- Add server-side tests for webhook parsing and idempotency.
- Add a migration to switch `Registration.amount` to `Decimal` or store cents.

Deployment Checklist
--------------------

- [ ] Set production environment variables from `.env.example` and keep `.env` out of source control.
- [ ] Register webhook URL in payment provider and set `UDDOKTA_WEBHOOK_SECRET`.
- [ ] Configure `SERVER_BASE_URL` to a public HTTPS URL and update provider webhook settings.
- [ ] Run Prisma migrations: `npx prisma migrate deploy` (or `migrate dev` for local testing).
- [ ] Verify email sending credentials and test confirmation emails (check `EMAIL_USER` / `EMAIL_PASS`).
- [ ] Ensure HTTPS and firewall rules allow provider webhooks to reach `/api/payments/webhook`.
- [ ] Monitor logs and set up alerting for failed webhook deliveries and email failures.
- [ ] (Optional) Migrate `Registration.amount` to `Decimal` if fractional currency handling is required.

Local Testing Tips
------------------

- Use `ngrok` to expose your local server for webhook testing: `ngrok http 3000`.
- Set `SERVER_BASE_URL` to the `https://...` ngrok URL before creating test checkouts in the provider sandbox.
- After a successful payment, verify that `registration.paymentStatus` becomes `paid`, `registration.transactionId` is set, and `session.seats` decremented by 1.

Want me to run through an end-to-end local test (ngrok + sandbox checkout + webhook)? I can provide exact test payloads and commands.
