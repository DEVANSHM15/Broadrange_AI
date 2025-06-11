// app/api/send-welcome/route.ts
import { NextResponse } from "next/server";
import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY!); // Store in .env.local

export async function POST(req: Request) {
  const { email, name } = await req.json();

  const msg = {
    to: email,
    from: 'devanshm.btech23@rvu.edu.in ', // Must match your SendGrid sender
    subject: `🎉 Welcome to Broadrange AI, ${name}!`,
    html: `
      <h2>Hi ${name},</h2>
      <p>Welcome to <strong>Broadrange AI</strong> – your productivity companion.</p>
      <p>You're now ready to take control of your study goals 🚀</p>
    `,
  };

  try {
    await sgMail.send(msg);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("SendGrid error:", error);
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}
