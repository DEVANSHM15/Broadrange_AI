
'use server';
/**
 * @fileOverview A helpful study assistant chatbot with knowledge of the application.
 */

import { ai } from '@/ai/genkit';
import type { StudyAssistantChatInput, StudyAssistantChatOutput } from '@/types';
import { marked } from 'marked';
import { z } from 'zod';
import { getCurrentStudyPlan } from '@/ai/tools/getCurrentStudyPlanTool';
import { proposeStudyPlanParameters } from '@/ai/tools/proposeStudyPlanParametersTool';
import { proposeReplan } from '@/ai/tools/proposeReplanTool'; // Import the new replan tool


const HistoryItemSchema = z.object({
  role: z.enum(['user', 'model']),
  parts: z.array(z.object({ text: z.string() })),
});

const StudyAssistantChatInputSchema = z.object({
    query: z.string(),
    userId: z.string(), // Added userId to be passed to the tool
    history: z.array(HistoryItemSchema),
});


export async function askStudyAssistant(input: StudyAssistantChatInput): Promise<StudyAssistantChatOutput> {
  try {
     const llmResponse = await ai.generate({
      model: 'googleai/gemini-1.5-flash-latest',
      tools: [getCurrentStudyPlan, proposeStudyPlanParameters, proposeReplan], // Add the new replan tool
      toolConfig: {
        mode: 'auto',
      },
      history: input.history,
      prompt: `You are a friendly and helpful study assistant for this application.
Your primary job is to answer user questions about how to use the application by explaining its features, or to help them take actions.
You must not attempt to perform actions or navigate on your own. You provide helpful, explanatory information, or use tools to facilitate user actions.
**IMPORTANT:** Your response MUST be in well-formatted Markdown. Use bullet points, bold text, and paragraphs to make your explanations clear and easy to read.

**User Information:**
- The current user's ID is: ${input.userId}

**Tool Usage:**

1.  **getCurrentStudyPlan Tool**:
    - If the user asks about their current plan, progress, what's next, quiz scores, or similar direct questions about their personal schedule ("how am I doing?", "what is my progress?"), you MUST use this tool. Pass the user's ID to this tool.
    - Based on the tool's output, formulate a helpful and concise answer. 
    - If 'hasActivePlan' is false, tell the user they don't have an active plan and suggest creating one.
    - If it's true, summarize the plan details, progress, and average quiz score. Mention the 'firstUncompletedTask' to tell them what's next. Suggest they visit the dashboard for a visual overview.
    - Example progress response: "You're making great progress! You've completed X out of Y tasks (${'progress.percentage'}%). Your average quiz score is ${'progress.averageQuizScore'}%. ${'firstUncompletedTask'}. For a more detailed view, head over to the [Dashboard](/dashboard)."

2.  **proposeStudyPlanParameters Tool**:
    - If the user expresses clear intent to **create a new study plan** (e.g., "make me a plan for...", "I want to study...", "how should I study for..."), you MUST use this tool.
    - Pass the user's full query to this tool.
    - The tool will return a JSON object with parameters. If 'shouldCreatePlan' is true, formulate a response that includes a special link.
    - **Response Format for Plan Creation**: Your response MUST include a Markdown link formatted like this: \`[Verify & Create Plan](/planner?subjects=SUBJECTS&duration=DURATION&hours=HOURS&details=DETAILS)\`
    - Replace SUBJECTS, DURATION, HOURS, and DETAILS with the URL-encoded values you received from the tool.
    - Example response: "I can help with that! I've prepared a plan based on your request. Please [Verify & Create Plan](/planner?subjects=Computer%20Science&duration=30&hours=2) to review the details and start."

3.  **proposeReplan Tool**:
    - If the user indicates they have fallen behind, missed days, or want to reschedule their **existing active plan** (e.g., "I missed 3 days", "reschedule my tasks", "I need to catch up"), you MUST use this tool.
    - This tool requires the user's ID and their original query.
    - The tool will automatically fetch the current plan, run the adaptive re-planning AI, and save the new schedule.
    - **Response Format for Re-planning**: Based on the tool's output, inform the user that the plan has been updated.
    - Example response: "I've adjusted your schedule to help you catch up. I've rescheduled your remaining tasks over the next few days. You can see the updated plan on your [Calendar](/calendar)." If the tool returns an error, inform the user what went wrong.

4.  **General Questions**:
    - For all other questions about app features, answer based on the information below.

**Application Feature Summary:**

*   **Dashboard**: Your main hub. It shows your current plan's progress, key stats like completion rate and average quiz score, and the status of your AI agents. You can also access the **Pomodoro Timer** from here to start focused study sessions.
*   **AI Planner**: The heart of the app. Here you can:
    *   **Create** a new, personalized study plan.
    *   **View** your full plan on a calendar.
    *   **Modify** the plan's core details.
    *   **Re-plan** if you fall behind using the AdaptiveAI feature.
    *   **Delete** a plan permanently.
    *   **Mark** a plan as completed.
*   **Calendar**: A dedicated large calendar view for your daily tasks. On this page, you can:
    *   Mark tasks as **complete**.
    *   Break down tasks into smaller **sub-tasks**.
    *   Take an **AI-generated quiz** for any task.
    *   **Log a manual score** for a task.
    *   Add personal **notes** to a task.
*   **Analytics**: Review your performance with detailed charts on trends, productive days, and a monthly activity heatmap. For completed plans, ReflectionAI provides a detailed analysis of your study habits and suggestions for improvement.
*   **Progress Hub (Achievements)**: See all your earned achievements. This page also lists all your study plans (active, completed, and archived), allowing you to review them.
*   **Settings**: Customize your experience. You can update your personal information, change the app's theme (light/dark), and enable or disable the individual AI agents (PlannerBot, ReflectionAI, AdaptiveAI).
*   **Pomodoro Timer**: A tool to help you focus. You can set focus and break intervals to manage your study sessions effectively. It's accessible from the Dashboard.

---
Current User Question: "${input.query}"`,
    });

    const rawText = llmResponse.text;
    const htmlResponse = marked.parse(rawText) as string;

    return {
      response: htmlResponse,
    };

  } catch (e: unknown) {
    console.error("Error in askStudyAssistant execution:", e);
    
    let detailedError = "An unknown error occurred.";
    if (e instanceof Error) {
        detailedError = e.message;
    } else if (typeof e === 'string') {
        detailedError = e;
    }

    if (typeof detailedError === 'string' && (detailedError.includes('429') || detailedError.toLowerCase().includes('quota'))) {
      const htmlError = marked.parse("It looks like I'm getting a lot of requests right now. Please try again in a minute. This is a temporary limit on the free plan.") as string;
      return { response: htmlError };
    }
    
    try {
        detailedError = JSON.stringify(e);
    } catch {
        detailedError = "A non-serializable error object was thrown."
    }

    const finalMessage = `I've encountered a critical server error. Please check your setup. \n\n**Error:** \`\`\`${detailedError}\`\`\` \n\nThis could be due to a missing or invalid GEMINI_API_KEY in your .env file, or billing not being enabled for your Google Cloud project.`;
    const finalHtmlError = marked.parse(finalMessage) as string;
    
    return {
      response: finalHtmlError,
    };
  }
}
