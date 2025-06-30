import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {config} from 'dotenv';
config();

export const ai = genkit({
  plugins: [
    googleAI({apiKey: process.env.GEMINI_API_KEY}), // Use the specific GEMINI_API_KEY
  ],
  // The 'model' option is not valid here in Genkit 1.x and has been removed.
  // Models should be specified directly in the 'ai.generate' or 'prompt' calls.
});
