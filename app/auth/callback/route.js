import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/app/utils/supabase-server'

function getSafeRedirectPath(requestUrl) {
  const nextPath = requestUrl.searchParams.get('next')
  if (!nextPath) return '/'

  try {
    const decoded = decodeURIComponent(nextPath)
    if (decoded.startsWith('/') && !decoded.startsWith('//')) {
      return decoded
    }
  } catch {
    // Ignore invalid URI characters and fall back to "/"
  }

  return '/'
}

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin
  const redirectPath = getSafeRedirectPath(requestUrl)

  if (code) {
    try {
      const supabase = await createSupabaseServerClient()

      const { error } = await supabase.auth.exchangeCodeForSession(code)

      if (!error) {
        return NextResponse.redirect(`${origin}${redirectPath}`)
      }

      console.error('[auth-callback] exchangeCodeForSession error:', {
        message: error.message,
        name: error.name,
        status: error.status,
        code: error.code,
      })
    } catch (error) {
      console.error('[auth-callback] Failed to create Supabase server client:', {
        message: error?.message,
      })
    }
  }

  return NextResponse.redirect(`${origin}/signin?error=auth_callback_failed`)
}
