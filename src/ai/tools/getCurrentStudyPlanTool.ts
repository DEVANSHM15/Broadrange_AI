'use server';
/**
 * @fileOverview A Genkit tool for fetching a user's active study plan.
 */
import { ai } from '@/ai/genkit';
import { getDb } from '@/lib/db';
import { z } from 'zod';
import type { ScheduleTask } from '@/types';

const PlanDetailsSchema = z.object({
  subjects: z.string(),
  dailyStudyHours: z.number(),
  studyDurationDays: z.number(),
  startDate: z.string().optional(),
});

const PlanOutputSchema = z.object({
  hasActivePlan: z.boolean(),
  planDetails: PlanDetailsSchema.optional(),
  progress: z.object({
    completedTasks: z.number(),
    totalTasks: z.number(),
    percentage: z.number(),
    averageQuizScore: z.number().describe("The user's average score across all attempted quizzes for this plan."),
  }).optional(),
  firstUncompletedTask: z.string().optional().describe("A descriptive string for the next task on the user's plan."),
});

export const getCurrentStudyPlan = ai.defineTool(
  {
    name: 'getCurrentStudyPlan',
    description: "Retrieves the user's current active study plan details, including subjects, duration, progress, average quiz score, and the next upcoming task. Use this if the user asks 'what is my current plan?', 'how am I doing?', 'what's my quiz score?', or similar questions about their ongoing schedule.",
    inputSchema: z.object({ userId: z.string().describe("The ID of the user whose plan is being requested.") }),
    outputSchema: PlanOutputSchema,
  },
  async ({ userId }) => {
    const db = await getDb();
    const planRow = await db.get(
      `SELECT id, subjects, dailyStudyHours, studyDurationDays, startDate
       FROM study_plans
       WHERE userId = ? AND status = 'active'
       ORDER BY createdAt DESC
       LIMIT 1`,
      userId
    );

    if (!planRow) {
      return { hasActivePlan: false };
    }

    const tasks = await db.all<ScheduleTask[]>(
      `SELECT task, completed, date, quizScore, quizAttempted FROM schedule_tasks WHERE planId = ? ORDER BY date ASC`,
      planRow.id
    );
    
    const completedTasks = tasks.filter(t => t.completed).length;
    const totalTasks = tasks.length;
    const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const quizedTasks = tasks.filter(t => t.quizAttempted && typeof t.quizScore === 'number');
    const avgScore = quizedTasks.length > 0 
      ? Math.round(quizedTasks.reduce((sum, task) => sum + (task.quizScore || 0), 0) / quizedTasks.length) 
      : 0;

    const firstUncompleted = tasks.find(t => !t.completed);

    return {
      hasActivePlan: true,
      planDetails: {
        subjects: planRow.subjects,
        dailyStudyHours: planRow.dailyStudyHours,
        studyDurationDays: planRow.studyDurationDays,
        startDate: planRow.startDate,
      },
      progress: {
        completedTasks,
        totalTasks,
        percentage,
        averageQuizScore: avgScore,
      },
      firstUncompletedTask: firstUncompleted ? `Next up is "${firstUncompleted.task}" on ${firstUncompleted.date}.` : "All tasks are completed!",
    };
  }
);
