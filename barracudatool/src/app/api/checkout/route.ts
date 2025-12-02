import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    console.log('🔵 Checkout API called');
    
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options) {
            cookieStore.set(name, value, options);
          },
          remove(name: string, options) {
            cookieStore.delete(name);
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    console.log('👤 User:', user?.email);

    if (!user) {
      console.error('❌ No user found');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check environment variables
    console.log('🔑 Stripe Price ID:', process.env.NEXT_PUBLIC_STRIPE_PRICE_ID);
    console.log('🔑 Stripe Secret Key exists:', !!process.env.STRIPE_SECRET_KEY);

    if (!process.env.NEXT_PUBLIC_STRIPE_PRICE_ID) {
      console.error('❌ Missing NEXT_PUBLIC_STRIPE_PRICE_ID');
      return NextResponse.json({ error: 'Stripe configuration error' }, { status: 500 });
    }

    console.log('💳 Creating Stripe session...');
    
    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      client_reference_id: user.id,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID!,
          quantity: 1,
        },
      ],
      success_url: `${request.headers.get('origin')}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.headers.get('origin')}/subscribe/cancel`,
      metadata: {
        user_id: user.id,
      },
    });

    console.log('✅ Stripe session created:', session.id);
    console.log('🔗 Checkout URL:', session.url);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('❌ Checkout error:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return NextResponse.json(
      { error: 'Failed to create checkout session', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
