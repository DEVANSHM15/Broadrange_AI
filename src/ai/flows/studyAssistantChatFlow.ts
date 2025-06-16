
'use server';
/**
 * @fileOverview A Study Assistant Chatbot flow.
 *
 * - studyAssistantChat - Handles user queries, uses tools to fetch data, and provides responses and navigation.
 * - StudyAssistantChatInput - Input type (userQuery, currentUserId).
 * - StudyAssistantChatOutput - Output type (responseText, navigationPath, navigationState, error).
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { ScheduleData, Achievement, GeneratePlanReflectionInput, PlanInput } from '@/types';
import { generatePlanReflection } from './generate-plan-reflection';

// Define Schemas for Input and Output
const StudyAssistantChatInputSchema = z.object({
  userQuery: z.string().describe("The user's message or question to the chatbot."),
  currentUserId: z.string().describe("The ID of the currently authenticated user."),
});
export type StudyAssistantChatInput = z.infer<typeof StudyAssistantChatInputSchema>;

const StudyAssistantChatOutputSchema = z.object({
  responseText: z.string().describe("The chatbot's textual response to be displayed to the user."),
  navigationPath: z.string().optional().describe("An optional URL path for frontend navigation (e.g., '/planner', '/analytics?planId=xyz')."),
  navigationState: z.record(z.any()).optional().describe("Optional key-value pairs to be passed as query parameters or state to the navigated page."),
  error: z.string().optional().describe("An error message if the request could not be processed."),
});
export type StudyAssistantChatOutput = z.infer<typeof StudyAssistantChatOutputSchema>;


const PlanOverviewSchema = z.object({
  id: z.string(),
  subjects: z.string(),
  status: z.string(),
  studyDurationDays: z.number(),
  dailyStudyHours: z.number(),
  completionDate: z.string().optional().nullable(),
  updatedAt: z.string(),
});
type PlanOverview = z.infer<typeof PlanOverviewSchema>;

// Tool: Get Plan History
const getPlanHistoryTool = ai.defineTool(
  {
    name: 'getPlanHistoryTool',
    description: 'Fetches a summary of all study plans for the current user. Use this when the user asks about their plans in general or wants a list.',
    inputSchema: z.object({ userId: z.string() }),
    outputSchema: z.array(PlanOverviewSchema).describe("An array of plan overviews, or an empty array if no plans exist."),
  },
  async ({ userId }) => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/plans?userId=${userId}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API Error (${response.status}): ${errorData.error || response.statusText}`);
      }
      const plans: ScheduleData[] = await response.json();
      return plans.map(p => ({
        id: p.id,
        subjects: p.planDetails.subjects,
        status: p.status,
        studyDurationDays: p.planDetails.studyDurationDays,
        dailyStudyHours: p.planDetails.dailyStudyHours,
        completionDate: p.completionDate,
        updatedAt: p.updatedAt
      }));
    } catch (e) {
      console.error('getPlanHistoryTool error:', e);
      return []; // Return empty on error to allow AI to respond gracefully
    }
  }
);

// Tool: Get Specific Plan Data
const getSpecificPlanDataTool = ai.defineTool(
  {
    name: 'getSpecificPlanDataTool',
    description: 'Fetches detailed data for a specific study plan, identified by its ID. Use this when the user refers to a particular plan (e.g., "my math plan", "plan 123"). The AI should try to infer the planId or ask for it if ambiguous.',
    inputSchema: z.object({ planId: z.string().describe("The ID of the plan to fetch."), userId: z.string() }),
    outputSchema: z.union([ScheduleDataSchema, z.null()]).describe("The detailed plan data, or null if not found."),
  },
  async ({ planId, userId }) => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/plans/${planId}?userId=${userId}`);
      if (!response.ok) {
        if (response.status === 404) return null;
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API Error (${response.status}): ${errorData.error || response.statusText}`);
      }
      return await response.json() as ScheduleData;
    } catch (e) {
      console.error('getSpecificPlanDataTool error:', e);
      return null;
    }
  }
);
// Helper Zod schemas for ScheduleData, PlanInput, ScheduleTask, SubTask if not directly importable or too complex.
// For now, we'll use a simplified version or assume they can be implicitly handled by z.any() for tools if needed.
// However, for strong typing, full schemas are better. Let's define them for the tool output.
const SubTaskSchema = z.object({
  id: z.string(),
  text: z.string(),
  completed: z.boolean(),
});
const ScheduleTaskSchema = z.object({
  id: z.string(),
  date: z.string(),
  task: z.string(),
  completed: z.boolean(),
  youtubeSearchQuery: z.string().optional(),
  referenceSearchQuery: z.string().optional(),
  subTasks: z.array(SubTaskSchema).optional(),
  quizScore: z.number().optional(),
  quizAttempted: z.boolean().optional(),
  notes: z.string().optional(),
});
const PlanInputSchema = z.object({
  subjects: z.string(),
  dailyStudyHours: z.number(),
  studyDurationDays: z.number(),
  subjectDetails: z.string().optional(),
  startDate: z.string().optional(),
});
const ScheduleDataSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  scheduleString: z.string(),
  tasks: z.array(ScheduleTaskSchema),
  planDetails: PlanInputSchema,
  status: z.enum(['active', 'completed', 'archived']),
  completionDate: z.string().optional().nullable(),
});


// Tool: Get Achievement Data
const AchievementSchema = z.object({ // Simplified for tool output
    id: z.string(),
    title: z.string(),
    description: z.string(),
    achieved: z.boolean(),
});
const getAchievementDataTool = ai.defineTool(
  {
    name: 'getAchievementDataTool',
    description: 'Fetches the user\'s achievements, streaks, and badge information. Use this for queries about progress, completed goals, or gamification elements.',
    inputSchema: z.object({ userId: z.string() }),
    outputSchema: z.array(AchievementSchema).describe("An array of achievement statuses."),
  },
  async ({ userId }) => {
    // In a real app, this would fetch dynamic achievement data.
    // For this prototype, we'll return a slightly modified static list based on `sampleAchievements` logic.
    // This is a simplified mock. A proper implementation would involve database queries or a dedicated API.
    const sampleAchievements: Achievement[] = [
        { id: "first_plan", title: "Planner Pioneer", description: "Successfully created your first study plan.", icon: () => null, achieved: true, color: "bg-blue-500" },
        { id: "task_initiate", title: "Task Starter", description: "Completed your first task in a study plan.", icon: () => null, achieved: false, color: "bg-green-500" },
    ];
    // This tool would ideally call an API or service that has access to the user's plan data to determine achievement status.
    // For now, it returns a static list, acknowledging its placeholder nature.
    return sampleAchievements.map(({ icon, color, ...rest }) => rest);
  }
);

// Tool: Analyze Plan (using generatePlanReflection)
const AnalyzePlanInputSchema = GeneratePlanReflectionInput; // Reuse existing Zod schema
const AnalyzePlanOutputSchema = z.object({ // Mirrored structure from GeneratePlanReflectionOutput
  overallCompletionRate: z.number().min(0).max(1),
  mainReflection: z.string(),
  consistencyObservation: z.string(),
  suggestionForNextPlan: z.string(),
});

const analyzePlanTool = ai.defineTool(
  {
    name: 'analyzePlanTool',
    description: 'Analyzes a specific study plan (must be completed) and provides reflections, completion rate, and suggestions. Requires the full plan data as input.',
    inputSchema: AnalyzePlanInputSchema,
    outputSchema: AnalyzePlanOutputSchema,
  },
  async (planDataForReflection) => {
    try {
      const reflection = await generatePlanReflection(planDataForReflection);
      return reflection;
    } catch (e) {
      console.error('analyzePlanTool error:', e);
      throw new Error("Failed to generate plan reflection via tool.");
    }
  }
);


// Main Prompt for the Chatbot
const chatPrompt = ai.definePrompt({
  name: 'studyAssistantChatPrompt',
  input: { schema: StudyAssistantChatInputSchema },
  output: { schema: StudyAssistantChatOutputSchema },
  tools: [getPlanHistoryTool, getSpecificPlanDataTool, getAchievementDataTool, analyzePlanTool],
  prompt: `You are StudySmart AI, a friendly and helpful assistant for the StudySmart AI app.
Your goal is to understand user queries, provide information, and help them navigate the app.

User ID: {{{currentUserId}}}
User Query: {{{userQuery}}}

Available Tools:
- getPlanHistoryTool: Use to fetch a list of all user's study plans.
- getSpecificPlanDataTool: Use to get details of a specific plan if the user mentions one (e.g., "my math plan", "plan XYZ"). If the user is vague, you might need to ask for a plan ID or more details. Plan IDs are typically strings like "plan-timestamp-randomstring".
- getAchievementDataTool: Use to retrieve user's achievements and progress badges.
- analyzePlanTool: Use to get an AI reflection on a *completed* study plan. This tool requires the full plan data which you must first fetch using 'getSpecificPlanDataTool'.

Interaction Guidelines:
1.  **Intent Recognition**:
    *   Navigation: If the user wants to go to a page (e.g., "show me achievements", "open planner"), set 'navigationPath' to the correct URL (e.g., "/achievements", "/planner").
    *   Analysis/Insight: If the user asks for analysis (e.g., "how did I do on my last plan?", "analyze plan X"), use tools to get plan data, then 'analyzePlanTool' if applicable. Provide a summary in 'responseText' and set 'navigationPath' to the analytics page (e.g., "/analytics?planId=THE_PLAN_ID").
    *   Information Retrieval: If the user asks for information (e.g., "list my plans", "what are my badges?"), use tools and provide the information in 'responseText'. You can also navigate them if it makes sense (e.g., to "/achievements" after listing badges).
    *   General Chit-Chat: If it's a general greeting or off-topic, respond politely.

2.  **Tool Usage**:
    *   Always pass the 'currentUserId' to tools that require it.
    *   If you need to analyze a plan, first use 'getSpecificPlanDataTool' to fetch its details. Then, if the plan is 'completed', pass its 'planDetails' and 'tasks' to 'analyzePlanTool'.
    *   If a tool returns an error or no data (e.g., plan not found), inform the user gracefully in 'responseText'. Don't set 'navigationPath' if the target data doesn't exist.

3.  **Output Structure**:
    *   `responseText`: Always provide a clear, concise, and friendly text response.
    *   `navigationPath` (optional):
        - "/dashboard"
        - "/planner" or "/planner?planId=PLAN_ID_HERE"
        - "/calendar"
        - "/analytics" or "/analytics?planId=PLAN_ID_HERE"
        - "/achievements"
        - "/settings"
    *   `navigationState` (optional): Use for query parameters. For example, if navigating to analytics for a specific plan: `navigationPath: "/analytics", navigationState: { planId: "THE_PLAN_ID" }`. If navigating to planner to create a new plan after a query like "create a new plan for math": `navigationPath: "/planner", navigationState: { autoFocusSubjects: "Math" }` (the planner page would need to handle this).

4.  **Response Strategy**:
    *   Be proactive. If a user asks for analysis of a plan, provide a summary in chat AND navigate them to the detailed view.
    *   If data is fetched (e.g. list of plans), summarize it in chat. If it's too long, summarize and offer to navigate to where they can see all details.
    *   If a plan ID is needed for a tool and the user query is ambiguous (e.g. "analyze my plan"), ask them to specify which plan or provide its ID. You can list their plans using 'getPlanHistoryTool' to help them choose.
    *   If an error occurs internally or a tool fails, set the 'error' field in the output and provide a user-friendly message in 'responseText'.

Example Interaction:
User: "How did I do on my last completed plan?"
AI Actions:
1. Call 'getPlanHistoryTool' to find completed plans.
2. Identify the most recent completed plan.
3. Call 'getSpecificPlanDataTool' for that plan.
4. Call 'analyzePlanTool' with the plan's data.
AI Output:
{
  "responseText": "Okay, I've analyzed your plan '{{subjects}}'. You achieved an overall completion rate of {{rate}}%. {{mainReflection}}. I'm taking you to the full analytics now.",
  "navigationPath": "/analytics",
  "navigationState": { "planId": "ID_OF_THE_ANALYZED_PLAN" }
}

User: "Open my achievements."
AI Output:
{
  "responseText": "Sure, opening your achievements now!",
  "navigationPath": "/achievements"
}

User: "What was my math plan about?"
AI Actions:
1. Call 'getPlanHistoryTool'. Look for a plan with "Math" in subjects. If multiple, ask for clarification. If one, get its ID.
2. Call 'getSpecificPlanDataTool' with the ID.
AI Output:
{
  "responseText": "Your Math plan (ID: {{planId}}) covered topics like {{topic_summary_from_planDetails.subjectDetails_or_tasks}}. It was scheduled for {{duration}} days at {{hours}} hours/day. Would you like to open it in the planner?",
  "navigationPath": "/planner",
  "navigationState": { "planId": "THE_MATH_PLAN_ID" }
}

Process the user's query now.
`,
});

// The Genkit Flow
const studyAssistantChatFlow = ai.defineFlow(
  {
    name: 'studyAssistantChatFlow',
    inputSchema: StudyAssistantChatInputSchema,
    outputSchema: StudyAssistantChatOutputSchema,
  },
  async (input) => {
    try {
      const { output } = await chatPrompt(input);
      if (!output) {
        return {
          responseText: "Sorry, I couldn't process that. Can you try rephrasing?",
          error: "AI output was null."
        };
      }
      return output;
    } catch (e) {
      console.error("studyAssistantChatFlow error:", e);
      return {
        responseText: "I encountered an issue trying to understand that. Please try again.",
        error: e instanceof Error ? e.message : "Unknown error in flow processing."
      };
    }
  }
);

export async function studyAssistantChat(input: StudyAssistantChatInput): Promise<StudyAssistantChatOutput> {
  return studyAssistantChatFlow(input);
}
