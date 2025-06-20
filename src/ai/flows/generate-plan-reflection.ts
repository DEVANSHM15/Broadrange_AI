
'use server';
/**
 * @fileOverview Generates reflections and insights based on a completed study plan.
 *
 * - generatePlanReflection - A function that analyzes a study plan and provides reflections.
 * - GeneratePlanReflectionInput - The input type for the generatePlanReflection function.
 * - GeneratePlanReflectionOutput - The return type for the generatePlanReflection function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ScheduleTaskSchema = z.object({
  id: z.string(),
  date: z.string().describe("Date of the task in YYYY-MM-DD format."),
  task: z.string().describe("Description of the task."),
  completed: z.boolean().describe("Whether the task was marked as completed."),
});
type ScheduleTask = z.infer<typeof ScheduleTaskSchema>;

const PlanInputSchema = z.object({
  subjects: z.string().describe("Subjects covered in the plan."),
  dailyStudyHours: z.number().describe("Planned daily study hours."),
  studyDurationDays: z.number().describe("Total planned duration in days."),
});

const GeneratePlanReflectionInputSchema = z.object({
  planDetails: PlanInputSchema.describe("Details of the original study plan."),
  tasks: z.array(ScheduleTaskSchema).describe("List of all tasks in the plan with their completion status."),
  completionDate: z.string().optional().describe("Date the plan was marked as completed (YYYY-MM-DD)."),
});
export type GeneratePlanReflectionInput = z.infer<typeof GeneratePlanReflectionInputSchema>;

const GeneratePlanReflectionOutputSchema = z.object({
  overallCompletionRate: z.number().min(0).max(1).describe("The fraction of tasks completed (e.g., 0.85 for 85%)."),
  mainReflection: z.string().describe("A general reflection on the user's performance and effort (2-3 sentences)."),
  consistencyObservation: z.string().describe("An observation about the user's study consistency throughout the plan, informed by task patterns (1-2 sentences)."),
  suggestionForNextPlan: z.string().describe("An actionable suggestion for the user's next study plan based on this one (1-2 sentences)."),
});
export type GeneratePlanReflectionOutput = z.infer<typeof GeneratePlanReflectionOutputSchema>;

// Define the Tool for task analysis
const analyzeTaskPatternsTool = ai.defineTool(
  {
    name: 'analyzeTaskPatternsTool',
    description: 'Analyzes a list of study tasks to calculate completion rate and summarize study consistency patterns. Call this tool to get metrics on task completion.',
    inputSchema: z.object({
      tasks: z.array(ScheduleTaskSchema).describe("The list of tasks to analyze."),
    }),
    outputSchema: z.object({
      completionRate: z.number().min(0).max(1).describe("Fraction of tasks completed."),
      consistencySummary: z.string().describe("A brief summary of task completion patterns (e.g., 'consistent effort', 'strong start, then decline', 'sporadic completion')."),
      totalTasks: z.number().int(),
      completedTasks: z.number().int(),
    }),
  },
  async (input) => {
    const { tasks } = input;
    if (!tasks || tasks.length === 0) {
      return {
        completionRate: 0,
        consistencySummary: "No tasks to analyze for consistency.",
        totalTasks: 0,
        completedTasks: 0,
      };
    }

    const completedCount = tasks.filter(t => t.completed).length;
    const totalCount = tasks.length;
    const completionRate = totalCount > 0 ? completedCount / totalCount : 0;

    let consistencySummary = "Mixed consistency.";
    if (totalCount > 0) {
        const firstHalfTasks = tasks.slice(0, Math.ceil(totalCount / 2));
        const secondHalfTasks = tasks.slice(Math.ceil(totalCount / 2));

        const firstHalfCompleted = firstHalfTasks.filter(t => t.completed).length;
        const secondHalfCompleted = secondHalfTasks.filter(t => t.completed).length;

        const firstHalfRate = firstHalfTasks.length > 0 ? firstHalfCompleted / firstHalfTasks.length : 0;
        const secondHalfRate = secondHalfTasks.length > 0 ? secondHalfCompleted / secondHalfTasks.length : 0;

        if (completionRate > 0.8) {
            if (firstHalfRate > 0.8 && secondHalfRate > 0.8) {
                consistencySummary = "Consistent high completion throughout the plan.";
            } else if (firstHalfRate > 0.8 && secondHalfRate <= 0.8) {
                consistencySummary = "Strong start with high completion, with a decrease in the latter half.";
            } else {
                consistencySummary = "Good overall completion, with some variability.";
            }
        } else if (completionRate > 0.5) {
            if (firstHalfRate > secondHalfRate + 0.2) {
                consistencySummary = "Started strong, but completion declined in the second half.";
            } else if (secondHalfRate > firstHalfRate + 0.2) {
                consistencySummary = "Finished stronger than the start, showing improvement.";
            } else {
                consistencySummary = "Moderate completion with some consistency.";
            }
        } else if (completionRate > 0) {
             consistencySummary = "Low overall completion, indicating sporadic effort.";
        } else {
            consistencySummary = "No tasks were completed.";
        }
    } else {
        consistencySummary = "No tasks provided to analyze consistency.";
    }

    return {
      completionRate,
      consistencySummary,
      totalTasks: totalCount,
      completedTasks: completedCount,
    };
  }
);

// Updated Prompt to use the tool
const reflectionPrompt = ai.definePrompt({
  name: 'generatePlanReflectionPrompt',
  input: { schema: GeneratePlanReflectionInputSchema },
  output: { schema: GeneratePlanReflectionOutputSchema },
  tools: [analyzeTaskPatternsTool], 
  prompt: `You are a friendly and insightful AI study coach. The user has just completed a study plan.
Your goal is to provide a concise and encouraging reflection.

To understand their performance, first use the 'analyzeTaskPatternsTool' with the provided 'tasks' list.
This tool will give you the completionRate, a consistencySummary, totalTasks, and completedTasks.

User's Plan Details:
Subjects: {{{planDetails.subjects}}}
Planned Daily Study Hours: {{{planDetails.dailyStudyHours}}}
Planned Total Duration: {{{planDetails.studyDurationDays}}} days
{{#if completionDate}}Plan Marked Completed On: {{{completionDate}}}{{/if}}

User's Task List (for context, but rely on the tool for precise metrics):
{{#each tasks}}
- Task: "{{this.task}}", Completed: {{this.completed}}
{{/each}}

Once you have the analysis from the tool:
1.  Set 'overallCompletionRate' in your output to the 'completionRate' value returned by the tool.
2.  Write a 'mainReflection' (2-3 sentences) on their overall effort and achievement. Consider the total tasks and completed tasks from the tool when forming this reflection.
3.  Write a 'consistencyObservation' (1-2 sentences) using or building upon the 'consistencySummary' from the tool.
4.  Offer a constructive 'suggestionForNextPlan' (1-2 sentences) that could help them improve or maintain good habits, informed by their performance.

Focus on being positive and helpful. If data is sparse (e.g., very few tasks, as indicated by the tool's totalTasks count), make general encouraging remarks.
Ensure your output strictly adheres to the JSON schema for GeneratePlanReflectionOutputSchema.
Do not add any commentary outside of the JSON structure.
`,
});

const generatePlanReflectionFlow = ai.defineFlow(
  {
    name: 'generatePlanReflectionFlow',
    inputSchema: GeneratePlanReflectionInputSchema,
    outputSchema: GeneratePlanReflectionOutputSchema,
  },
  async (input) => {
    if (!input.planDetails || !input.tasks) {
      throw new Error("Plan details and tasks are required for reflection.");
    }

    try {
      const {output} = await reflectionPrompt(input); 
      if (!output) {
        throw new Error("AI failed to generate a reflection. Output was null.");
      }
      return output;
    } catch (error: any) {
      // Check if the error message indicates a quota issue or 429 error
      if (error.message && (error.message.includes('[429') || error.message.toLowerCase().includes('quota') || error.message.includes('rate limit'))) {
        console.error("Quota exceeded during reflection generation:", error.message);
        // Re-throw a more user-friendly/specific error for the frontend to catch
        throw new Error(`AI Reflection API Error: You've exceeded the usage limits for generating reflections. Please try again later or check your Google Cloud project's quota settings. (Details: ${error.message.substring(0, 150)}${error.message.length > 150 ? '...' : ''})`);
      }
      // Log other types of errors
      console.error("Error in generatePlanReflectionFlow during prompt call:", error);
      // Re-throw the original error or a generic one if it's not a quota issue
      throw new Error(`An unexpected error occurred while generating the plan reflection: ${error.message}`);
    }
  }
);

export async function generatePlanReflection(
  input: GeneratePlanReflectionInput
): Promise<GeneratePlanReflectionOutput> {
  return generatePlanReflectionFlow(input);
}

    

    