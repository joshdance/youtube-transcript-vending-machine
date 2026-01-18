# Stripe Setup Guide

This guide covers everything you need to configure Stripe for the credits
checkout flow and webhooks used by the app.

## 1) Stripe account and mode

1. Create or sign in to your Stripe account.
2. Use **Test mode** first; switch to **Live mode** when ready.

The app uses Checkout + webhooks, so you must configure products, prices,
and webhook endpoints.

## 2) Create the Credits product and prices

Create a single product named "Credits" (or similar), then add three one-time
prices under it:

- 10 credits
- 25 credits
- 50 credits

Notes:
- Use **one-time** pricing (not recurring).
- Use the same currency for all three prices.
- Promotions/coupons are supported and **do not change credits granted**.
  Credits are granted based on the price ID mapping, not the amount paid.

Copy the price IDs (each starts with `price_...`) for the three tiers.

## 3) Configure Stripe environment variables

Set the following environment variables for your app:

```env
# Stripe API keys
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe price IDs (mapped to credit amounts)
STRIPE_PRICE_ID_10=price_...
STRIPE_PRICE_ID_25=price_...
STRIPE_PRICE_ID_50=price_...

# Optional: override redirect URLs (defaults to origin)
STRIPE_SUCCESS_URL=https://yourdomain.com/?payment=success
STRIPE_CANCEL_URL=https://yourdomain.com/?payment=cancel

# Optional: bypass Stripe payments (dev only)
STRIPE_BYPASS_PAYMENTS=false
```

Switch to live keys in production (`sk_live_...`).

## 4) Create the webhook endpoint in Stripe

Create a webhook endpoint in the Stripe Dashboard:

1. Go to **Developers** -> **Webhooks**.
2. Click **Add endpoint**.
3. Endpoint URL:
   - Local dev: use Stripe CLI (see below)
   - Production: `https://yourdomain.com/api/stripe/webhook`
4. Select events:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `charge.refunded`
   - `charge.dispute.created`
   - `charge.dispute.funds_withdrawn`
5. Save, then copy the signing secret (`whsec_...`) into
   `STRIPE_WEBHOOK_SECRET`.

## 5) Configure promotions (optional)

Promo codes are allowed and **do not change credit amounts**.
If you want to enable promotions:

1. Go to **Products** -> **Coupons** (or **Promotion codes**).
2. Create a coupon and then a promotion code.
3. The app already enables `allow_promotion_codes` in Checkout.

## 6) Local webhook testing (Stripe CLI)

Install the Stripe CLI:
https://stripe.com/docs/stripe-cli

Then run:

```bash
stripe login
stripe listen --forward-to http://localhost:3000/api/stripe/webhook
```

Copy the displayed `whsec_...` into `STRIPE_WEBHOOK_SECRET` in `.env.local`.

To simulate payments:

```bash
stripe trigger checkout.session.completed
stripe trigger charge.refunded
stripe trigger charge.dispute.created
```

## 7) Production checklist

- Use **live** Stripe keys and webhook secret.
- Confirm the production webhook URL is correct.
- Verify price IDs in production are the **live** price IDs.
- Deploy with `STRIPE_BYPASS_PAYMENTS=false`.

## 8) How credits are granted

Credits are granted when Stripe sends a successful checkout event. The webhook
fetches Checkout line items and maps the **price ID** to a credit amount.
This ensures:
- Credits match the configured price IDs.
- Promo codes do not change credit amounts.
- Credits can be revoked on refunds or chargebacks.

If you add new credit tiers, update the app to include new `STRIPE_PRICE_ID_*`
variables and the corresponding mapping in the code.
