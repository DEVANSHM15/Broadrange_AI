
// This is a new file created to avoid circular dependencies.
// It will hold AI-related Zod schemas that might be needed across different type files.

import { z } from 'zod';

export const GeneratePlanReflectionOutputSchema = z.object({
  overallCompletionRate: z.number().min(0).max(1).describe("The fraction of tasks completed (e.g., 0.85 for 85%)."),
  mainReflection: z.string().describe("A general reflection on the user's performance and effort (2-3 sentences)."),
  consistencyObservation: z.string().describe("An observation about the user's study consistency throughout the plan, informed by task patterns (1-2 sentences)."),
  suggestionForNextPlan: z.string().describe("An actionable suggestion for the user's next study plan based on this one (1-2 sentences)."),
});

export type GeneratePlanReflectionOutput = z.infer<typeof GeneratePlanReflectionOutputSchema>;

// You can add other shared AI schemas here in the future.
