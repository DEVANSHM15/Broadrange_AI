
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
      console.log('[ChatbotTool:getPlanHistoryTool] Using baseUrl:', baseUrl);
      const response = await fetch(`${baseUrl}/api/plans?userId=${userId}`);

      if (!response.ok) {
        let errorDetail = `API Error (${response.status}): ${response.statusText}`;
        try {
          const text = await response.text();
          console.error('[ChatbotTool:getPlanHistoryTool] Error response text:', text.substring(0, 500));
          const errorData = JSON.parse(text);
          if (errorData.error) {
            errorDetail = `API Error (${response.status}): ${errorData.error}${errorData.details ? ' - ' + errorData.details : ''}`;
          }
        } catch (e) {
          console.error('[ChatbotTool:getPlanHistoryTool] Failed to parse error response as JSON or read text.');
        }
        throw new Error(errorDetail);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await response.text().catch(() => "Could not get response text.");
        console.error('[ChatbotTool:getPlanHistoryTool] Expected JSON, got:', contentType, 'Response snippet:', responseText.substring(0, 200));
        throw new Error(`Expected JSON response from /api/plans, but got ${contentType}.`);
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
      console.error('[ChatbotTool:getPlanHistoryTool] Tool execution error:', e);
      throw e;
    }
  }
);

// Helper Zod schemas for ScheduleData
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
      console.log('[ChatbotTool:getSpecificPlanDataTool] Using baseUrl:', baseUrl, 'for planId:', planId);
      const response = await fetch(`${baseUrl}/api/plans/${planId}?userId=${userId}`);

      if (!response.ok) {
        if (response.status === 404) return null;
        let errorDetail = `API Error (${response.status}): ${response.statusText}`;
        try {
          const text = await response.text();
          console.error('[ChatbotTool:getSpecificPlanDataTool] Error response text:', text.substring(0, 500));
          const errorData = JSON.parse(text);
          if (errorData.error) {
            errorDetail = `API Error (${response.status}): ${errorData.error}${errorData.details ? ' - ' + errorData.details : ''}`;
          }
        } catch (e) {
           console.error('[ChatbotTool:getSpecificPlanDataTool] Failed to parse error response as JSON or read text.');
        }
        throw new Error(errorDetail);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await response.text().catch(() => "Could not get response text.");
        console.error('[ChatbotTool:getSpecificPlanDataTool] Expected JSON, got:', contentType, 'Response snippet:', responseText.substring(0, 200));
        throw new Error(`Expected JSON response from /api/plans/[planId], but got ${contentType}.`);
      }
      return await response.json() as ScheduleData;
    } catch (e) {
      console.error('[ChatbotTool:getSpecificPlanDataTool] Tool execution error:', e);
      throw e;
    }
  }
);


// Tool: Get Achievement Data
const AchievementSchema = z.object({
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
    // This tool is currently mocked. In a real app, it would call an API.
    console.log('[ChatbotTool:getAchievementDataTool] Called for userId:', userId);
    const sampleAchievements: Achievement[] = [
        { id: "first_plan", title: "Planner Pioneer", description: "Successfully created your first study plan.", icon: () => null, achieved: true, color: "bg-blue-500" },
        { id: "task_initiate", title: "Task Starter", description: "Completed your first task in a study plan.", icon: () => null, achieved: false, color: "bg-green-500" },
    ];
    // Simulating an API call that might determine achievement status based on user data.
    // For now, it returns a static list, acknowledging its placeholder nature.
    return sampleAchievements.map(({ icon, color, ...rest }) => rest);
  }
);

// Tool: Analyze Plan (using generatePlanReflection)
const AnalyzePlanInputSchema = GeneratePlanReflectionInput;
const AnalyzePlanOutputSchema = z.object({
  overallCompletionRate: z.number().min(0).max(1),
  mainReflection: z.string(),
  consistencyObservation: z.string(),
  suggestionForNextPlan: z.string(),
});

