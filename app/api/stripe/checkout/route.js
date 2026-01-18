import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

const CREDIT_PACKS = {
  10: { priceId: process.env.STRIPE_PRICE_ID_10, label: '10 credits' },
  25: { priceId: process.env.STRIPE_PRICE_ID_25, label: '25 credits' },
  50: { priceId: process.env.STRIPE_PRICE_ID_50, label: '50 credits' },
};

const BYPASS_STRIPE_PAYMENTS = process.env.STRIPE_BYPASS_PAYMENTS === 'true';
const BYPASS_CREDITS_AMOUNT = 5;

function getSupabaseServerClient() {
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET;

  if (!supabaseUrl || !secretKey) return null;

  return createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function getAccessTokenFromRequest(request) {
  const authHeader =
    request.headers.get('authorization') || request.headers.get('Authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice('bearer '.length).trim();
  }

  try {
    const cookieStore = await cookies();
    const all = cookieStore.getAll();
    const authCookie = all.find((c) => c.name.endsWith('-auth-token'));
    if (!authCookie?.value) return null;

    const parsed = JSON.parse(authCookie.value);
    return parsed?.access_token || null;
  } catch {
    return null;
  }
}

function getUserProfile(user) {
  return {
    email: user?.email ?? null,
    full_name: user?.user_metadata?.full_name || user?.user_metadata?.name || null,
  };
}

async function getAuthenticatedUser(request, supabase) {
  const accessToken = await getAccessTokenFromRequest(request);
  if (!accessToken) return { user: null, error: 'Unauthorized' };

  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data?.user) {
    return { user: null, error: 'Unauthorized' };
  }

  return { user: data.user, error: null };
}

async function ensureUserRecord(supabase, user) {
  const { data: existing, error } = await supabase
    .from('users')
    .select('id, credits_balance, credits_added, stripe_customer_id')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (existing) return existing;

  const profile = getUserProfile(user);
  const { data: created, error: insertError } = await supabase
    .from('users')
    .insert([
      {
        id: user.id,
        ...profile,
        credits_balance: 0,
        credits_added: 0,
      },
    ])
    .select('id, credits_balance, credits_added, stripe_customer_id')
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

async function getCreditsUsedCount(supabase, userId) {
  const { count, error } = await supabase
    .from('credits_usage')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('action', 'transcript');

  if (error) {
    throw error;
  }

  return count || 0;
}

async function grantCredits(supabase, user, creditsToAdd) {
  const profile = getUserProfile(user);
  await ensureUserRecord(supabase, user);
  await supabase.from('users').update(profile).eq('id', user.id);

  const creditsUsed = await getCreditsUsedCount(supabase, user.id);
  const updated = await applyCreditsDelta(supabase, user.id, creditsToAdd);
  const balance = updated?.creditsBalance ?? 0;

  return {
    creditsAdded: creditsToAdd,
    creditsBalance: balance,
    creditsUsed,
    creditsRemaining: Math.max(balance - creditsUsed, 0),
  };
}

function getCheckoutUrl(request) {
  const origin =
    request.headers.get('origin') ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    'http://localhost:3000';

  return {
    successUrl:
      process.env.STRIPE_SUCCESS_URL || `${origin}/?payment=success`,
    cancelUrl: process.env.STRIPE_CANCEL_URL || `${origin}/?payment=cancel`,
  };
}

function sanitizeIdempotencyKey(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 200);
}

export async function POST(request) {
  try {
    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return Response.json(
        { error: 'Supabase server credentials not configured' },
        { status: 500 }
      );
    }

    const { user, error } = await getAuthenticatedUser(request, supabase);
    if (error || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const creditsRequested = Number(body?.credits);
    if (!Number.isFinite(creditsRequested) || creditsRequested <= 0) {
      return Response.json(
        { error: 'Invalid credits amount' },
        { status: 400 }
      );
    }

    const pack = CREDIT_PACKS[creditsRequested];
    if (!pack) {
      return Response.json(
        { error: 'Unsupported credits pack' },
        { status: 400 }
      );
    }

    if (BYPASS_STRIPE_PAYMENTS) {
      const bypassResult = await grantCredits(
        supabase,
        user,
        BYPASS_CREDITS_AMOUNT
      );
      return Response.json({
        bypassed: true,
        message: 'Stripe bypass enabled, credits granted.',
        ...bypassResult,
      });
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return Response.json(
        { error: 'Stripe secret key not configured' },
        { status: 500 }
      );
    }

    if (!pack.priceId) {
      return Response.json(
        { error: `Missing Stripe price for ${pack.label}` },
        { status: 500 }
      );
    }

    const stripe = new Stripe(stripeKey);
    const { successUrl, cancelUrl } = getCheckoutUrl(request);
    const idempotencyKey = sanitizeIdempotencyKey(body?.idempotencyKey);

    const userRecord = await ensureUserRecord(supabase, user);
    let stripeCustomerId = userRecord?.stripe_customer_id;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        metadata: {
          user_id: user.id,
        },
      });
      stripeCustomerId = customer.id;
      await supabase
        .from('users')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', user.id);
    }

    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        customer: stripeCustomerId,
        line_items: [
          {
            price: pack.priceId,
            quantity: 1,
          },
        ],
        allow_promotion_codes: true,
        client_reference_id: user.id,
        metadata: {
          user_id: user.id,
          credits: String(creditsRequested),
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
      },
      idempotencyKey ? { idempotencyKey } : undefined
    );

    return Response.json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('[API /stripe/checkout] Error:', error);
    return Response.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
