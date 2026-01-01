import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  try {
    // Get the cookie store and await it properly
    const cookieStore = await cookies()
    const authCookie = await cookieStore.get('sb-lrgtmzgdjzdrtyynttqk-auth-token')
    const authToken = authCookie?.value

    if (!authToken) {
      console.log('Session check: Not found')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Parse the auth token to get the access token
    let accessToken
    try {
      const parsedToken = JSON.parse(authToken)
      accessToken = parsedToken.access_token
    } catch (e) {
      console.error('Failed to parse auth token:', e)
      return new Response(JSON.stringify({ error: 'Invalid auth token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Initialize Supabase client with the access token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      }
    )

    const { youtubeUrl, transcriptData, transcriptUrl } = await request.json()

    if (!youtubeUrl) {
      return new Response(JSON.stringify({ error: 'Missing YouTube URL' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Support both new format (transcriptData as JSON) and legacy format (transcriptUrl)
    const insertData = {
      youtube_url: youtubeUrl,
    }

    if (transcriptData) {
      // New format: store transcript content as JSON
      insertData.transcript_content = transcriptData
    } else if (transcriptUrl) {
      // Legacy format: store URL
      insertData.transcript_url = transcriptUrl
    } else {
      return new Response(JSON.stringify({ error: 'Missing transcript data' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { data, error } = await supabase
      .from('transcripts')
      .insert([insertData])
      .select()

    if (error) {
      console.error('Supabase error:', error)
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Server error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
