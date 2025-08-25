import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  console.log('Auth callback called with code:', !!code)

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    console.log('Auth session exchange result:', error ? 'Error' : 'Success')
    
    if (!error) {
      console.log('Redirecting to dashboard from callback')
      return NextResponse.redirect(`${origin}/dashboard`)
    } else {
      console.error('Session exchange error:', error)
    }
  }

  console.log('No code or error, redirecting to error page')
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}