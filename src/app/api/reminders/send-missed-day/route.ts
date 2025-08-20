
// /app/api/reminders/send-missed-day/route.ts
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { parseISO, isBefore, startOfToday, format, isValid } from 'date-fns';

const db = await getDb();

interface RequestBody {
    userId: string;
    planId: string;
}

// This endpoint checks if a reminder should be sent and, if so, triggers the email API
export async function POST(req: Request) {
    const { userId, planId } = await req.json() as RequestBody;

    if (!userId || !planId) {
        return NextResponse.json({ error: 'User ID and Plan ID are required' }, { status: 400 });
    }

    try {
        const plan = await db.get('SELECT * FROM study_plans WHERE id = ? AND userId = ? AND status = ?', planId, userId, 'active');
        if (!plan) {
            return NextResponse.json({ shouldSend: false, reason: "No active plan found." });
        }
        
        const todayStr = format(startOfToday(), 'yyyy-MM-dd');

        if (plan.lastReminderSent === todayStr) {
             return NextResponse.json({ shouldSend: false, reason: "Reminder already sent today." });
        }
        
        const tasks = await db.all('SELECT date, completed FROM schedule_tasks WHERE planId = ? ORDER BY date ASC', planId);
        
        const firstUncompletedTask = tasks.find(t => !t.completed && t.date && isValid(parseISO(t.date)));

        if (!firstUncompletedTask) {
             return NextResponse.json({ shouldSend: false, reason: "All tasks completed or no valid tasks." });
        }
        
        const taskDate = parseISO(firstUncompletedTask.date);

        if (isBefore(taskDate, startOfToday())) {
            const user = await db.get('SELECT name, email FROM users WHERE id = ?', userId);
            if (!user) {
                return NextResponse.json({ error: 'User not found' }, { status: 404 });
            }

            // Trigger the email sending API
            const emailResponse = await fetch(`${req.nextUrl.origin}/api/send-missed-day-reminder`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: user.email,
                    name: user.name,
                    missedTask: firstUncompletedTask,
                    planSubjects: plan.subjects,
                }),
            });
            
            if (emailResponse.ok) {
                // Update the last reminder sent date in the DB
                await db.run('UPDATE study_plans SET lastReminderSent = ? WHERE id = ?', todayStr, planId);
                return NextResponse.json({ shouldSend: true, message: "Reminder email sent." });
            } else {
                 const errorBody = await emailResponse.json().catch(() => ({error: "Failed to send email"}));
                 console.error("Failed to send reminder email:", errorBody);
                 return NextResponse.json({ shouldSend: false, error: "Failed to dispatch reminder email.", details: errorBody }, { status: 500 });
            }
        }
        
        return NextResponse.json({ shouldSend: false, reason: "User is on track." });

    } catch (error) {
        console.error("Error in send-missed-day check:", error);
        return NextResponse.json({ error: "An internal server error occurred.", details: (error as Error).message }, { status: 500 });
    }
}
