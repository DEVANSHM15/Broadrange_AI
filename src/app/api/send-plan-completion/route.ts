// src/app/api/send-plan-completion/route.ts
import { NextResponse } from "next/server";
import sgMail from "@sendgrid/mail";
import type { PlanInput } from '@/types';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

interface RequestBody {
    email: string;
    name: string;
    planDetails: PlanInput;
}

export async function POST(req: Request) {
  try {
    const { email, name, planDetails } = await req.json() as RequestBody;

     if (!email || !name || !planDetails) {
        return NextResponse.json({ success: false, error: "Missing required fields: email, name, or planDetails." }, { status: 400 });
    }

    const msg = {
      to: email,
      from: 'devanshm.btech23@rvu.edu.in', // Must match your SendGrid sender
      subject: `🎉 Congratulations on Completing Your Study Plan!`,
      html: `
        <h2>Hi ${name},</h2>
        <p>Amazing work! You've successfully completed your study plan for <strong>${planDetails.subjects}</strong>.</p>
        <p>We're proud of your dedication and consistency. Take a moment to celebrate your achievement!</p>
        <p>You can review your performance and get AI-powered insights on the <a href="${req.nextUrl.origin}/analytics">Analytics</a> page.</p>
        <br />
        <p>Keep up the great work!</p>
        <p><strong>The CodeXStudy Team</strong></p>
      `,
    };

    await sgMail.send(msg);
    console.log(`Plan completion email successfully dispatched for: ${email}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("SendGrid error (Plan Completion):", error);
    if (error && typeof error === 'object' && 'response' in error) {
      const sgError = error as { response?: { body?: any } };
      console.error("SendGrid response body:", sgError.response?.body);
    }
    return NextResponse.json({ success: false, error: "Failed to send plan completion email." }, { status: 500 });
  }
}
