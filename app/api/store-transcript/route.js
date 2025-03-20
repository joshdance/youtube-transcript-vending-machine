import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    console.log('Store transcript API called')
    const cookieStore = cookies()
    
    // Log all cookies for debugging
    const allCookies = cookieStore.getAll()
    console.log('All cookies:', allCookies.map(c => c.name))
    
    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    console.log('Auth header:', authHeader ? 'Present' : 'Missing')
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get: (name) => {
            const cookie = cookieStore.get(name)
            console.log(`Getting cookie ${name}:`, cookie ? 'Found' : 'Not found')
            return cookie?.value
          },
          set: (name, value, options) => {
            console.log(`Setting cookie ${name}`)
            cookieStore.set(name, value, options)
          },
          remove: (name, options) => {
            console.log(`Removing cookie ${name}`)
            cookieStore.set(name, '', options)
          },
        },
      }
    )
    
    // Verify authentication
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    console.log('Session check:', session ? 'Found' : 'Not found', sessionError ? `Error: ${sessionError.message}` : '')
    
    if (sessionError) {
      console.error('Session error:', sessionError)
      return NextResponse.json({ error: 'Authentication error' }, { status: 401 })
    }
    
    if (!session) {
      console.error('No session found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get request body
    const body = await request.json()
    console.log('Request body:', body)
    const { youtubeUrl, transcriptUrl } = body
    
    if (!youtubeUrl || !transcriptUrl) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    console.log('Attempting to insert with user_id:', session.user.id)
    // Insert into transcripts table
    const { data, error } = await supabase
      .from('transcripts')
      .insert([
        {
          youtube_url: youtubeUrl,
          transcript_url: transcriptUrl,
          user_id: session.user.id,
          requested_at: new Date().toISOString()
        }
      ])
      .select()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to store transcript' },
        { status: 500 }
      )
    }

    console.log('Successfully stored transcript:', data)
    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error in store-transcript route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
