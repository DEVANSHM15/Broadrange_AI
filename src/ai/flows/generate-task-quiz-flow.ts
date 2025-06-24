
'use server';
/**
 * @fileOverview Generates a short multiple-choice quiz for a given study task.
 *
 * - generateTaskQuiz - A function that creates a quiz for a task.
 * - GenerateTaskQuizInput - The input type (task text, subject context).
 * - GenerateTaskQuizOutput - The return type (quiz as JSON string).
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { GenerateTaskQuizInput, GenerateTaskQuizOutput, QuizQuestion } from '@/types'; // Import types
export type { GenerateTaskQuizInput, GenerateTaskQuizOutput, QuizQuestion } from '@/types'; // Re-export types

const GenerateTaskQuizInputSchema = z.object({
  taskText: z.string().describe('The specific study task or topic for which to generate a quiz.'),
  subjectContext: z.string().describe('The broader subject or chapter context for the task, e.g., "Physics - Kinematics" or "History - World War II Causes".'),
});

// Schema for a single quiz question - ensure the AI generates this structure
const QuizQuestionSchema = z.object({
    id: z.string().describe("A unique identifier for this question (e.g., 'q1', 'q2')."),
    questionText: z.string().describe("The text of the multiple-choice question."),
    options: z.array(z.string()).min(3).max(5).describe("An array of 3 to 5 answer options as strings."),
    correctOptionIndex: z.number().int().min(0).describe("The 0-based index of the correct answer in the 'options' array."),
});

const GenerateTaskQuizOutputSchema = z.object({
  quizJson: z.string().describe(
    "A JSON string representing an array of 3-5 quiz questions. Each question object must conform to the QuizQuestionSchema: {id: string, questionText: string, options: string[], correctOptionIndex: number}. Example: '[{\"id\": \"q1\", \"questionText\": \"What is 2+2?\", \"options\": [\"3\", \"4\", \"5\"], \"correctOptionIndex\": 1}]'"
  ),
});

export async function generateTaskQuiz(
  input: GenerateTaskQuizInput
): Promise<GenerateTaskQuizOutput> {
  return generateTaskQuizFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateTaskQuizPrompt',
  input: {schema: GenerateTaskQuizInputSchema},
  output: {schema: GenerateTaskQuizOutputSchema},
  prompt: `You are an AI Quiz Generator for students. Your task is to create a short, relevant multiple-choice quiz based on the provided study task and subject context.

Study Task: {{{taskText}}}
Subject Context: {{{subjectContext}}}

Instructions:
1.  Generate 3 to 5 multiple-choice questions.
2.  Each question should directly relate to the given 'Study Task' and 'Subject Context'.
3.  For each question, provide 3 to 5 plausible answer options. One option must be correct.
4.  Indicate the correct answer using a 0-based index.
5.  If you are asked to generate a quiz for a similar task or context again, try to vary the questions or focus on slightly different aspects to provide a fresh assessment.
6.  Your output for 'quizJson' MUST be a valid JSON string that parses into an array of JavaScript objects. Each object must follow this structure:
    {
      "id": "q_unique_id", // e.g., "q1", "q2"
      "questionText": "Your question here...",
      "options": ["Option A", "Option B", "Option C", "Option D (optional)"],
      "correctOptionIndex": 0 // (0 for Option A, 1 for B, etc.)
    }
    Ensure the entire array is a single JSON string.

Example of a single question object in the JSON array:
{"id": "q1_kinematics_velocity", "questionText": "What is the standard unit of velocity?", "options": ["m/s^2", "m/s", "kg", "N"], "correctOptionIndex": 1}

Generate the quiz now.
`,
  config: { // Loosen safety settings slightly if quiz generation is blocked for educational content
    safetySettings: [
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ],
  },
});

const generateTaskQuizFlow = ai.defineFlow(
  {
    name: 'generateTaskQuizFlow',
    inputSchema: GenerateTaskQuizInputSchema,
    outputSchema: GenerateTaskQuizOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output || !output.quizJson) {
      throw new Error('AI failed to generate quiz JSON.');
    }
    // Basic validation that the output is parsable JSON and an array
    try {
      const parsedQuiz = JSON.parse(output.quizJson);
      if (!Array.isArray(parsedQuiz)) {
        throw new Error('Generated quizJson is not an array.');
      }
      // Could add more detailed validation against QuizQuestionSchema here if needed
    } catch (e) {
      console.error("Generated quizJson is not valid JSON:", e);
      throw new Error(`AI returned invalid JSON for the quiz. Details: ${(e as Error).message}`);
    }
    return output;
  }
);
