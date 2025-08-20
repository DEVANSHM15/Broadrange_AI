
// src/app/api/send-plan-creation/route.ts
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
      subject: `🚀 Your New CodeXStudy Plan Has Been Created!`,
      html: `
        <h2>Hi ${name},</h2>
        <p>Your new personalized study plan for <strong>${planDetails.subjects}</strong> is ready!</p>
        <p>Here are the details:</p>
        <ul>
          <li><strong>Subjects:</strong> ${planDetails.subjects}</li>
          <li><strong>Duration:</strong> ${planDetails.studyDurationDays} days</li>
          <li><strong>Daily Goal:</strong> ${planDetails.dailyStudyHours} hours</li>
        </ul>
        <p>You can view your full schedule in the <a href="${req.nextUrl.origin}/planner">AI Planner</a> now.</p>
        <br />
        <p>Happy studying!</p>
        <p><strong>The CodeXStudy Team</strong></p>
      `,
    };

    await sgMail.send(msg);
    console.log(`Plan creation email successfully dispatched for: ${email}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("SendGrid error (Plan Creation):", error);
    if (error && typeof error === 'object' && 'response' in error) {
      const sgError = error as { response?: { body?: any } };
      console.error("SendGrid response body:", sgError.response?.body);
    }
    return NextResponse.json({ success: false, error: "Failed to send plan creation email." }, { status: 500 });
  }
}

    