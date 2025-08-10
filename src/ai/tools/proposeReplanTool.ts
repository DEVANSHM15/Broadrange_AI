
'use server';
/**
 * @fileOverview A Genkit tool that orchestrates the adaptive re-planning process based on a user's chat query.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { format } from 'date-fns';
import { adaptiveRePlanning } from '@/ai/flows/adaptive-re-planning';
import type { ScheduleData, ScheduleTask } from '@/types';

// Helper function to parse tasks from a string, essential for re-planning.
function parseTasksFromString(scheduleString: string, planId: string): ScheduleTask[] {
  try {
    const parsed = JSON.parse(scheduleString);
    if (Array.isArray(parsed) && parsed.every(item => typeof item.date === 'string' && typeof item.task === 'string')) {
      return parsed.map((item, index) => ({
        ...item,
        id: `task-${planId}-${new Date(item.date).getTime()}-${index}-${Math.random().toString(36).substring(2,9)}`,
        completed: false,
      }));
    }
    return [];
  } catch {
    return [];
  }
}

const ProposeReplanInputSchema = z.object({
  userId: z.string().describe("The ID of the user requesting the re-plan."),
  userQuery: z.string().describe("The user's original query, e.g., 'I missed 3 days of study'."),
});

const ProposeReplanOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().describe("A summary message to show the user, explaining what was done or why it failed."),
});

export const proposeReplan = ai.defineTool(
  {
    name: 'proposeReplan',
    description: "If a user indicates they've fallen behind or missed study days, use this tool to automatically reschedule their active plan. This tool will fetch the current plan, run the re-planning AI, and save the new schedule.",
    inputSchema: ProposeReplanInputSchema,
    outputSchema: ProposeReplanOutputSchema,
  },
  async ({ userId, userQuery }) => {
    const db = await getDb();

    // 1. Fetch the user's active plan
    const activePlan = await db.get<ScheduleData>(
      `SELECT * FROM study_plans WHERE userId = ? AND status = 'active' ORDER BY createdAt DESC LIMIT 1`,
      userId
    );

    if (!activePlan) {
      return { success: false, message: "You don't have an active study plan to revise. Please create one first." };
    }

    // 2. Extract the number of skipped days from the user's query
    const numberExtractionPrompt = ai.definePrompt({
      name: 'extractSkippedDays',
      input: { schema: z.string() },
      output: { schema: z.object({ skippedDays: z.number().int().min(0) }) },
      prompt: `From the following user query, extract the number of days they missed. If no number is mentioned, default to 1. Query: "{{input}}"`,
    });

    const { output: extractionOutput } = await numberExtractionPrompt(userQuery);
    if (!extractionOutput) {
      return { success: false, message: "I couldn't understand how many days you've missed. Please try again with a specific number of days." };
    }
    const skippedDays = extractionOutput.skippedDays;
    
    // 3. Fetch all tasks for the plan
    const tasks = await db.all<ScheduleTask[]>(
      `SELECT id, date, task, completed FROM schedule_tasks WHERE planId = ? ORDER BY date ASC`,
      activePlan.id
    );

    if (!tasks || tasks.length === 0) {
        return { success: false, message: "Your active plan doesn't have any tasks to reschedule." };
    }

    // 4. Call the adaptiveRePlanning flow
    try {
      const remainingDays = activePlan.planDetails.studyDurationDays - skippedDays;
      if (remainingDays < 1) {
        return { success: false, message: "There isn't enough time left in your plan to reschedule. Please create a new plan with a longer duration." };
      }

      const replanResult = await adaptiveRePlanning({
        tasks: tasks.map(t => ({...t, subTasks: []})), // Pass tasks, omitting subtasks for simplicity
        skippedDays,
        remainingDays,
        subjects: activePlan.planDetails.subjects,
        dailyStudyHours: activePlan.planDetails.dailyStudyHours,
      });

      // 5. Save the new plan to the database
      const newTasks = parseTasksFromString(replanResult.revisedSchedule, activePlan.id);
      
      await db.run('BEGIN TRANSACTION');
      // Delete old tasks
      await db.run('DELETE FROM sub_tasks WHERE taskId IN (SELECT id FROM schedule_tasks WHERE planId = ?)', activePlan.id);
      await db.run('DELETE FROM schedule_tasks WHERE planId = ?', activePlan.id);

      // Insert new tasks
      const taskInsertStmt = await db.prepare(
        `INSERT INTO schedule_tasks (id, planId, date, task, completed, youtubeSearchQuery, referenceSearchQuery)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      );
      for (const task of newTasks) {
          await taskInsertStmt.run(task.id, activePlan.id, task.date, task.task, false, task.youtubeSearchQuery, task.referenceSearchQuery);
      }
      await taskInsertStmt.finalize();

      // Update the plan's schedule string and updatedAt timestamp
      await db.run(
        `UPDATE study_plans SET scheduleString = ?, updatedAt = ?, startDate = ? WHERE id = ?`,
        replanResult.revisedSchedule,
        new Date().toISOString(),
        format(new Date(), 'yyyy-MM-dd'),
        activePlan.id
      );
      
      await db.run('COMMIT');

      // Dispatch an event to notify the frontend to refresh data
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('studyPlanUpdated'));
      }
      
      return { success: true, message: replanResult.summary };
    } catch (error) {
      await db.run('ROLLBACK').catch(e => console.error("Rollback failed", e));
      console.error("Re-planning tool failed:", error);
      return { success: false, message: `An error occurred while trying to revise your plan: ${(error as Error).message}` };
    }
  }
);