const analyzePlanTool = ai.defineTool(
  {
    name: 'analyzePlanTool',
    description: 'Analyzes a specific study plan (must be completed) and provides reflections, completion rate, and suggestions. Requires the full plan data as input, which should first be fetched using getSpecificPlanDataTool.',
    inputSchema: AnalyzePlanInputSchema,
    outputSchema: AnalyzePlanOutputSchema,
  },
  async (planDataForReflection) => {
    try {
      console.log('[ChatbotTool:analyzePlanTool] Called with plan details for subjects:', planDataForReflection.planDetails.subjects);
      const reflection = await generatePlanReflection(planDataForReflection);
      return reflection;
    } catch (e) {
      console.error('[ChatbotTool:analyzePlanTool] Tool execution error:', e);
      throw new Error(`Failed to generate plan reflection via tool: ${(e as Error).message}`);
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
- \\\`getPlanHistoryTool\\\`: Use to fetch a list of all user's study plans.
- \\\`getSpecificPlanDataTool\\\`: Use to get details of a specific plan if the user mentions one (e.g., "my math plan", "plan XYZ"). If the user is vague, you might need to ask for a plan ID or more details. Plan IDs are typically strings like "plan-timestamp-randomstring".
- \\\`getAchievementDataTool\\\`: Use to retrieve user's achievements and progress badges.
- \\\`analyzePlanTool\\\`: Use to get an AI reflection on a *completed* study plan. This tool requires the full plan data as input. You MUST first fetch the plan data using \\\`getSpecificPlanDataTool\\\` and ensure its \\\`status\\\` is \\\`completed\\\` before calling \\\`analyzePlanTool\\\`. If the plan is not completed, or data cannot be fetched, inform the user appropriately.

Interaction Guidelines:
1.  **Intent Recognition**:
    *   Navigation: If the user wants to go to a page (e.g., "show me achievements", "open planner"), set \\\`navigationPath\\\` to the correct URL (e.g., "/achievements", "/planner").
    *   Analysis/Insight: If the user asks for analysis (e.g., "how did I do on my last plan?", "analyze plan X"), use tools to get plan data, then \\\`analyzePlanTool\\\` if applicable (plan must be completed). Provide a summary in \\\`responseText\\\` and set \\\`navigationPath\\\` to the analytics page (e.g., "/analytics?planId=THE_PLAN_ID&autoShowReflection=true").
    *   Information Retrieval: If the user asks for information (e.g., "list my plans", "what are my badges?"), use tools and provide the information in \\\`responseText\\\`. You can also navigate them if it makes sense (e.g., to "/achievements" after listing badges, potentially with a query param like "?focusAchievementId=first_plan" if you want to highlight something specific).
    *   General Chit-Chat: If it's a general greeting or off-topic, respond politely.

2.  **Tool Usage**:
    *   Always pass the \\\`currentUserId\\\` to tools that require it (getPlanHistoryTool, getSpecificPlanDataTool, getAchievementDataTool).
    *   If you need to analyze a plan, first use \\\`getSpecificPlanDataTool\\\` to fetch its details. Then, if the plan's \\\`status\\\` is \\\`completed\\\`, pass its \\\`planDetails\\\` and \\\`tasks\\\` to \\\`analyzePlanTool\\\`.
    *   If a tool returns an error or no data (e.g., plan not found, or an error message from the tool like "API Error..."), inform the user gracefully in \\\`responseText\\\`. Do not attempt to use a tool if its prerequisite data fetch failed. Don't set \\\`navigationPath\\\` if the target data doesn't exist. If a tool call fails internally (e.g., network issue for the tool), this will be communicated to you. Respond by indicating you couldn't retrieve the information.

3.  **Output Structure**:
    *   \\\`responseText\\\`: Always provide a clear, concise, and friendly text response.
    *   \\\`navigationPath\\\` (optional): Valid paths include "/dashboard", "/planner", "/planner?planId=PLAN_ID_HERE", "/calendar", "/analytics", "/analytics?planId=PLAN_ID_HERE", "/achievements", "/settings".
    *   \\\`navigationState\\\` (optional): Use for query parameters. Examples:
        - For analytics: \\\`navigationPath: "/analytics", navigationState: { planId: "THE_PLAN_ID", autoShowReflection: "true" }\\\`
        - For planner: \\\`navigationPath: "/planner", navigationState: { planId: "THE_PLAN_ID" }\\\` or \\\`navigationState: { autoFocusSubjects: "Math" }\\\`
        - For achievements: \\\`navigationPath: "/achievements", navigationState: { focusAchievementId: "first_plan", focusPlanId: "plan_xyz" }\\\` (use these sparingly)
    *   \\\`error\\\` (optional): If you, the AI, determine you cannot fulfill the request or if a tool indicated an error, briefly describe it here. The user will see this in \\\`responseText\\\`.

4.  **Response Strategy**:
    *   Be proactive. If a user asks for analysis of a plan, provide a summary in chat AND navigate them to the detailed view with \\\`autoShowReflection=true\\\`.
    *   If data is fetched (e.g. list of plans), summarize it in chat. If it's too long, summarize and offer to navigate to where they can see all details.
    *   If a plan ID is needed for a tool and the user query is ambiguous (e.g. "analyze my plan"), ask them to specify which plan or provide its ID. You can list their plans using \\\`getPlanHistoryTool\\\` to help them choose.
    *   If a tool itself reports an error during its execution (this information will be passed back to you), convey this to the user in a friendly way in \\\`responseText\\\` and set the \\\`error\\\` field in your output. For example, if \\\`getPlanHistoryTool\\\` fails, \\\`responseText\\\` could be "I'm having trouble accessing your plan history right now. Please try again in a few moments." and \\\`error\\\` could be "getPlanHistoryTool failed".

Example Interaction (Tool Error):
User: "List my plans"
(Internally, getPlanHistoryTool fails and reports "API Error (500): Database connection failed")
AI Output:
{
  "responseText": "I'm sorry, I couldn't fetch your plan history at the moment due to a server issue. Please try again later.",
  "error": "getPlanHistoryTool failed: API Error (500): Database connection failed"
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
        console.error("[studyAssistantChatFlow] AI output was null for input:", input);
        return {
          responseText: "Sorry, I couldn't process that. The AI assistant didn't return a response.",
          error: "AI output was null."
        };
      }
      // If a tool threw an error and the AI included it in 'output.error', it will be passed through.
      // If 'output.error' is set, 'output.responseText' should ideally reflect this error too.
      if (output.error) {
        console.warn("[studyAssistantChatFlow] AI indicated an error in its output:", output.error, "for input:", input);
      }
      return output;
    } catch (e) {
      // This catches errors from tools that weren't caught and handled by the AI model,
      // or errors in the flow logic itself (e.g., if chatPrompt() call itself fails).
      console.error("[studyAssistantChatFlow] Unhandled error during flow execution:", e, "for input:", input);
      let errorMessage = "An internal error occurred while processing your request.";
      if (e instanceof Error) {
        errorMessage = e.message.includes("API Error") || e.message.includes("Expected JSON")
          ? `There was a problem fetching data internally: ${e.message.substring(0, 200)}`
          : `An internal error occurred: ${e.message.substring(0, 200)}`;
      }
      return {
        responseText: "I'm sorry, but I encountered an unexpected issue and couldn't complete your request. Please try again later.",
        error: errorMessage
      };
    }
  }
);

export async function studyAssistantChat(input: StudyAssistantChatInput): Promise<StudyAssistantChatOutput> {
  return studyAssistantChatFlow(input);
}

