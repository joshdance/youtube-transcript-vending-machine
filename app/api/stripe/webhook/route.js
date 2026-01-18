import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

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

async function grantCreditsByUserId(supabase, userId, creditsToAdd) {
  const userRecord = await ensureUserRecordById(supabase, userId);
  const newBalance = (userRecord?.credits_balance ?? 0) + creditsToAdd;
  const newAdded = (userRecord?.credits_added ?? 0) + creditsToAdd;

  const { error: updateError } = await supabase
    .from('users')
    .update({
      credits_balance: newBalance,
      credits_added: newAdded,
    })
    .eq('id', userId);

  if (updateError) {
    throw updateError;
  }

  return {
    creditsAdded: creditsToAdd,
    creditsBalance: newBalance,
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

async function handleCheckoutSessionCompleted(session) {
  if (session.payment_status !== 'paid') return { handled: false };

  const userId =
    session.client_reference_id || session.metadata?.user_id || null;
  if (!userId) {
    console.warn('[Stripe webhook] Missing user_id metadata');
    return { handled: false };
  }

  const creditsToAdd = Number(session.metadata?.credits);
  if (!Number.isFinite(creditsToAdd) || creditsToAdd <= 0) {
    console.warn('[Stripe webhook] Missing credits metadata');
    return { handled: false };
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    throw new Error('Supabase server credentials not configured');
  }

  const purchase = {
    user_id: userId,
    stripe_session_id: session.id,
    stripe_payment_intent_id: session.payment_intent || null,
    stripe_customer_id: session.customer || null,
    credits: creditsToAdd,
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

  await grantCreditsByUserId(supabase, userId, creditsToAdd);
  return { handled: true };
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
        await handleCheckoutSessionCompleted(event.data.object);
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
