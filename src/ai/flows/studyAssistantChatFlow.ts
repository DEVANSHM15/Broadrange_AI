
'use server';
/**
 * @fileOverview A helpful study assistant chatbot with knowledge of the application.
 */

import { ai } from '@/ai/genkit';
import type { StudyAssistantChatInput, StudyAssistantChatOutput } from '@/types';
import { marked } from 'marked';
import { z } from 'zod';
import { getCurrentStudyPlan } from '@/ai/tools/getCurrentStudyPlanTool';


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
      tools: [getCurrentStudyPlan],
      toolConfig: {
        // Force the model to use the tool if the user asks about their plan
        // This is a simple example; more complex logic could be used
        mode: 'auto',
      },
      history: input.history,
      prompt: `You are a friendly and helpful study assistant for this application.
Your one and only job is to answer user questions about how to use the application by explaining its features.
You must not attempt to perform actions or navigate. You only provide helpful, explanatory information.
**IMPORTANT:** Your response MUST be in well-formatted Markdown. Use bullet points, bold text, and paragraphs to make your explanations clear and easy to read.

**User Information:**
- The current user's ID is: ${input.userId}

**Tool Usage:**
- If the user asks about their current plan, progress, what's next, or similar direct questions about their personal schedule, you MUST use the 'getCurrentStudyPlan' tool. Pass the user's ID to this tool.
- Based on the tool's output, formulate a helpful and concise answer. For example, if 'hasActivePlan' is false, tell the user they don't have an active plan and suggest creating one. If it's true, summarize the plan details and progress.
- For all other questions about app features, answer based on the information below.

**Application Feature Summary:**

*   **Dashboard**: Your main hub. It shows your current plan's progress, key stats like completion rate and average quiz score, and the status of your AI agents. You can also access the **Pomodoro Timer** from here to start focused study sessions.
*   **AI Planner**: The heart of the app. Here you can:
    *   **Create** a new, personalized study plan by providing your subjects, study duration, and daily hours.
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
