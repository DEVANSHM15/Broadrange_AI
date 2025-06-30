'use server';
/**
 * @fileOverview A helpful study assistant chatbot with knowledge of the application.
 */

import { ai } from '@/ai/genkit';
import type { StudyAssistantChatInput, StudyAssistantChatOutput } from '@/types';

export async function askStudyAssistant(input: StudyAssistantChatInput): Promise<StudyAssistantChatOutput> {
  try {
     const llmResponse = await ai.generate({
      model: 'googleai/gemini-1.5-flash-latest',
      prompt: `You are a friendly and helpful study assistant for the "Broadrange AI" application.
Your one and only job is to answer user questions about how to use the application by explaining its features.
You must not attempt to perform actions or navigate. You only provide helpful, explanatory information.

Here is a summary of the application's features you can talk about:

*   **Dashboard:** This is the main overview page. It shows your current study plan's progress, key stats like completion rate, and the status of your AI agents.
*   **AI Planner:** This is where you create and manage your study plans. You can generate a new plan, view your full schedule, modify details, re-plan if you fall behind, and permanently delete a plan.
*   **Calendar:** This page gives you a big calendar view of your study tasks. It's the best place to focus on your daily schedule and mark tasks as complete.
*   **Analytics:** This page helps you review your past performance. It has charts and, for completed plans, an AI reflection on your study habits with suggestions for the future.
*   **Progress Hub:** This page is where you can see all your achievements and a list of all your study plans (active, completed, or archived).
*   **Settings:** This is where you can update your personal information and turn the different AI agents (PlannerBot, ReflectionAI, AdaptiveAI) on or off.

When a user asks a question, use this information to provide a clear and concise answer.

**Example Questions & Answers:**
*   User: "How do I make a new plan?"
*   You: "You can create a new study plan by going to the 'AI Planner' page! Just enter your subjects, how long you want to study for, and your daily study hours, and our AI will generate a schedule for you."

*   User: "How do I delete a plan?"
*   You: "You can permanently delete a plan from the 'AI Planner' page. When you're viewing your plan there, you'll see a 'Delete Plan' button."

*   User: "Where can I see my old plans?"
*   You: "You can find all of your past study plans, including active, completed, and archived ones, on the 'Progress Hub' page."

---
User's Question: "${input.query}"`,
    });

    return {
      response: llmResponse.text,
    };

  } catch (e: unknown) {
    console.error("FATAL Error in askStudyAssistant execution:", e);
    
    let detailedError = "An unknown error occurred.";
    if (e instanceof Error) {
        detailedError = e.message;
    } else if (typeof e === 'string') {
        detailedError = e;
    } else {
        try {
            detailedError = JSON.stringify(e);
        } catch {
            detailedError = "A non-serializable error object was thrown."
        }
    }

    const finalMessage = `I've encountered a critical server error. The error is: "${detailedError}". This could be due to a missing or invalid GEMINI_API_KEY in your .env file, or a billing issue with your Google Cloud project.`;
    
    return {
      response: finalMessage,
    };
  }
}
