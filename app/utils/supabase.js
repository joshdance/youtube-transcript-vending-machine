import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

if (typeof window !== 'undefined') {
  console.log('[supabase-client] URL:', supabaseUrl ?? 'missing')
  console.log(
    '[supabase-client] anon key present:',
    Boolean(supabaseAnonKey),
    'length:',
    supabaseAnonKey?.length ?? 0,
    'prefix:',
    supabaseAnonKey ? supabaseAnonKey.slice(0, 8) : 'missing',
    'suffix:',
    supabaseAnonKey ? supabaseAnonKey.slice(-6) : 'missing'
  )
}

const loggingFetch = async (input, init = {}) => {
  if (typeof window !== 'undefined') {
    const url = typeof input === 'string' ? input : input?.url
    const headers = new Headers(init.headers || {})
    const auth = headers.get('Authorization')
    const apiKey = headers.get('apikey')
    const safeAuth = auth ? `${auth.slice(0, 12)}...${auth.slice(-6)}` : null
    const safeApiKey = apiKey ? `${apiKey.slice(0, 12)}...${apiKey.slice(-6)}` : null

    console.log('[supabase-client] request', {
      url,
      method: init.method || 'GET',
      hasBody: Boolean(init.body),
      headers: {
        authorization: safeAuth,
        apikey: safeApiKey,
      },
    })
  }

  return fetch(input, init)
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: loggingFetch,
  },
})
