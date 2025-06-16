
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import type { ScheduleData, ScheduleTask, PlanInput } from '@/types';

// Helper function to validate plan data (basic validation)
const validatePlanInput = (plan: Partial<ScheduleData>, userId?: number | string): string | null => {
    if (!userId) return "User ID is required.";
    if (!plan.id) return "Plan ID is required.";
    if (!plan.planDetails?.subjects) return "Subjects are required.";
    if (plan.planDetails?.dailyStudyHours == null || plan.planDetails.dailyStudyHours <= 0) return "Daily study hours must be positive.";
    if (plan.planDetails?.studyDurationDays == null || plan.planDetails.studyDurationDays <= 0) return "Study duration must be positive.";
    if (!plan.createdAt || !plan.updatedAt) return "Timestamps are missing.";
    if (!plan.status) return "Plan status is required.";
    if (!Array.isArray(plan.tasks)) return "Tasks must be an array.";
    return null;
};


export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, planData } = body; // Expecting userId and the full ScheduleData object as planData

    if (!userId) {
        return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    if (!planData || typeof planData !== 'object') {
        return NextResponse.json({ error: 'Plan data is required' }, { status: 400 });
    }
    
    const typedPlanData = planData as ScheduleData; // Cast to ScheduleData

    const validationError = validatePlanInput(typedPlanData, userId);
    if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const db = await getDb();
    await db.run('BEGIN TRANSACTION');

    // Insert into study_plans table
    await db.run(
      `INSERT INTO study_plans (id, userId, createdAt, updatedAt, scheduleString, subjects, dailyStudyHours, studyDurationDays, subjectDetails, startDate, status, completionDate)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      typedPlanData.id,
      userId,
      typedPlanData.createdAt,
      typedPlanData.updatedAt,
      typedPlanData.scheduleString,
      typedPlanData.planDetails.subjects,
      typedPlanData.planDetails.dailyStudyHours,
      typedPlanData.planDetails.studyDurationDays,
      typedPlanData.planDetails.subjectDetails,
      typedPlanData.planDetails.startDate,
      typedPlanData.status,
      typedPlanData.completionDate
    );

    // Insert tasks into schedule_tasks table
    if (typedPlanData.tasks && typedPlanData.tasks.length > 0) {
      const taskInsertStmt = await db.prepare(
        `INSERT INTO schedule_tasks (id, planId, date, task, completed, youtubeSearchQuery, referenceSearchQuery, quizScore, quizAttempted, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      for (const task of typedPlanData.tasks) {
        await taskInsertStmt.run(
          task.id,
          typedPlanData.id, // planId
          task.date,
          task.task,
          task.completed, // Stored as 0 or 1 by SQLite driver if boolean
          task.youtubeSearchQuery,
          task.referenceSearchQuery,
          task.quizScore,
          task.quizAttempted, // Stored as 0 or 1 by SQLite driver if boolean
          task.notes // Added notes field
        );
        // Note: Sub-tasks are not handled in this POST, they would be part of PUT or a separate endpoint
      }
      await taskInsertStmt.finalize();
    }

    await db.run('COMMIT');

    // Fetch the newly created plan with its tasks to return it (optional, but good practice)
    // For simplicity, we'll just return the input data for now
    return NextResponse.json(typedPlanData, { status: 201 });

  } catch (error) {
    const db = await getDb(); // Ensure DB instance is available for rollback
    await db.run('ROLLBACK'); // Rollback transaction on error
    console.error('POST /api/plans - Failed to create study plan:', error);
    
    let detailMessage = 'An unknown server error occurred during plan creation.';
    if (error instanceof Error) {
      detailMessage = error.message;
    } else if (typeof error === 'string') {
      detailMessage = error;
    } else {
      try {
        detailMessage = JSON.stringify(error);
      } catch (e) {
        detailMessage = 'Error object during plan creation could not be stringified.';
      }
    }

    return NextResponse.json({
      error: 'Failed to create study plan on server.',
      details: detailMessage
    }, { status: 500 });
  }
}


export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'User ID query parameter is required' }, { status: 400 });
  }

  try {
    const db = await getDb();
    const plansFromDb = await db.all(
      `SELECT id, createdAt, updatedAt, scheduleString, subjects, dailyStudyHours, studyDurationDays, subjectDetails, startDate, status, completionDate 
       FROM study_plans 
       WHERE userId = ? 
       ORDER BY updatedAt DESC`, 
      userId
    );

    const plans: ScheduleData[] = [];
    for (const planRow of plansFromDb) {
      let tasksFromDbRaw: any[];
      try {
        tasksFromDbRaw = await db.all<any[]>(
          `SELECT id, date, task, completed, youtubeSearchQuery, referenceSearchQuery, quizScore, quizAttempted, notes
           FROM schedule_tasks 
           WHERE planId = ? 
           ORDER BY date ASC, id ASC`,
          planRow.id
        );
      } catch (selectError: any) {
        if (String(selectError.message).includes("no such column: notes")) {
          console.warn(`GET /api/plans - Column 'notes' not found for planId ${planRow.id}, fetching tasks without it.`);
          tasksFromDbRaw = await db.all<any[]>(
            `SELECT id, date, task, completed, youtubeSearchQuery, referenceSearchQuery, quizScore, quizAttempted
             FROM schedule_tasks 
             WHERE planId = ? 
             ORDER BY date ASC, id ASC`,
            planRow.id
          );
        } else {
          throw selectError; 
        }
      }
      
      const processedTasks: ScheduleTask[] = [];
      for (const t of tasksFromDbRaw) {
          const subTasksFromDb = await db.all<any[]>(
              `SELECT id, text, completed FROM sub_tasks WHERE taskId = ?`,
              t.id
          );
          processedTasks.push({
              id: t.id,
              date: t.date,
              task: t.task,
              completed: Boolean(t.completed),
              youtubeSearchQuery: t.youtubeSearchQuery,
              referenceSearchQuery: t.referenceSearchQuery,
              quizScore: t.quizScore,
              quizAttempted: Boolean(t.quizAttempted),
              notes: t.notes !== undefined ? t.notes : undefined,
              subTasks: subTasksFromDb.map(st => ({...st, completed: Boolean(st.completed)})) || [],
          });
      }

      const plan: ScheduleData = {
        id: planRow.id,
        createdAt: planRow.createdAt,
        updatedAt: planRow.updatedAt,
        scheduleString: planRow.scheduleString || "", 
        planDetails: {
          subjects: planRow.subjects,
          dailyStudyHours: planRow.dailyStudyHours,
          studyDurationDays: planRow.studyDurationDays,
          subjectDetails: planRow.subjectDetails,
          startDate: planRow.startDate,
        },
        tasks: processedTasks,
        status: planRow.status as ScheduleData['status'],
        completionDate: planRow.completionDate,
      };
      plans.push(plan);
    }

    return NextResponse.json(plans, { status: 200 });

  } catch (error) {
    // Simplified and more robust catch block
    console.error(`CRITICAL ERROR in GET /api/plans for userId ${userId}:`, error); 
    
    let detailMessage = "An unexpected error occurred on the server while fetching plans.";
    if (error instanceof Error) {
      detailMessage = error.message;
    } else if (typeof error === 'string') {
      detailMessage = error;
    }
    // Ensure detailMessage is a simple string for JSON serialization
    detailMessage = String(detailMessage).substring(0, 500); // Truncate if too long

    return NextResponse.json({
      error: 'Server Error: Failed to fetch study plans.',
      details: detailMessage + " (Please check server logs for more information.)"
    }, { status: 500 });
  }
}
