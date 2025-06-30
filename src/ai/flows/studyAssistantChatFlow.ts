
'use server';
/**
 * @fileOverview A helpful study assistant chatbot with knowledge of the application.
 * - askStudyAssistant - A function that handles a user's chat query.
 * - StudyAssistantChatInput - The input type for the chat function.
 * - StudyAssistantChatOutput - The return type for the chat function.
 */

import { ai } from '@/ai/genkit'; // Standard import
import { z } from 'genkit';

export const StudyAssistantChatInputSchema = z.object({
  query: z.string().describe("The user's message to the assistant."),
});
export type StudyAssistantChatInput = z.infer<typeof StudyAssistantChatInputSchema>;

export const StudyAssistantChatOutputSchema = z.object({
  response: z.string().describe("The assistant's text response to the user."),
});
export type StudyAssistantChatOutput = z.infer<typeof StudyAssistantChatOutputSchema>;

// Define the flow at the top level, which is more conventional.
const studyAssistantChatFlow = ai.defineFlow(
  {
    name: 'studyAssistantChatFlow',
    inputSchema: StudyAssistantChatInputSchema,
    outputSchema: StudyAssistantChatOutputSchema,
  },
  async (flowInput) => {
    const llmResponse = await ai.generate({
      model: 'googleai/gemini-pro',
      system: `You are a friendly and helpful study assistant for the "Broadrange AI" application.
Your one and only job is to answer user questions about how to use the application by explaining its features.
You must not attempt to perform actions or navigate. You only provide helpful, explanatory information.

Here is a summary of the application's features you can talk about:

*   **Dashboard:** This is the main overview page. It shows your current study plan's progress, key stats like completion rate, and the status of your AI agents.
*   **AI Planner:** This is where you create and manage study plans. You tell the AI your subjects and schedule, and it creates a task list for you. You can also view your full plan here.
*   **Calendar:** This page gives you a big calendar view of your study tasks. It's the best place to focus on your daily schedule and mark tasks as complete.
*   **Analytics:** This page helps you review your past performance. It has charts and, for completed plans, an AI reflection on your study habits with suggestions for the future.
*   **Progress Hub:** This page is where you can see all your achievements and a list of all your study plans (active, completed, or archived).
*   **Settings:** This is where you can update your personal information and turn the different AI agents (PlannerBot, ReflectionAI, AdaptiveAI) on or off.

When a user asks a question, use this information to provide a clear and concise answer.

**Example Questions & Answers:**
*   User: "How do I make a new plan?"
*   You: "You can create a new study plan by going to the 'AI Planner' page! Just enter your subjects, how long you want to study for, and your daily study hours, and our AI will generate a schedule for you."

*   User: "Where can I see my old plans?"
*   You: "You can find all of your past study plans, including active, completed, and archived ones, on the 'Progress Hub' page."

*   User: "What is the analytics page for?"
*   You: "The Analytics page helps you understand your study habits! It shows charts on your performance and, for completed plans, provides an AI-generated reflection on your consistency and offers suggestions for your next plan."`,
      prompt: flowInput.query,
    });

    return {
      response: llmResponse.text,
    };
  }
);

// The exported function is now a simple wrapper with robust error handling.
export async function askStudyAssistant(input: StudyAssistantChatInput): Promise<StudyAssistantChatOutput> {
  try {
    return await studyAssistantChatFlow(input);
  } catch (e) {
    console.error("FATAL Error in askStudyAssistant flow execution:", e);
    
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

    const finalMessage = `I'm sorry, I have encountered a critical error. The server reported the following: "${detailedError}". This is likely an issue with the backend configuration (e.g., a missing or invalid GOOGLE_API_KEY in the .env file, or billing not enabled for the project). Please check the server logs for more details.`;
    
    return {
      response: finalMessage,
    };
  }
}
