import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const PRICE_ID_TO_CREDITS = Object.entries({
  10: process.env.STRIPE_PRICE_ID_10,
  25: process.env.STRIPE_PRICE_ID_25,
  50: process.env.STRIPE_PRICE_ID_50,
}).reduce((acc, [credits, priceId]) => {
  if (priceId) {
    acc[priceId] = Number(credits);
  }
  return acc;
}, {});

function getSupabaseServerClient() {
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET;

  if (!supabaseUrl || !secretKey) return null;

  return createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function ensureUserRecordById(supabase, userId) {
  const { data: existing, error } = await supabase
    .from('users')
    .select('id, credits_balance, credits_added')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (existing) return existing;

  const { data: created, error: insertError } = await supabase
    .from('users')
    .insert([
      {
        id: userId,
        credits_balance: 0,
        credits_added: 0,
      },
    ])
    .select('id, credits_balance, credits_added')
    .single();

  if (insertError) {
    throw insertError;
  }

  return created;
}

async function applyCreditsDelta(supabase, userId, delta) {
  const { data, error } = await supabase.rpc('increment_user_credits', {
    p_user_id: userId,
    p_delta: delta,
  });

  if (error) {
    throw error;
  }

  const row = Array.isArray(data) ? data[0] : data;
  return {
    creditsBalance: row?.credits_balance ?? 0,
    creditsAdded: row?.credits_added ?? 0,
  };
}

async function grantCreditsByUserId(supabase, userId, creditsToAdd) {
  await ensureUserRecordById(supabase, userId);
  const updated = await applyCreditsDelta(supabase, userId, creditsToAdd);
  return {
    creditsAdded: creditsToAdd,
    creditsBalance: updated?.creditsBalance ?? 0,
  };
}

async function recordPurchase(supabase, purchase) {
  const { error } = await supabase.from('credit_purchases').insert([purchase]);

  if (!error) return { inserted: true };

  if (
    error.code === '23505' ||
    String(error.message || '').toLowerCase().includes('duplicate')
  ) {
    return { inserted: false, duplicate: true };
  }

  throw error;
}

function resolveCreditsFromLineItems(lineItems) {
  const unknownPriceIds = [];
  let totalCredits = 0;

  if (!lineItems?.data?.length) {
    return { totalCredits: 0, unknownPriceIds: ['missing-line-items'] };
  }

  for (const item of lineItems.data) {
    const priceId = item?.price?.id;
    const quantity = Number(item?.quantity ?? 1);
    const creditsForPrice = priceId ? PRICE_ID_TO_CREDITS[priceId] : null;

    if (!creditsForPrice) {
      unknownPriceIds.push(priceId || 'missing-price-id');
      continue;
    }

    totalCredits += creditsForPrice * (Number.isFinite(quantity) ? quantity : 1);
  }

  return { totalCredits, unknownPriceIds };
}

async function getLineItemsCredits(stripe, sessionId) {
  if (!Object.keys(PRICE_ID_TO_CREDITS).length) {
    console.warn('[Stripe webhook] Price mapping not configured');
    return { totalCredits: 0, unknownPriceIds: ['missing-price-mapping'] };
  }

  const lineItems = await stripe.checkout.sessions.listLineItems(sessionId, {
    limit: 100,
  });

  return resolveCreditsFromLineItems(lineItems);
}

async function getChargeIdForPaymentIntent(stripe, paymentIntentId) {
  if (!paymentIntentId) return null;

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
    expand: ['latest_charge'],
  });

  const latestCharge = paymentIntent?.latest_charge;
  if (typeof latestCharge === 'string') return latestCharge;
  return latestCharge?.id || null;
}

async function findPurchaseByPaymentIntent(supabase, paymentIntentId) {
  if (!paymentIntentId) return null;
  const { data, error } = await supabase
    .from('credit_purchases')
    .select('*')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}

