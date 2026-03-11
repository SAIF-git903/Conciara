# Pricing & API Keys – What You Need To Do

This doc lists what **you** need to do on your side after the implementation: run migrations, seed plans, configure Paddle, and optionally wire Checkout.

---

## 1. Run migration and seed plans

```bash
cd backend
npm run migrate
npm run seed-plans
```

- **Migrations** create: `plans`, `workspace_subscriptions`, `workspace_credits`, `workspace_api_keys`, and add `credits_used` to `agent_chat_messages`. Migration **0024** switches plan/subscription fields from Stripe to Paddle.
- **seed-plans** inserts the four plans (Free, Hobby, Standard, Pro). Until this is run, any call that needs the Free plan (e.g. first chat or usage page) will throw.

---

## 2. Paddle configuration

- **Env vars (required for plan upgrades and billing history)**
  - **Backend** (in `.env`):
    - `PADDLE_WEBHOOK_SECRET` – **Required.** Secret key from Paddle: Developer Tools → Notifications → your destination URL → Secret key. Without this, webhooks return 503 and no subscription or billing data is saved.
    - `PADDLE_API_KEY` – **Recommended.** Paddle API key (sandbox: `sdbx_...`). Used to link subscriptions by customer email when `custom_data.workspace_id` is missing (e.g. Hosted Checkout), to sync subscription from `transaction.completed` if `subscription.created` was missed, and for billing. Get it from Paddle Dashboard → Developer Tools → Authentication.
  - **Default payment link (required for all checkouts)**  
  Paddle will return `transaction_default_checkout_url_not_set` until you set this. In the Paddle dashboard:
  - **Sandbox**: open [Checkout settings](https://sandbox-vendors.paddle.com/checkout-settings). Under **Default payment link**, enter a URL (e.g. your app’s pricing page, or `http://localhost:3002/pricing` for local dev). Save.
  - **Live**: open [Checkout settings](https://vendors.paddle.com/checkout-settings) and set the default payment link to a page on an **approved** domain.
  See [Set your default payment link](https://developer.paddle.com/build/transactions/default-payment-link).

- **Frontend** (choose one):
  - **Hosted Checkout**: `NEXT_PUBLIC_PADDLE_HOSTED_CHECKOUT_URL` – Your Paddle hosted checkout URL (e.g. `https://sandbox-pay.paddle.io/hsc_xxx` or live `https://pay.paddle.io/hsc_xxx`). Clicking Upgrade redirects to this URL with `?price_id=<selected price>`. No `custom_data` is sent, so the webhook won’t receive `workspace_id`; you may need to link subscriptions by customer email or in your app.
  - **Overlay (Paddle.js)**: `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` – Client-side token for Paddle.js. Optional: `NEXT_PUBLIC_PADDLE_ENVIRONMENT=production` for production.

- **Webhook endpoint**: `POST https://<your-backend>/api/integrations/paddle/webhook`
  - The URL **must be publicly reachable**. If your backend runs on localhost, Paddle cannot send events to it — use a tunnel (e.g. [ngrok](https://ngrok.com)) or deploy the backend so the webhook URL is reachable from the internet. **If Paddle cannot reach this URL, no subscription or billing data is written to your DB**, so plan upgrades and billing history will not appear.
  - In Paddle: Developer Tools → Notifications → create or edit a destination (URL type). Set the destination URL to your **public** webhook URL (e.g. `https://your-ngrok-subdomain.ngrok-free.app/api/integrations/paddle/webhook` for local testing, or `https://your-api.example.com/api/integrations/paddle/webhook` in production).
  - Subscribe to: `subscription.created`, `subscription.updated`, `subscription.activated`, `subscription.resumed`, `subscription.canceled`, `subscription.past_due`, `transaction.completed`.
  - **Local testing (ngrok)**: If you get "Webhook signature verification failed", either fix the secret (copy the **Secret key** for this notification destination from Paddle; no extra spaces) or, for local use only, set `PADDLE_WEBHOOK_SKIP_VERIFY=1` in the backend `.env`. With skip-verify, webhooks are accepted without checking the signature so you can see the full flow; do **not** use this in production.

- **Behavior**:
  - `subscription.created`: creates or updates `WorkspaceSubscription` and sets `workspace.plan` when `custom_data.workspace_id` (or `workspaceId`) is present; maps Paddle price ID to plan via `plans.paddle_price_id_monthly` / `paddle_price_id_yearly`.
  - `subscription.updated` / `activated` / `resumed`: updates status, current period, and `cancel_at_period_end`; keeps or resets `workspace.plan`.
  - `subscription.canceled`: sets subscription status to `canceled` and `workspace.plan` to `free`.
  - `subscription.past_due`: sets subscription status to `past_due`.
  - `transaction.completed`: if the transaction has a `subscription_id`, finds or creates the workspace subscription (by fetching the subscription from Paddle if needed), records the transaction in billing history, and calls `resetPeriod(workspaceId)` for that workspace (resets monthly credits).

- **Creating subscriptions**: The app does **not** create Paddle Checkout sessions. When a user upgrades:
  - Create a Paddle Checkout (or use Paddle.js) with the chosen price and **custom_data** including `workspace_id` (or `workspaceId`) so the webhook can link the subscription to the workspace.
  - On `subscription.created`, the webhook creates/updates `WorkspaceSubscription` and updates `workspace.plan`. Ensure your plans in the DB have `paddle_price_id_monthly` and/or `paddle_price_id_yearly` set to the Paddle price IDs you use in Checkout.

---

## 3. Plan limits (enforced in code)

- **Agents**: `createAgent` checks `checkAgentLimit(workspaceId)`. If at limit, it throws; frontend should show the error.
- **Members**: `inviteWorkspaceMember` checks `checkMemberLimit(workspaceId)`. If at limit, it throws.
- **Training bytes**: `checkTrainingBytesLimit(workspaceId, agentId, additionalBytes)` exists in `plan.service.ts`; you still need to call it in the **document upload** path and block upload when over limit.
- **API keys**: Create is blocked with 403 when the workspace plan does not include `apiAccess` (Standard and above).

---

## 4. Workspace credits and first use

- Credits are created on first use: when `getRemainingCredits(workspaceId)` (or the first chat) runs, `getOrCreateCreditsRow` creates a `WorkspaceCredits` row using the **current plan** (from `WorkspaceSubscription` or default Free).
- Existing workspaces have no subscription row; they resolve to the **Free** plan and get 50 credits/month once the first chat or usage request runs.

---

## 5. Pricing page (frontend)

- The **tiers and copy** on `/pricing` (e.g. Free, Hobby, Standard, Pro; message limits; API access) should be updated to match the new plans if you changed them.
- “Change plan” on the Billing page links to `/pricing`; you can later point upgrade buttons to a Paddle Checkout flow that includes `workspace_id` in custom_data.

---

## 6. Optional: Authenticate with workspace API key

- To allow **programmatic** access to workspace-scoped routes with an API key instead of JWT:
  - Use header: `Authorization: Bearer <ck_live_...>` (the raw workspace API key).
  - Add middleware that runs **before** `requireAuth` on selected routes: if `Authorization: Bearer` is present and the value looks like `ck_live_*`, validate it with `validateWorkspaceApiKey`, attach `workspaceId` to the request, and skip JWT. Otherwise call `requireAuth`.
  - The current workspace routes do **not** use this yet; they all use JWT only.

---

## 7. Summary checklist

- [ ] Run `npm run migrate` and `npm run seed-plans` in the backend.
- [ ] **Set default payment link** in Paddle: [Sandbox](https://sandbox-vendors.paddle.com/checkout-settings) or [Live](https://vendors.paddle.com/checkout-settings) (required for all checkouts).
- [ ] Set `PADDLE_WEBHOOK_SECRET` and configure the webhook URL in Paddle (Developer Tools → Notifications).
- [ ] Implement “upgrade” flow (Paddle Checkout) with `custom_data.workspace_id` and create products/prices in Paddle; set `paddle_price_id_monthly` / `paddle_price_id_yearly` on plans to match.
- [ ] Optionally call `checkTrainingBytesLimit` in the document upload route and return 403 when over limit.
- [ ] Update `/pricing` content to match your plans.
