
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import type { ScheduleData, ScheduleTask, PlanInput } from '@/types'; // Added PlanInput

// Helper to validate plan data (basic validation)
const validatePlanInputForUpdate = (plan: Partial<ScheduleData>): string | null => {
    if (!plan.id) return "Plan ID is required for update.";
    if (plan.planDetails) {
        if (!plan.planDetails.subjects) return "Subjects are required if planDetails are provided.";
        if (plan.planDetails.dailyStudyHours != null && plan.planDetails.dailyStudyHours <= 0) return "Daily study hours must be positive.";
        if (plan.planDetails.studyDurationDays != null && plan.planDetails.studyDurationDays <= 0) return "Study duration must be positive.";
    }
    if (plan.tasks && !Array.isArray(plan.tasks)) return "Tasks must be an array.";
    return null;
};


export async function GET(
  req: Request,
  { params }: { params: { planId: string } }
) {
  const planId = params.planId;
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId'); 

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }
  if (!planId) {
    return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
  }

  try {
    const db = await getDb();
    const planRow = await db.get(
      `SELECT id, userId, createdAt, updatedAt, scheduleString, subjects, dailyStudyHours, studyDurationDays, subjectDetails, startDate, status, completionDate
       FROM study_plans
       WHERE id = ? AND userId = ?`, // Ensure userId is part of the query for security
      planId, userId 
    );

    if (!planRow) {
      return NextResponse.json({ error: 'Study plan not found or not authorized' }, { status: 404 });
    }

    const tasksFromDb = await db.all<ScheduleTask[]>(
      `SELECT id, date, task, completed, youtubeSearchQuery, referenceSearchQuery, quizScore, quizAttempted
       FROM schedule_tasks
       WHERE planId = ?
       ORDER BY date ASC, id ASC`,
      planId
    );
    
    for (const task of tasksFromDb) {
        const subTasksFromDb = await db.all(
            `SELECT id, text, completed FROM sub_tasks WHERE taskId = ?`,
            task.id
        );
        task.subTasks = subTasksFromDb || [];
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
      tasks: tasksFromDb.map(t => ({...t, subTasks: t.subTasks || [] })),
      status: planRow.status as ScheduleData['status'],
      completionDate: planRow.completionDate,
    };

    return NextResponse.json(plan, { status: 200 });
  } catch (error) {
    console.error(`Failed to fetch study plan ${planId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch study plan', details: (error as Error).message }, { status: 500 });
  }
}


export async function PUT(
  req: Request,
  { params }: { params: { planId: string } }
) {
  const planId = params.planId;
  
  try {
    const body = await req.json();
    const { planData, userId } = body; // Expecting planData (ScheduleData) and userId
    
    if (!userId) {
        return NextResponse.json({ error: "User ID is required for update authorization." }, { status: 401 });
    }
    if (!planData || typeof planData !== 'object' || planData.id !== planId) {
      return NextResponse.json({ error: 'Plan data is invalid or ID mismatch' }, { status: 400 });
    }

    const typedPlanData = planData as ScheduleData;
    const validationError = validatePlanInputForUpdate(typedPlanData);
    if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const db = await getDb();

    const existingPlan = await db.get('SELECT userId FROM study_plans WHERE id = ?', planId);
    if (!existingPlan) {
        return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }
    // Ensure userId from DB (INTEGER) matches userId from request (could be string or number)
    if (String(existingPlan.userId) !== String(userId)) { 
        return NextResponse.json({ error: 'Unauthorized to update this plan' }, { status: 403 });
    }

    await db.run('BEGIN TRANSACTION');

    const newUpdatedAt = new Date().toISOString();
    await db.run(
      `UPDATE study_plans SET
         updatedAt = ?, scheduleString = ?, subjects = ?, dailyStudyHours = ?, studyDurationDays = ?,
         subjectDetails = ?, startDate = ?, status = ?, completionDate = ?
       WHERE id = ? AND userId = ?`,
      newUpdatedAt,
      typedPlanData.scheduleString,
      typedPlanData.planDetails.subjects,
      typedPlanData.planDetails.dailyStudyHours,
      typedPlanData.planDetails.studyDurationDays,
      typedPlanData.planDetails.subjectDetails,
      typedPlanData.planDetails.startDate,
      typedPlanData.status,
      typedPlanData.completionDate,
      planId,
      userId
    );

    await db.run('DELETE FROM sub_tasks WHERE taskId IN (SELECT id FROM schedule_tasks WHERE planId = ?)', planId);
    await db.run('DELETE FROM schedule_tasks WHERE planId = ?', planId);

    if (typedPlanData.tasks && typedPlanData.tasks.length > 0) {
      const taskInsertStmt = await db.prepare(
        `INSERT INTO schedule_tasks (id, planId, date, task, completed, youtubeSearchQuery, referenceSearchQuery, quizScore, quizAttempted)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      const subTaskInsertStmt = await db.prepare(
        `INSERT INTO sub_tasks (id, taskId, text, completed) VALUES (?, ?, ?, ?)`
      );

      for (const task of typedPlanData.tasks) {
        await taskInsertStmt.run(
          task.id,
          planId,
          task.date,
          task.task,
          task.completed,
          task.youtubeSearchQuery,
          task.referenceSearchQuery,
          task.quizScore,
          task.quizAttempted
        );
        if (task.subTasks && task.subTasks.length > 0) {
            for (const subTask of task.subTasks) {
                await subTaskInsertStmt.run(
                    subTask.id,
                    task.id,
                    subTask.text,
                    subTask.completed
                );
            }
        }
      }
      await taskInsertStmt.finalize();
      await subTaskInsertStmt.finalize();
    }

    await db.run('COMMIT');
    
    // Fetch the fully updated plan to return it to the client
    const updatedPlanRow = await db.get(
      `SELECT id, userId, createdAt, updatedAt, scheduleString, subjects, dailyStudyHours, studyDurationDays, subjectDetails, startDate, status, completionDate
       FROM study_plans WHERE id = ? AND userId = ?`, planId, userId
    );
     if (!updatedPlanRow) { // Should not happen if update was successful, but good check
        await db.run('ROLLBACK'); // Should not be strictly necessary here as commit was done, but as safeguard
        return NextResponse.json({ error: 'Failed to retrieve updated plan after saving.' }, { status: 500 });
    }
     const updatedTasksFromDb = await db.all<ScheduleTask[]>(
        `SELECT id, date, task, completed, youtubeSearchQuery, referenceSearchQuery, quizScore, quizAttempted
         FROM schedule_tasks WHERE planId = ? ORDER BY date ASC, id ASC`, planId
    );
    for (const task of updatedTasksFromDb) {
        const subTasksFromDb = await db.all(
            `SELECT id, text, completed FROM sub_tasks WHERE taskId = ?`,
            task.id
        );
        task.subTasks = subTasksFromDb || [];
    }

    const returnPlan: ScheduleData = {
        id: updatedPlanRow.id,
        createdAt: updatedPlanRow.createdAt,
        updatedAt: updatedPlanRow.updatedAt,
        scheduleString: updatedPlanRow.scheduleString || "",
        planDetails: {
            subjects: updatedPlanRow.subjects,
            dailyStudyHours: updatedPlanRow.dailyStudyHours,
            studyDurationDays: updatedPlanRow.studyDurationDays,
            subjectDetails: updatedPlanRow.subjectDetails,
            startDate: updatedPlanRow.startDate,
        },
        tasks: updatedTasksFromDb.map(t => ({...t, subTasks: t.subTasks || [] })),
        status: updatedPlanRow.status as ScheduleData['status'],
        completionDate: updatedPlanRow.completionDate,
    };

    return NextResponse.json(returnPlan, { status: 200 });

  } catch (error) {
    const db = await getDb(); // Ensure db instance is available for rollback
    await db.run('ROLLBACK'); // Rollback transaction on any error during the try block
    console.error(`Failed to update study plan ${planId}:`, error);
     if (error instanceof SyntaxError) {
        return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update study plan', details: (error as Error).message }, { status: 500 });
  }
}


