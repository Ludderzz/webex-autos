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
        
        // Pull metadata passed securely through checkout session / subscription
        let garageName = session.metadata?.garageName;
        let password = session.metadata?.password;

        // If metadata is nested in the subscription (common with trials/subscriptions)
        if ((!garageName || !password) && session.subscription) {
          try {
            const subscriptionObj = await stripe.subscriptions.retrieve(session.subscription as string);
            garageName = garageName || subscriptionObj.metadata?.garageName;
            password = password || subscriptionObj.metadata?.password;
          } catch (subErr) {
            console.error('Failed to retrieve subscription metadata:', subErr);
          }
        }

        if (customerEmail && password) {
          // 1. CREATE SUPABASE AUTH USER NOW
          const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: customerEmail,
            password: password,
            email_confirm: true,
          });

          if (authError) {
            console.error('SUPABASE AUTH ERROR:', authError);
            return NextResponse.json({ error: authError.message }, { status: 400 });
          }

          if (authData.user) {
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

            if (garageError) {
              console.error('SUPABASE GARAGE INSERT ERROR:', garageError);
              return NextResponse.json({ error: garageError.message }, { status: 400 });
            }

            if (garage) {
              // 3. LINK PROFILE TO THE NEW GARAGE ID
              const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .update({ garage_id: garage.id })
                .eq('id', userId);

              if (profileError) {
                console.error('SUPABASE PROFILE UPDATE ERROR:', profileError);
                return NextResponse.json({ error: profileError.message }, { status: 400 });
              }
            }
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const status = subscription.status;

        const appStatus = status === 'active' || status === 'trialing' ? 'active' : 'inactive';

        const { error: subUpdateError } = await supabaseAdmin
            .from('garages')
            .update({ subscription_status: appStatus })
            .eq('stripe_customer_id', customerId);

        if (subUpdateError) {
          console.error('SUPABASE SUB UPDATE ERROR:', subUpdateError);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const { error: subDeleteError } = await supabaseAdmin
            .from('garages')
            .update({ subscription_status: 'inactive' })
            .eq('stripe_customer_id', customerId);

        if (subDeleteError) {
          console.error('SUPABASE SUB DELETE ERROR:', subDeleteError);
        }
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