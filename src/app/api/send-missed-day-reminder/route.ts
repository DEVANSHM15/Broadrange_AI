
// src/app/api/send-missed-day-reminder/route.ts
import { NextResponse } from "next/server";
import sgMail from "@sendgrid/mail";
import { format, parseISO, isValid } from 'date-fns';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

interface RequestBody {
    email: string;
    name: string;
    missedTask: { date: string; task: string };
    planSubjects: string;
}

export async function POST(req: Request) {
  try {
    const { email, name, missedTask, planSubjects } = await req.json() as RequestBody;

     if (!email || !name || !missedTask || !planSubjects) {
        return NextResponse.json({ success: false, error: "Missing required fields." }, { status: 400 });
    }
    
    const formattedDate = isValid(parseISO(missedTask.date)) 
        ? format(parseISO(missedTask.date), 'MMMM d, yyyy')
        : 'a previous day';

    const msg = {
      to: email,
      from: 'devanshm.btech23@rvu.edu.in', // Must match your SendGrid sender
      subject: ` gentle reminder: Let's get back to your study plan!`,
      html: `
        <h2>Hi ${name},</h2>
        <p>Just a friendly nudge to get back on track with your study plan for <strong>${planSubjects}</strong>.</p>
        <p>It looks like you missed a task from <strong>${formattedDate}</strong>:</p>
        <blockquote>
          <p><em>"${missedTask.task}"</em></p>
        </blockquote>
        <p>Consistency is key to success. You can pick up where you left off by visiting your calendar.</p>
        <p>
            <a href="${req.nextUrl.origin}/calendar" style="display: inline-block; padding: 10px 20px; font-size: 16px; color: #ffffff; background-color: #007bff; text-decoration: none; border-radius: 5px;">View Your Calendar</a>
        </p>
        <br />
        <p>You've got this!</p>
        <p><strong>The CodeXStudy Team</strong></p>
      `,
    };

    await sgMail.send(msg);
    console.log(`Missed day reminder successfully dispatched for: ${email}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("SendGrid error (Missed Day Reminder):", error);
    if (error && typeof error === 'object' && 'response' in error) {
      const sgError = error as { response?: { body?: any } };
      console.error("SendGrid response body:", sgError.response?.body);
    }
    return NextResponse.json({ success: false, error: "Failed to send reminder email." }, { status: 500 });
  }
}
