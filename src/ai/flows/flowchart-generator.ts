// FlowchartGenerator.ts
'use server';

/**
 * @fileOverview Flowchart generator AI agent.
 *
 * - generateFlowchart - A function that handles the generation of a flowchart from a user flow description.
 * - FlowchartGeneratorInput - The input type for the generateFlowchart function.
 * - FlowchartGeneratorOutput - The return type for the generateFlowchart function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const FlowchartGeneratorInputSchema = z.object({
  userFlowDescription: z
    .string()
    .describe('The user flow description to generate the flowchart from.'),
  apiOrServerSide: z
    .string()
    .describe('Whether the data is fetched via an API or server-side rendering.'),
  loadersOrSkeletons: z
    .string()
    .describe('Whether loaders or skeletons are used during data fetching.'),
  apiRequestParameters: z
    .string()
    .describe('The parameters in the request URL of the API.'),
  backendDatabaseConnection: z
    .string()
    .describe('How the backend connects to the database, including service details.'),
});
export type FlowchartGeneratorInput = z.infer<typeof FlowchartGeneratorInputSchema>;

const FlowchartGeneratorOutputSchema = z.object({
  flowchartDefinition: z
    .string()
    .describe('The definition of the flowchart in a suitable format (e.g., Mermaid or similar).'),
});
export type FlowchartGeneratorOutput = z.infer<typeof FlowchartGeneratorOutputSchema>;

export async function generateFlowchart(input: FlowchartGeneratorInput): Promise<FlowchartGeneratorOutput> {
  return generateFlowchartFlow(input);
}

const prompt = ai.definePrompt({
  name: 'flowchartGeneratorPrompt',
  input: {
    schema: z.object({
      userFlowDescription: z
        .string()
        .describe('The user flow description to generate the flowchart from.'),
      apiOrServerSide: z
        .string()
        .describe('Whether the data is fetched via an API or server-side rendering.'),
      loadersOrSkeletons: z
        .string()
        .describe('Whether loaders or skeletons are used during data fetching.'),
      apiRequestParameters: z
        .string()
        .describe('The parameters in the request URL of the API.'),
      backendDatabaseConnection: z
        .string()
        .describe('How the backend connects to the database, including service details.'),
    }),
  },
  output: {
    schema: z.object({
      flowchartDefinition: z
        .string()
        .describe('The definition of the flowchart in a suitable format (e.g., Mermaid or similar).'),
    }),
  },
  prompt: `You are an expert software architect that can translate user flows into technical flowcharts.

  Based on the following information, generate a technical flowchart definition.

  User Flow Description: {{{userFlowDescription}}}
  Data Fetching Method: {{{apiOrServerSide}}}
  Loading Indicator: {{{loadersOrSkeletons}}}
  API Request Parameters: {{{apiRequestParameters}}}
  Backend Database Connection: {{{backendDatabaseConnection}}}

  The flowchart definition should be in Mermaid format.
  Ensure that the flowchart accurately reflects the technical steps and data flow involved in implementing the user flow.
  Start the flowchart definition with "flowchart TD" so that it can be rendered correctly by a Mermaid renderer.
  Do not include any explanation or introductory text before or after the Mermaid flowchart definition.
  `,
});

const generateFlowchartFlow = ai.defineFlow<
  typeof FlowchartGeneratorInputSchema,
  typeof FlowchartGeneratorOutputSchema
>(
  {
    name: 'generateFlowchartFlow',
    inputSchema: FlowchartGeneratorInputSchema,
    outputSchema: FlowchartGeneratorOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
