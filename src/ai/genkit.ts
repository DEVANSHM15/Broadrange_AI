import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [
    googleAI(), // Use GoogleAI plugin exclusively
  ],
  // The 'model' option is not valid here in Genkit 1.x and has been removed.
  // Models should be specified directly in the 'ai.generate' or 'prompt' calls.
});
