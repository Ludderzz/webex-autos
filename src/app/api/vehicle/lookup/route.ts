import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const registration = searchParams.get('registration');

  if (!registration) {
    return NextResponse.json({ error: 'Registration is required' }, { status: 400 });
  }

  try {
    const formattedReg = registration.toUpperCase().replace(/\s+/g, '');
    const res = await fetch(`https://api.vehicle-search.co.uk/DvlaSearch?registration=${formattedReg}`, {
      headers: {
        'Authorization': `Bearer ${process.env.VEHICLE_SEARCH_API_KEY || ''}`,
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error('Vehicle API lookup failed');
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}