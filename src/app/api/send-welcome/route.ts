
// app/api/send-welcome/route.ts
import { NextResponse } from "next/server";
import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY!); // Store in .env.local

export async function POST(req: Request) {
  const { email, name } = await req.json();

  const msg = {
    to: email,
    from: 'devanshm.btech23@rvu.edu.in ', // Must match your SendGrid sender
    subject: `🎉 Welcome to CodeXStudy, ${name}!`,
    html: `
      <h2>Hi ${name},</h2>
      <p>Welcome to <strong>CodeXStudy</strong> – your new productivity companion.</p>
      <p>You're now ready to take control of your study goals 🚀</p>
      <br />
      <p>Happy studying!</p>
      <p><strong>The CodeXStudy Team</strong></p>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log(`Welcome email successfully dispatched to SendGrid for: ${email}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("SendGrid error:", error);
    // It's good practice to check if the error object has more details,
    // especially from SendGrid, which often includes response body with error info.
    if (error && typeof error === 'object' && 'response' in error) {
      const sgError = error as { response?: { body?: any } };
      console.error("SendGrid response body:", sgError.response?.body);
    }
    return NextResponse.json({ success: false, error: "Failed to send welcome email." }, { status: 500 });
  }
}
