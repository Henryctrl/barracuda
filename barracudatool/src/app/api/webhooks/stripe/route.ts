import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    console.error('❌ No signature found');
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  console.log('🎣 Webhook received:', event.type);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('✅ Checkout completed:', session.id);

        const userId = session.metadata?.user_id;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (!userId) {
          console.error('❌ No user_id in metadata');
          break;
        }

        console.log('👤 User ID:', userId);
        console.log('💳 Customer ID:', customerId);
        console.log('📋 Subscription ID:', subscriptionId);

        // Create or update user profile
        const { error: upsertError } = await supabase
          .from('user_profiles')
          .upsert({
            id: userId,
            email: session.customer_email || '',
            subscription_status: 'active',
            customer_id: customerId,
            subscription_id: subscriptionId,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'id'
          });

        if (upsertError) {
          console.error('❌ Failed to update user profile:', upsertError);
        } else {
          console.log('✅ User profile updated - subscription active!');
        }

        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('📋 Subscription updated:', subscription.id);

        // Find user by customer_id
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('customer_id', subscription.customer as string)
          .single();

        if (profile) {
          const status = subscription.status === 'active' ? 'active' : 'inactive';
          
          await supabase
            .from('user_profiles')
            .update({
              subscription_status: status,
              updated_at: new Date().toISOString(),
            })
            .eq('id', profile.id);

          console.log(`✅ Subscription status updated to: ${status}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('🗑️ Subscription cancelled:', subscription.id);

        // Find user and deactivate
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('subscription_id', subscription.id)
          .single();

        if (profile) {
          await supabase
            .from('user_profiles')
            .update({
              subscription_status: 'inactive',
              updated_at: new Date().toISOString(),
            })
            .eq('id', profile.id);

          console.log('✅ Subscription deactivated');
        }
        break;
      }

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('❌ Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
