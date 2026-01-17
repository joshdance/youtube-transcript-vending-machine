import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY

  console.log('[auth-callback] Supabase URL present:', Boolean(supabaseUrl))
  console.log(
    '[auth-callback] Supabase anon key present:',
    Boolean(supabaseAnonKey),
    'length:',
    supabaseAnonKey?.length ?? 0,
    'prefix:',
    supabaseAnonKey ? supabaseAnonKey.slice(0, 8) : 'missing',
    'suffix:',
    supabaseAnonKey ? supabaseAnonKey.slice(-6) : 'missing'
  )

  if (code) {
    const cookieStore = await cookies()
    const supabase = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value
          },
          set(name, value, options) {
            try {
              cookieStore.set({ name, value, ...options })
            } catch (error) {
              // The `set` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
          remove(name, options) {
            try {
              cookieStore.set({ name, value: '', ...options })
            } catch (error) {
              // The `delete` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(`${origin}/`)
    }

    console.error('[auth-callback] exchangeCodeForSession error:', {
      message: error.message,
      name: error.name,
      status: error.status,
      code: error.code,
    })
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/`)
}
