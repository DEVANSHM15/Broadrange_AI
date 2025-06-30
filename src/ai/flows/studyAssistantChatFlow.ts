'use server';
/**
 * @fileOverview A helpful study assistant chatbot with knowledge of the application.
 * - askStudyAssistant - A function that handles a user's chat query.
 * - StudyAssistantChatInput - The input type for the chat function.
 * - StudyAssistantChatOutput - The return type for the chat function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Define the input and output schemas for the chat flow.
export const StudyAssistantChatInputSchema = z.object({
  query: z.string().describe("The user's message to the assistant."),
});
export type StudyAssistantChatInput = z.infer<typeof StudyAssistantChatInputSchema>;

export const StudyAssistantChatOutputSchema = z.object({
  response: z.string().describe("The assistant's text response to the user."),
});
export type StudyAssistantChatOutput = z.infer<typeof StudyAssistantChatOutputSchema>;

// Define the main chat flow.
const studyAssistantChatFlow = ai.defineFlow(
  {
    name: 'studyAssistantChatFlow',
    inputSchema: StudyAssistantChatInputSchema,
    outputSchema: StudyAssistantChatOutputSchema,
  },
  async (input) => {
    try {
      const llmResponse = await ai.generate({
        model: 'googleai/gemini-pro',
        system: `You are a friendly and helpful study assistant chatbot for the "Broadrange AI" application.
Your goal is to answer user questions about how to use the application and explain its features.
Do NOT attempt to navigate or perform actions. Your only function is to provide helpful information.

Here is a summary of the application's features:

**Core Features & Pages:**

*   **Dashboard (\`/dashboard\`):** This is the main landing page after logging in. It gives a quick overview of the user's current study plan, key performance indicators (like completion rate and average quiz scores), and the status of the AI agents.
*   **AI Planner (\`/planner\`):** This is where users create and manage their study plans.
    *   **Creating a Plan:** Users input their subjects (e.g., "Math, History"), how many days they want to study for, and their available daily study hours. The AI then generates a detailed, day-by-day task schedule.
    *   **Managing a Plan:** Once a plan is created, this page shows the full task list and a calendar view. Users can check off tasks, add sub-tasks, take AI-generated quizzes for tasks, and even re-plan their schedule if they fall behind.
*   **Calendar (\`/calendar\`):** This page provides a large, dedicated calendar view of the user's active study plan. It's the best place to focus on daily tasks and mark them as complete.
*   **Analytics (\`/analytics\`):** This page is for reviewing past performance. It shows charts on weekly performance, most productive days, and daily completions. For plans that have been marked as 'completed', the ReflectionAI agent provides a detailed analysis of study consistency and suggestions for the future.
*   **Progress Hub (\`/achievements\`):** This is where users can see all the achievements they've unlocked (like creating their first plan or completing a quiz). It also lists all of their study plans: active, completed, and archived.
*   **Settings (\`/settings\`):** Users can update their personal information (like their name) and configure which AI agents (PlannerBot, ReflectionAI, AdaptiveAI) are enabled.

When a user asks a question, use this information to provide a clear and concise answer.

Example Questions & Answers:
- User: "How do I make a new plan?"
- You: "You can create a new study plan by going to the 'AI Planner' page! Just enter your subjects, how long you want to study for, and your daily study hours, and our AI will generate a schedule for you."

- User: "Where can I see my old plans?"
- You: "You can find all of your past study plans, including active, completed, and archived ones, on the 'Progress Hub' page."

- User: "What is the analytics page for?"
- You: "The Analytics page helps you understand your study habits! It shows charts on your performance and, for completed plans, provides an AI-generated reflection on your consistency and offers suggestions for your next plan."`,
        prompt: input.query,
      });

      return {
        response: llmResponse.text,
      };
    } catch (e) {
      console.error("FATAL Error in studyAssistantChatFlow:", e);
      
      let detailedError = "An unknown error occurred.";
      if (e instanceof Error) {
          detailedError = e.message;
      } else if (typeof e === 'string') {
          detailedError = e;
      } else {
          try {
              detailedError = JSON.stringify(e);
          } catch {
              detailedError = "A non-serializable error occurred."
          }
      }

      // Make the error message more user-friendly but still informative for debugging
      const finalMessage = `I'm sorry, I hit a technical snag. The server reported the following error: "${detailedError}". This might be an issue with the API configuration or a temporary service outage.`;
      
      return {
        response: finalMessage,
      };
    }
  }
);

// Export a wrapper function to be called from the client.
export async function askStudyAssistant(input: StudyAssistantChatInput): Promise<StudyAssistantChatOutput> {
  return await studyAssistantChatFlow(input);
}
