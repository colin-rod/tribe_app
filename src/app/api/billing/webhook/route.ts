import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })
  : null

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

export async function POST(request: NextRequest) {
  if (!stripe || !endpointSecret) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 501 })
  }

  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, endpointSecret)
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = await createClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        if (session.mode === 'subscription' && session.subscription) {
          const userId = session.metadata?.user_id
          
          if (userId) {
            await supabase
              .from('subscriptions')
              .update({
                is_active: true,
                plan: 'pro',
                stripe_subscription_id: session.subscription as string
              })
              .eq('user_id', userId)

            console.log(`Subscription activated for user: ${userId}`)
          }
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customer = await stripe.customers.retrieve(subscription.customer as string)
        
        if ('metadata' in customer && customer.metadata?.user_id) {
          const userId = customer.metadata.user_id
          
          await supabase
            .from('subscriptions')
            .update({
              is_active: subscription.status === 'active',
              plan: subscription.status === 'active' ? 'pro' : 'free',
              stripe_subscription_id: subscription.id
            })
            .eq('user_id', userId)

          console.log(`Subscription updated for user: ${userId}, status: ${subscription.status}`)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customer = await stripe.customers.retrieve(subscription.customer as string)
        
        if ('metadata' in customer && customer.metadata?.user_id) {
          const userId = customer.metadata.user_id
          
          await supabase
            .from('subscriptions')
            .update({
              is_active: false,
              plan: 'free',
              stripe_subscription_id: null
            })
            .eq('user_id', userId)

          console.log(`Subscription cancelled for user: ${userId}`)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
          const customer = await stripe.customers.retrieve(subscription.customer as string)
          
          if ('metadata' in customer && customer.metadata?.user_id) {
            const userId = customer.metadata.user_id
            
            // Optionally handle payment failure - maybe send email notification
            console.log(`Payment failed for user: ${userId}`)
            
            // For now, we'll keep the subscription active and let Stripe handle retries
            // You might want to implement your own logic here
          }
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
          const customer = await stripe.customers.retrieve(subscription.customer as string)
          
          if ('metadata' in customer && customer.metadata?.user_id) {
            const userId = customer.metadata.user_id
            
            // Ensure subscription is marked as active
            await supabase
              .from('subscriptions')
              .update({
                is_active: true,
                plan: 'pro'
              })
              .eq('user_id', userId)

            console.log(`Payment succeeded for user: ${userId}`)
          }
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

// Health check for webhook endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'stripe-webhook',
    timestamp: new Date().toISOString(),
    stripeConfigured: !!(stripe && endpointSecret)
  })
}