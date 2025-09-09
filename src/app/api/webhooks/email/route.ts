import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createComponentLogger } from '@/lib/logger'
import { WebhookAuthenticator } from '@/lib/auth/webhook-auth'
import { EmailService } from '@/lib/email/email-service'
import { WebhookError, createErrorResponse } from '@/lib/errors/webhook-errors'

const logger = createComponentLogger('EmailWebhook')

/**
 * POST /api/webhooks/email
 * Receive emails from email service (e.g., Mailgun, SendGrid) and create unassigned leaves
 */
export async function POST(req: NextRequest) {
  const authenticator = new WebhookAuthenticator()
  const emailService = new EmailService()

  try {
    logger.info('Email webhook request received', {
      metadata: {
        contentType: req.headers.get('content-type'),
        userAgent: req.headers.get('user-agent'),
        ip: req.headers.get('x-forwarded-for')
      }
    })

    // Authenticate request
    const authResult = await authenticator.authenticate(req)
    if (!authResult.isValid) {
      logger.warn('Authentication failed', {
        metadata: { error: authResult.error }
      })
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    logger.info('Authentication successful', {
      metadata: { method: authResult.method }
    })

    // Create Supabase service client
    const supabase = createServiceClient()

    // Process email
    const result = await emailService.processEmailWebhook(req, supabase)

    if (!result.success) {
      const statusCode = result.error?.includes('not a user email') ? 200 : 
                        result.error?.includes('not found') ? 404 : 500
      
      return NextResponse.json(
        { 
          success: result.success,
          error: result.error 
        },
        { status: statusCode }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        leafId: result.leafId,
        leafType: result.leafType,
        hasMedia: result.hasMedia
      },
      message: 'Email processed successfully'
    })

  } catch (error) {
    logger.error('Unexpected error in email webhook', error)
    
    const errorResponse = createErrorResponse(
      error instanceof WebhookError ? error : new WebhookError('Internal server error')
    )
    
    return NextResponse.json(
      { error: errorResponse.error },
      { status: errorResponse.statusCode }
    )
  }
}





// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}

export async function PATCH() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}