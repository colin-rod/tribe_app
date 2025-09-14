import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createComponentLogger } from '@/lib/logger'

const logger = createComponentLogger('AuthCallback')

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  logger.info('Auth callback called', { metadata: { hasCode: !!code } })

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    logger.info('Auth session exchange result', { metadata: { success: !error } })
    
    if (!error) {
      logger.info('Redirecting to dashboard from callback')
      return NextResponse.redirect(`${origin}/dashboard`)
    } else {
      logger.error('Session exchange error', error)
    }
  }

  logger.warn('No code provided, redirecting to error page')
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}