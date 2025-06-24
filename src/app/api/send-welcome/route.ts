
// app/api/send-welcome/route.ts
import { NextResponse } from "next/server";
import sgMail from "@sendgrid/mail";

export async function POST(req: Request) {
  // Moved API key setup inside the handler to prevent startup crashes
  if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  } else {
    console.warn("SENDGRID_API_KEY is not set. Skipping email dispatch.");
    // Return a success response so the registration flow doesn't break,
    // but log that the email was not sent.
    return NextResponse.json({ success: true, message: "Email dispatch skipped: API key not configured." });
  }

  const { email, name } = await req.json();

  const msg = {
    to: email,
    from: 'devanshm.btech23@rvu.edu.in', // Must match your SendGrid sender
    subject: `🎉 Welcome to Broadrange AI, ${name}!`,
    html: `
      <h2>Hi ${name},</h2>
      <p>Welcome to <strong>Broadrange AI</strong> – your productivity companion.</p>
      <p>You're now ready to take control of your study goals 🚀</p>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log(`Welcome email successfully dispatched to SendGrid for: ${email}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("SendGrid error:", error);
    // Add more detailed error logging for SendGrid
    if (error && typeof error === 'object' && 'response' in error) {
      const sgError = error as { response?: { body?: any } };
      console.error("SendGrid response body:", sgError.response?.body);
    }
    return NextResponse.json({ success: false, error: "Failed to send welcome email." }, { status: 500 });
  }
}
