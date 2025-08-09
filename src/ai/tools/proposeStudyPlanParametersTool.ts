
'use server';
/**
 * @fileOverview A Genkit tool for interpreting a user's free-form text to propose study plan parameters.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { format, differenceInDays, startOfToday } from 'date-fns';

const ProposeStudyPlanInputSchema = z.object({
  userQuery: z.string().describe("The user's full, original query about creating a study plan."),
  currentDate: z.string().describe("The current date in YYYY-MM-DD format, to be used as a reference for calculating durations."),
});

const ProposeStudyPlanOutputSchema = z.object({
    shouldCreatePlan: z.boolean().describe("Set to true if the user's query is a clear request to create a study plan. Otherwise, set to false."),
    subjects: z.string().optional().describe("The comma-separated list of subjects extracted from the query. Include priority in parenthesis if mentioned, e.g., 'Math (1), Physics (2)'."),
    dailyStudyHours: z.number().optional().describe("The number of daily study hours mentioned."),
    studyDurationDays: z.number().int().optional().describe("The total duration of the study plan in days. Calculate this if the user provides a target date."),
    subjectDetails: z.string().optional().describe("Any specific topics, chapters, or details the user mentioned about the subjects."),
});

export const proposeStudyPlanParameters = ai.defineTool(
  {
    name: 'proposeStudyPlanParameters',
    description: "Analyzes a user's query to determine if they want to create a study plan and extracts the necessary parameters (subjects, hours, duration). Use this tool when a user asks to create, make, or generate a study plan.",
    inputSchema: ProposeStudyPlanInputSchema,
    outputSchema: ProposeStudyPlanOutputSchema,
  },
  async (input) => {
    // This tool now acts as a passthrough to an LLM prompt for intelligent extraction.
    const extractionPrompt = ai.definePrompt({
        name: 'extractPlanParametersPrompt',
        input: { schema: ProposeStudyPlanInputSchema },
        output: { schema: ProposeStudyPlanOutputSchema },
        model: 'googleai/gemini-1.5-flash-latest',
        prompt: `Analyze the following user query to determine if they want a study plan. If they do, extract the parameters.

        Current Date: {{{currentDate}}}

        User Query: "{{{userQuery}}}"

        Your tasks:
        1.  Read the query and determine if the user's intent is to create a study plan. If it's a clear "yes", set 'shouldCreatePlan' to true. For ambiguous queries or general questions, set it to false.
        2.  Extract the subjects. If the user implies an order or priority (e.g., "my first exam is X"), assign priorities with lower numbers being higher priority, like "(1)".
        3.  Extract the daily study hours.
        4.  If the user gives a target date or a duration, calculate the 'studyDurationDays' from the 'currentDate'. If they say "until August 28th" and today is July 28th, the duration is 31 days. If they just say "for 30 days," use that.
        5.  Extract any specific details about the subjects (chapters, topics, prior knowledge level).
        6.  Return the results in the specified JSON format.
        `,
    });

    const { output } = await extractionPrompt(input);
    return output!;
  }
);


// Wrapper function for the frontend to call, which abstracts the tool execution.
// This is not a tool itself, but a server action that uses a tool.
export async function getProposedPlanParameters(userQuery: string): Promise<z.infer<typeof ProposeStudyPlanOutputSchema>> {
    const today = startOfToday();
    const currentDate = format(today, 'yyyy-MM-dd');
    
    // The 'tool' function is the one defined with `ai.defineTool`. We call it directly.
    const result = await proposeStudyPlanParameters({ userQuery, currentDate });

    return result;
}
