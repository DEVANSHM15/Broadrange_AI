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
      page: availablePages.describe('The page to navigate to. Must be one of the available lowercase options.'),
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
      system: `You are a friendly and helpful study assistant chatbot for the "Broadrange AI" app.
      Your primary role is to help users navigate the application.
      
      Available pages and their corresponding keywords are:
      - dashboard
      - planner
      - calendar
      - analytics
      - achievements (also known as "Progress Hub")
      - settings

      If the user asks to go to one of these pages, you must use the 'navigateToPage' tool with the correct lowercase keyword. For example, if they say "show me my progress hub", you must call the tool with \`page: 'achievements'\`.
      If the tool is used successfully, respond with a short, friendly confirmation like "Sure, taking you to the Dashboard now." or "Of course, heading to the AI Planner."
      If the user's request is unclear or not related to navigation, provide a helpful, conversational response and state that you can primarily help with navigation.
      Do not make up functionality. Stick to navigation.`,
      prompt: `The user is currently on the "${input.currentPage}" page. The user's request is: "${input.query}"`,
      tools: [navigateToPage],
    });

    // Genkit's `generate` automatically handles the tool-use loop.
    // We check the history for evidence that our tool was called and responded.
    const toolResponsePart = llmResponse.history().find(
      (m) => m.role === 'tool' && m.content[0]?.toolResponse?.name === 'navigateToPage'
    );

    if (toolResponsePart && toolResponsePart.content[0].toolResponse) {
      // The tool was called. The result (`path`) is in the `data` field of the tool response part.
      // The final text from the LLM after seeing the tool result is in `llmResponse.text`.
      const path = (toolResponsePart.content[0].toolResponse.data as any)?.path;
      if (path) {
        return {
          response: llmResponse.text, // The final conversational text from the LLM
          navigateTo: path,
        };
      }
    }

    // If no tool was called, or if the path was not found, just return the text response.
    return {
      response: llmResponse.text,
    };
  }
);

// Export a wrapper function to be called from the client.
export async function askStudyAssistant(input: StudyAssistantChatInput): Promise<StudyAssistantChatOutput> {
  return await studyAssistantChatFlow(input);
}