async function findPurchaseByChargeId(supabase, chargeId) {
  if (!chargeId) return null;
  const { data, error } = await supabase
    .from('credit_purchases')
    .select('*')
    .eq('stripe_charge_id', chargeId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}

async function markPurchaseRevoked(supabase, purchaseId, fields) {
  const { data, error } = await supabase
    .from('credit_purchases')
    .update({
      revoked_at: new Date().toISOString(),
      ...fields,
    })
    .eq('id', purchaseId)
    .is('revoked_at', null)
    .select('id, user_id, credits')
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}

async function handleCheckoutSessionCompleted(session, stripe) {
  if (session.payment_status !== 'paid') return { handled: false };

  const userId =
    session.client_reference_id || session.metadata?.user_id || null;
  if (!userId) {
    console.warn('[Stripe webhook] Missing user_id metadata');
    return { handled: false };
  }

  const { totalCredits, unknownPriceIds } = await getLineItemsCredits(
    stripe,
    session.id
  );

  if (unknownPriceIds.length) {
    console.warn('[Stripe webhook] Unknown price IDs:', unknownPriceIds);
    return { handled: false };
  }

  if (!Number.isFinite(totalCredits) || totalCredits <= 0) {
    console.warn('[Stripe webhook] Unable to resolve credits from line items');
    return { handled: false };
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    throw new Error('Supabase server credentials not configured');
  }

  const paymentIntentId = session.payment_intent || null;
  const chargeId = await getChargeIdForPaymentIntent(stripe, paymentIntentId);

  const purchase = {
    user_id: userId,
    stripe_session_id: session.id,
    stripe_payment_intent_id: paymentIntentId,
    stripe_charge_id: chargeId,
    stripe_customer_id: session.customer || null,
    credits: totalCredits,
    amount_total: session.amount_total ?? null,
    currency: session.currency ?? null,
    status: session.payment_status || session.status || null,
  };

  const record = await recordPurchase(supabase, purchase);
  if (!record.inserted) {
    return { handled: true, duplicate: true };
  }

  if (session.customer) {
    await supabase
      .from('users')
      .update({ stripe_customer_id: session.customer })
      .eq('id', userId);
  }

  await grantCreditsByUserId(supabase, userId, totalCredits);
  return { handled: true };
}

async function handleChargeRefunded(charge) {
  if (!charge?.refunded && !(charge?.amount_refunded > 0)) {
    return { handled: false };
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    throw new Error('Supabase server credentials not configured');
  }

  const chargeId = charge.id || null;
  const paymentIntentId = charge.payment_intent || null;
  let purchase =
    (await findPurchaseByChargeId(supabase, chargeId)) ||
    (await findPurchaseByPaymentIntent(supabase, paymentIntentId));

  if (!purchase) {
    console.warn('[Stripe webhook] No purchase found for refund');
    return { handled: false };
  }

  await supabase
    .from('credit_purchases')
    .update({
      status: 'refunded',
      refund_amount: charge.amount_refunded ?? null,
      refunded_at: new Date().toISOString(),
      stripe_charge_id: chargeId || purchase.stripe_charge_id,
    })
    .eq('id', purchase.id);

  const revoked = await markPurchaseRevoked(supabase, purchase.id, {
    revoked_reason: 'refund',
  });

  if (!revoked) {
    return { handled: true, alreadyRevoked: true };
  }

  await applyCreditsDelta(supabase, revoked.user_id, -revoked.credits);
  return { handled: true, revoked: true };
}

async function handleChargeDispute(dispute) {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    throw new Error('Supabase server credentials not configured');
  }

  const chargeId = dispute?.charge || null;
  const paymentIntentId = dispute?.payment_intent || null;
  let purchase =
    (await findPurchaseByChargeId(supabase, chargeId)) ||
    (await findPurchaseByPaymentIntent(supabase, paymentIntentId));

  if (!purchase) {
    console.warn('[Stripe webhook] No purchase found for dispute');
    return { handled: false };
  }

  await supabase
    .from('credit_purchases')
    .update({
      status: 'disputed',
      stripe_dispute_id: dispute.id || null,
      stripe_charge_id: chargeId || purchase.stripe_charge_id,
    })
    .eq('id', purchase.id);

  const revoked = await markPurchaseRevoked(supabase, purchase.id, {
    revoked_reason: 'chargeback',
  });

  if (!revoked) {
    return { handled: true, alreadyRevoked: true };
  }

  await applyCreditsDelta(supabase, revoked.user_id, -revoked.credits);
  return { handled: true, revoked: true };
}

export async function POST(request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeKey || !webhookSecret) {
    return Response.json(
      { error: 'Stripe webhook not configured' },
      { status: 500 }
    );
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return Response.json(
      { error: 'Missing Stripe signature' },
      { status: 400 }
    );
  }

  const stripe = new Stripe(stripeKey);
  const body = await request.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error('[Stripe webhook] Signature verification failed', error);
    return Response.json(
      { error: 'Invalid Stripe signature' },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
        await handleCheckoutSessionCompleted(event.data.object, stripe);
        break;
      case 'charge.refunded':
        await handleChargeRefunded(event.data.object);
        break;
      case 'charge.dispute.created':
      case 'charge.dispute.funds_withdrawn':
        await handleChargeDispute(event.data.object);
        break;
      default:
        break;
    }
  } catch (error) {
    console.error('[Stripe webhook] Handler error', error);
    return Response.json(
      { error: error.message || 'Webhook handler failed' },
      { status: 500 }
    );
  }

  return Response.json({ received: true });
}
