import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const DEFAULT_CREDITS_PACK = 10;
const MAX_CREDITS_PER_PURCHASE = 500;

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
    .select('id, credits_balance, credits_added')
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
    .select('id, credits_balance, credits_added')
    .single();

  if (insertError) {
    throw insertError;
  }

  return created;
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

export async function GET(request) {
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

    const userRecord = await ensureUserRecord(supabase, user);
    const creditsUsed = await getCreditsUsedCount(supabase, user.id);
    const creditsBalance = userRecord?.credits_balance ?? 0;

    return Response.json({
      success: true,
      creditsUsed,
      creditsBalance,
      creditsRemaining: Math.max(creditsBalance - creditsUsed, 0),
    });
  } catch (error) {
    console.error('[API /credits] Error:', error);
    return Response.json(
      { error: error.message || 'Failed to fetch credits usage' },
      { status: 500 }
    );
  }
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

    const creditsToAdd = Number(body?.credits ?? DEFAULT_CREDITS_PACK);
    if (!Number.isFinite(creditsToAdd) || creditsToAdd <= 0) {
      return Response.json(
        { error: 'Invalid credits amount' },
        { status: 400 }
      );
    }

    if (creditsToAdd > MAX_CREDITS_PER_PURCHASE) {
      return Response.json(
        { error: 'Credits amount exceeds the allowed limit' },
        { status: 400 }
      );
    }

    const userRecord = await ensureUserRecord(supabase, user);
    const profile = getUserProfile(user);
    const newBalance = (userRecord?.credits_balance ?? 0) + creditsToAdd;
    const newAdded = (userRecord?.credits_added ?? 0) + creditsToAdd;

    const { data: updated, error: updateError } = await supabase
      .from('users')
      .update({
        ...profile,
        credits_balance: newBalance,
        credits_added: newAdded,
      })
      .eq('id', user.id)
      .select('credits_balance, credits_added')
      .single();

    if (updateError) {
      return Response.json({ error: updateError.message }, { status: 500 });
    }

    const creditsUsed = await getCreditsUsedCount(supabase, user.id);
    const balance = updated?.credits_balance ?? newBalance;

    return Response.json({
      success: true,
      creditsAdded: creditsToAdd,
      creditsUsed,
      creditsBalance: balance,
      creditsRemaining: Math.max(balance - creditsUsed, 0),
    });
  } catch (error) {
    console.error('[API /credits] Error:', error);
    return Response.json(
      { error: error.message || 'Failed to add credits' },
      { status: 500 }
    );
  }
}

