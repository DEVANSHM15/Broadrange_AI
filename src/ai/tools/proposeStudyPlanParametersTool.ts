
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
    subjectDetails: z.string().optional().describe("A generated, brief, high-level list of important topics or chapters for the extracted subjects. This should be formatted as a simple string, including the original user query for context followed by a 'Syllabus:' section. Example: 'User wants a plan for DBMS, CN, DSA... First exam on Aug 28. Syllabus: DBMS: Normalization, SQL. CN: OSI Model, TCP/IP. DSA: Arrays, Trees.'."),
});

export const proposeStudyPlanParameters = ai.defineTool(
  {
    name: 'proposeStudyPlanParameters',
    description: "Analyzes a user's query to determine if they want a study plan and extracts/generates the necessary parameters (subjects, hours, duration, and a high-level syllabus). Use this tool when a user asks to create, make, or generate a study plan.",
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
        prompt: `You are an expert curriculum planner. Analyze the user query to determine if they want a study plan. If so, extract parameters and generate a basic syllabus.

        Current Date: {{{currentDate}}}

        User Query: "{{{userQuery}}}"

        Your tasks:
        1.  **Intent**: Determine if the user's intent is to create a study plan. If it's a clear "yes", set 'shouldCreatePlan' to true. For ambiguous queries or general questions, set it to false.
        2.  **Subjects**: Extract the subjects. If the user implies an order or priority (e.g., "my first exam is X"), assign priorities with lower numbers being higher priority, like "(1)".
        3.  **Daily Hours**: Extract the daily study hours. If not mentioned, default to 3.
        4.  **Duration**: If the user gives a target date, calculate the 'studyDurationDays' from the 'currentDate'. If they just say "for 30 days," use that. If no duration is mentioned, default to 30.
        5.  **Generate Syllabus**: For the 'subjectDetails' field, first summarize the user's request in one or two sentences. Then, on a new line, write "Syllabus:". Then, generate a brief, high-level list of essential topics or chapters for the extracted subjects, assuming the user has little prior knowledge. Format it as a simple string with newlines. For example: 'User wants a plan for DBMS, CN, DSA... First exam on Aug 28.\\nSyllabus:\\nDBMS: Intro to Databases, SQL Basics, Normalization (1NF, 2NF, 3NF).\\nComputer Networks: OSI Model, TCP/IP, DNS.\\nDSA: Big O Notation, Arrays, Linked Lists, Trees.'
        6.  **Output**: Return the results in the specified JSON format.
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