export async function DELETE(
  req: Request, 
  { params }: { params: { planId: string } }
) {
  const planId = params.planId;
  const { searchParams } = new URL(req.url); 
  const userId = searchParams.get('userId');

  if (!userId) {
      return NextResponse.json({ error: "User ID is required for delete authorization." }, { status: 400 });
  }
  if (!planId) {
    return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
  }

  try {
    const db = await getDb();

    const plan = await db.get('SELECT userId FROM study_plans WHERE id = ?', planId);
    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }
     // Ensure userId from DB (INTEGER) matches userId from request (can be string)
    if (String(plan.userId) !== String(userId)) { 
         return NextResponse.json({ error: 'Unauthorized to delete this plan' }, { status: 403 });
    }

    // Foreign key constraints with ON DELETE CASCADE should handle tasks and sub_tasks.
    // So, simply deleting from study_plans is enough if DB is set up correctly.
    const result = await db.run('DELETE FROM study_plans WHERE id = ? AND userId = ?', planId, userId);

    if (result.changes === 0) {
      // This case should ideally be caught by the ownership check above,
      // but it's a fallback.
      return NextResponse.json({ error: 'Plan not found or not authorized to delete' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Study plan deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error(`Failed to delete study plan ${planId}:`, error);
    // No explicit rollback needed for a single DELETE if not in a transaction,
    // but if other operations were involved, a transaction would be good.
    return NextResponse.json({ error: 'Failed to delete study plan', details: (error as Error).message }, { status: 500 });
  }
}

    