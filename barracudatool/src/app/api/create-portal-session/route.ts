import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
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

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get user's customer ID from database
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('customer_id')
      .eq('id', user.id)
      .single();

    if (!profile?.customer_id) {
      return NextResponse.json({ 
        error: 'No subscription found. Please subscribe first.' 
      }, { status: 404 });
    }

    // Check if this is a manually created subscription (for dev testing)
    if (profile.customer_id.startsWith('cus_manual') || profile.customer_id.startsWith('cus_test')) {
      return NextResponse.json({ 
        error: 'This is a test subscription. Billing portal is not available for manually activated accounts. To test the billing portal, complete a payment through the subscribe page.' 
      }, { status: 400 });
    }

    // Create Stripe Customer Portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.customer_id,
      return_url: `${request.headers.get('origin')}/account`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Portal session error:', error);
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    );
  }
}
