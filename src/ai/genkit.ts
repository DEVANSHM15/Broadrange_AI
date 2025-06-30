import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [
    googleAI(), // Use GoogleAI plugin exclusively
  ],
  model: 'googleai/gemini-pro', // Set default model to gemini-pro for better tool use
});
