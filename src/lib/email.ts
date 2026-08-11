import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendAdminAlert(garageName: string, ownerEmail: string) {
  try {
    await resend.emails.send({
      from: 'WebEx Auto <onboarding@resend.dev>', // Switch to your verified domain later
      to: 'Eludlam1221@gmail.com', // Your notification email
      subject: '🚨 New Garage Registered!',
      html: `
        <div style="font-family: sans-serif; background: #0a0a0a; color: #f5f5f5; padding: 24px; border-radius: 12px;">
          <h2 style="color: #fbbf24; text-transform: uppercase;">New Fleet Registration</h2>
          <p>A new garage has just signed up on WebEx Auto:</p>
          <ul style="list-style: none; padding: 0;">
            <li><strong>Garage Name:</strong> ${garageName}</li>
            <li><strong>Contact Email:</strong> ${ownerEmail}</li>
          </ul>
          <p style="color: #a3a3a3; font-size: 12px; margin-top: 20px;">Automated telemetry alert from WebEx Auto Master Command.</p>
        </div>
      `,
    });
    return { success: true };
  } catch (error: any) {
    console.error('Failed to send email notification:', error);
    return { success: false, error: error.message };
  }
}