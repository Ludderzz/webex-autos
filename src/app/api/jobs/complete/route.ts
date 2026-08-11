import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { jobId, parts, labourCharge, totalPrice } = body;

    if (!jobId) {
      return NextResponse.json(
        { error: 'Missing jobId parameter' },
        { status: 400 }
      );
    }

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

    // 1. Fetch job details and associated images from Supabase safely
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select(`
        *,
        images:job_images(*)
      `)
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'Job not found or database error', details: jobError?.message },
        { status: 404 }
      );
    }

    // 2. Update job status to 'completed', record timestamp, and save financial totals
    const parsedLabour = labourCharge !== undefined && labourCharge !== '' ? parseFloat(labourCharge) : 0;
    const parsedTotal = totalPrice !== undefined && totalPrice !== '' ? parseFloat(totalPrice) : 0;

    const { error: updateError } = await supabase
      .from('jobs')
      .update({ 
        status: 'completed', 
        completed_at: new Date().toISOString(),
        labour_charge: isNaN(parsedLabour) ? 0 : parsedLabour,
        total_price: isNaN(parsedTotal) ? 0 : parsedTotal,
      })
      .eq('id', jobId);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update job status and totals', details: updateError.message },
        { status: 500 }
      );
    }

    // 3. Compile report payload summary including parts and financials
    const reportPayload = {
      jobId: job.id,
      registration: job.registration_plate,
      customerEmail: job.customer_email,
      completedAt: new Date().toISOString(),
      summary: job.mechanic_notes,
      imageCount: job.images?.length || 0,
      parts: parts || [],
      labourCharge: parsedLabour,
      totalPrice: parsedTotal,
    };

    // Return a pristine success payload back to the frontend client
    return NextResponse.json(
      { 
        success: true, 
        message: 'Job successfully completed, financials updated, and report compiled.',
        data: reportPayload 
      },
      { status: 200 }
    );

  } catch (err: any) {
    console.error('Error completing job:', err);
    return NextResponse.json(
      { error: 'Internal Server Error', details: err?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}