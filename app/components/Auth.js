'use client'

import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '../utils/supabase'
import { useState, useEffect } from 'react'

export default function AuthComponent() {
  const [error, setError] = useState(null)
  const [debugInfo, setDebugInfo] = useState(null)

  useEffect(() => {
    // Show debug info about Supabase configuration
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const hasKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    setDebugInfo({
      url,
      hasAnonKey: hasKey,
      supabaseClientUrl: supabase?.supabaseUrl
    })
  }, [])

  // Listen for auth state changes and errors
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        setError(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Catch global fetch errors
  useEffect(() => {
    const originalFetch = window.fetch
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args)
        return response
      } catch (err) {
        if (err.message === 'Failed to fetch' && args[0]?.includes('supabase.co')) {
          const url = typeof args[0] === 'string' ? args[0] : args[0].url
          setError(`Cannot connect to Supabase server at ${url}.

Possible causes:
• DNS resolution failed (ERR_NAME_NOT_RESOLVED) - the domain cannot be found
• Network connectivity issue
• Incorrect Supabase URL in environment variables
• Supabase project may be paused or deleted

Current config: ${debugInfo?.supabaseClientUrl || 'unknown'}
Expected: ${debugInfo?.url || 'unknown'}`)
        }
        throw err
      }
    }

    return () => {
      window.fetch = originalFetch
    }
  }, [debugInfo])

  return (
    <div className="w-full max-w-md mx-auto p-4">
      {error && (
        <div className="mb-4 p-4 bg-red-900/20 border border-red-500 rounded-lg text-red-200 text-sm whitespace-pre-wrap">
          <strong className="block mb-2">Authentication Error:</strong>
          {error}
        </div>
      )}

      {debugInfo && process.env.NODE_ENV === 'development' && (
        <details className="mb-4 p-3 bg-gray-800 border border-gray-700 rounded text-xs text-gray-300">
          <summary className="cursor-pointer font-semibold">Debug Info</summary>
          <pre className="mt-2 overflow-auto">{JSON.stringify(debugInfo, null, 2)}</pre>
        </details>
      )}

      <Auth
        supabaseClient={supabase}
        appearance={{ theme: ThemeSupa }}
        providers={[]}
        view="magic_link"
        showLinks={false}
        theme="dark"
        onError={(error) => {
          setError(`Sign in failed: ${error.message}

Details: ${error.status ? `HTTP ${error.status}` : 'Network error'}

This usually means:
• Network connectivity issue
• Supabase server unreachable
• Invalid API credentials
• CORS configuration issue`)
        }}
      />
    </div>
  )
}
