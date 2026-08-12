import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-02-24.acacia' as any,
});

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies(); // Added await here
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Handled by Next.js response cookies
            }
          },
        },
      }
    );
    
    // 1. Get current logged-in user with valid cookie session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Fetch their garage email or customer mapping
    const { data: profile } = await supabase
      .from('profiles')
      .select('garage_id, garages(email, name)')
      .eq('id', user.id)
      .single();

    const garageEmail = (profile?.garages as any)?.email || user.email;

    if (!garageEmail) {
      return NextResponse.json({ error: 'No associated garage email found.' }, { status: 404 });
    }

    // 3. Find the Stripe customer by email
    const customers = await stripe.customers.list({ email: garageEmail, limit: 1 });
    
    if (customers.data.length === 0) {
      return NextResponse.json({ error: 'No active Stripe billing profile found for this account yet.' }, { status: 404 });
    }

    const customerId = customers.data[0].id;

    // 4. Create the Billing Portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${request.headers.get('origin')}/dashboard`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error: any) {
    console.error('Stripe portal error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create portal session' }, { status: 500 });
  }
}