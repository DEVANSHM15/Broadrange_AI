
'use server';
/**
 * @fileOverview A study assistant chatbot flow for navigation.
 * - askStudyAssistant - A function that handles a user's chat query.
 * - StudyAssistantChatInput - The input type for the chat function.
 * - StudyAssistantChatOutput - The return type for the chat function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Define the available pages for navigation.
const availablePages = z.enum(["dashboard", "planner", "calendar", "analytics", "achievements", "settings"]);

// Define the tool for navigation.
const navigateToPage = ai.defineTool(
  {
    name: 'navigateToPage',
    description: 'Navigates the user to a specified page within the application.',
    inputSchema: z.object({
      page: availablePages.describe('The page to navigate to. Must be one of the available options.'),
    }),
    outputSchema: z.object({
      path: z.string().describe('The URL path for the requested page.'),
    }),
  },
  async ({page}) => {
    // Map the page name to a URL path.
    const pathMap: Record<z.infer<typeof availablePages>, string> = {
      dashboard: '/dashboard',
      planner: '/planner',
      calendar: '/calendar',
      analytics: '/analytics',
      achievements: '/achievements',
      settings: '/settings',
    };
    return {path: pathMap[page]};
  }
);

// Define the input and output schemas for the chat flow.
export const StudyAssistantChatInputSchema = z.object({
  query: z.string().describe('The user\'s message to the assistant.'),
  currentPage: z.string().describe('The current page the user is on for context.'),
});
export type StudyAssistantChatInput = z.infer<typeof StudyAssistantChatInputSchema>;

export const StudyAssistantChatOutputSchema = z.object({
  response: z.string().describe('The assistant\'s text response to the user.'),
  navigateTo: z.string().optional().describe('The URL path to navigate to, if requested.'),
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
    const llmResponse = await ai.generate({
      prompt: `You are a friendly and helpful study assistant chatbot for the "Broadrange AI" app.
      Your primary role is to help users navigate the application.
      The user is currently on the "${input.currentPage}" page.

      Available pages are: Dashboard, AI Planner, Calendar, Analytics, Progress Hub (Achievements), and Settings.

      If the user asks to go to a page, use the 'navigateToPage' tool to find the correct path.
      If the tool is used successfully, respond with a confirmation like "Sure, taking you to the [Page Name] now."
      If the user's request is unclear or not related to navigation, provide a helpful, conversational response and state that you can primarily help with navigation.
      Do not make up functionality. Stick to navigation.

      User's request: "${input.query}"`,
      tools: [navigateToPage],
      model: 'googleai/gemini-2.0-flash',
    });

    const toolResponse = llmResponse.toolRequest?.responses[0];
    if (toolResponse && toolResponse.name === 'navigateToPage') {
      const path = toolResponse.response.path;
      // Get the final text response from the LLM after it has processed the tool's output.
      const finalResponse = await ai.generate({
        prompt: `You are a helpful study assistant. A navigation action was just completed to path '${path}'. Provide a short, friendly confirmation message to the user.`,
        model: 'googleai/gemini-2.0-flash',
      });
      return {
        response: finalResponse.text,
        navigateTo: path,
      };
    }

    return {
      response: llmResponse.text,
    };
  }
);

// Export a wrapper function to be called from the client.
export async function askStudyAssistant(input: StudyAssistantChatInput): Promise<StudyAssistantChatOutput> {
  return await studyAssistantChatFlow(input);
}
