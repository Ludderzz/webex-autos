import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-02-24.acacia' as any,
});

// Use service role key to bypass RLS for secure background provisioning
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  let event: Stripe.Event;

  try {
    if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
    }
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Handle the relevant checkout and subscription events
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerEmail = session.customer_details?.email || session.customer_email;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;
        
        // Pull metadata passed securely through checkout session/subscription
        const garageName = session.metadata?.garageName;
        const password = session.metadata?.password;

        if (customerEmail && password) {
          // 1. CREATE SUPABASE AUTH USER NOW (Only on successful payment/trial confirmation)
          const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: customerEmail,
            password: password,
            email_confirm: true,
          });

          if (!authError && authData.user) {
            const userId = authData.user.id;

            // 2. CREATE THE GARAGE ROW
            const { data: garage, error: garageError } = await supabaseAdmin
              .from('garages')
              .insert([
                {
                  name: garageName || 'My Garage',
                  email: customerEmail,
                  stripe_customer_id: customerId,
                  stripe_subscription_id: subscriptionId,
                  subscription_status: 'active',
                }
              ])
              .select()
              .single();

            if (!garageError && garage) {
              // 3. LINK PROFILE TO THE NEW GARAGE ID
              await supabaseAdmin
                .from('profiles')
                .update({ garage_id: garage.id })
                .eq('id', userId);
            }
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const status = subscription.status; // 'active', 'past_due', 'canceled', etc.

        // Map stripe status to your app status
        const appStatus = status === 'active' || status === 'trialing' ? 'active' : 'inactive';

        await supabaseAdmin
            .from('garages')
            .update({ subscription_status: appStatus })
            .eq('stripe_customer_id', customerId);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Instantly lock account when subscription is fully canceled or deleted
        await supabaseAdmin
            .from('garages')
            .update({ subscription_status: 'inactive' })
            .eq('stripe_customer_id', customerId);
        break;
      }

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Error processing webhook event:', err);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}