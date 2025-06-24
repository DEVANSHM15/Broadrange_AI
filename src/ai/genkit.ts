import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [
    googleAI(), // Use GoogleAI plugin exclusively
  ],
  model: 'googleai/gemini-2.0-flash', // Set default model to gemini-2.0-flash
});
