import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { garageName, email } = await request.json();

    await resend.emails.send({
      from: 'WebEx Auto <onboarding@resend.dev>',
      to: 'eludlam1221@gmail.com',
      subject: '🚨 New Garage Registered!',
      html: `
        <div style="font-family: sans-serif; background: #0a0a0a; color: #f5f5f5; padding: 24px; border-radius: 12px;">
          <h2 style="color: #fbbf24; text-transform: uppercase;">New Fleet Registration</h2>
          <p>A new garage has just signed up on WebEx Auto:</p>
          <ul style="list-style: none; padding: 0; line-height: 1.6;">
            <li><strong>Garage Name:</strong> ${garageName}</li>
            <li><strong>Contact Email:</strong> ${email}</li>
          </ul>
          <p style="color: #a3a3a3; font-size: 12px; margin-top: 20px;">Automated telemetry alert from WebEx Auto Master Command.</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to send admin email alert:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}