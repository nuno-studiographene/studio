import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  promptDir: './prompts',
  plugins: [
    googleAI({
      apiKey: "AIzaSyBmzEekB-1ViWlBQGAAD1mlzAljiVuBk58",
    }),
  ],
  model: 'googleai/gemini-1.5-flash', // Changed model
});
