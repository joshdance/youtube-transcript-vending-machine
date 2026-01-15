import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

function getSupabaseServerClient() {
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) return null;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function getAccessTokenFromRequest(request) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
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

export async function GET(request) {
  try {
    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return Response.json(
        { error: 'Supabase server credentials not configured' },
        { status: 500 }
      );
    }

    const accessToken = await getAccessTokenFromRequest(request);
    if (!accessToken) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
    if (userError || !userData?.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = userData.user.id;

    const { count, error } = await supabase
      .from('credits_usage')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('action', 'transcript');

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({
      success: true,
      creditsUsed: count || 0,
    });
  } catch (error) {
    console.error('[API /credits] Error:', error);
    return Response.json(
      { error: error.message || 'Failed to fetch credits usage' },
      { status: 500 }
    );
  }
}

