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

  Instructions for Mermaid Flowchart Definition:
  1.  The flowchart definition MUST be in valid Mermaid flowchart syntax.
  2.  Start the definition with "flowchart TD" for a top-down direction.
  3.  Define nodes using standard shapes like rectangles 'ID[Text]', rounded rectangles 'ID(Text)', or diamonds 'ID{Text}'. Avoid using unsupported or custom node shapes.
  4.  Use standard connectors like '-->' for arrows with text, '---' for lines, or '-- Text ---' for lines with text.
  5.  Ensure all node IDs are unique and valid (alphanumeric, no special characters other than underscores).
  6.  Accurately reflect the technical steps and data flow involved in implementing the user flow based on the provided details.
  7.  Do NOT include any explanation, introductory text, markdown formatting (like \`\`\`), or comments before or after the Mermaid flowchart definition itself. Only output the raw Mermaid code starting with 'flowchart TD'.
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
    // Basic check to ensure the output starts correctly
    if (output?.flowchartDefinition && !output.flowchartDefinition.trim().startsWith('flowchart TD')) {
        // Prepend if missing, trying to recover
        output.flowchartDefinition = 'flowchart TD\n' + output.flowchartDefinition.trim();
    }
    return output!;
  }
);
