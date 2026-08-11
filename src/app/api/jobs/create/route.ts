import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    
    // Create authenticated Supabase client using cookies for RLS security
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value, ...options });
            } catch (error) {}
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value: '', ...options });
            } catch (error) {}
          },
        },
      }
    );

    // 1. Verify user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Fetch the user's assigned garage_id securely from the profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('garage_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.garage_id) {
      return NextResponse.json({ error: 'No garage assigned to user profile' }, { status: 400 });
    }

    const body = await request.json();
    const { registrationPlate, customerName, customerPhone, customerEmail, vehicleMakeModel } = body;

    // Validate required fields (garageId is now derived server-side)
    if (!registrationPlate) {
      return NextResponse.json(
        { error: 'Missing required field: registrationPlate is mandatory.' },
        { status: 400 }
      );
    }

    // Clean up registration plate format (uppercase, strip spaces)
    const formattedReg = registrationPlate.toUpperCase().replace(/\s+/g, '');

    // Generate a unique share token for public customer link routing
    const shareToken = randomUUID();

    // Insert new job into Supabase utilizing the user's secure garage_id
    const { data: newJob, error: insertError } = await supabase
      .from('jobs')
      .insert([
        {
          garage_id: profile.garage_id, // <--- Secured automatically via profile
          registration_plate: formattedReg,
          vehicle_make_model: vehicleMakeModel || 'Standard Vehicle',
          customer_name: customerName || 'Valued Customer',
          customer_phone: customerPhone || '',
          customer_email: customerEmail || '',
          status: 'in_progress',
          share_token: shareToken,
          created_at: new Date().toISOString(),
        }
      ])
      .select()
      .single();

    if (insertError) {
      console.error('Supabase insertion error:', insertError);
      return NextResponse.json(
        { error: 'Failed to create job record in database', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Job successfully created and assigned to bay.',
        job: newJob,
      },
      { status: 201 }
    );

  } catch (err: any) {
    console.error('Unexpected error in create job route:', err);
    return NextResponse.json(
      { error: 'Internal Server Error', details: err.message || 'Unknown error' },
      { status: 500 }
    );
  }
}