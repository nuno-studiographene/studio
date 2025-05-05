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
        .describe('The definition of the flowchart in valid Mermaid syntax, starting with "flowchart TD".'),
    }),
  },
  prompt: `You are an expert software architect that translates user flows into technical Mermaid flowcharts.

  Based on the following information, generate a technical flowchart definition using Mermaid syntax.

  User Flow Description: {{{userFlowDescription}}}
  Data Fetching Method: {{{apiOrServerSide}}}
  Loading Indicator: {{{loadersOrSkeletons}}}
  API Request Parameters: {{{apiRequestParameters}}}
  Backend Database Connection: {{{backendDatabaseConnection}}}

  **Instructions for Mermaid Flowchart Definition:**
  1.  The flowchart definition **MUST** be in valid Mermaid flowchart syntax. Refer to official Mermaid documentation for valid syntax.
  2.  Start the definition with \`flowchart TD\` for a top-down direction.
  3.  Define nodes using *only* standard shapes like rectangles \`ID[Text]\`, rounded rectangles \`ID(Text)\`, or diamonds \`ID{Text}\`. Do **NOT** use unsupported or custom node shapes (e.g., no \`ID>Text]\` or similar invalid syntax).
  4.  Ensure Node IDs are unique, alphanumeric (underscores allowed), and contain no spaces or special characters. Node text inside shapes should be concise.
  5.  Use standard connectors: \`-->\` for arrows, \`-- Text -->\` for arrows with text, \`---\` for lines, or \`-- Text ---\` for lines with text. Ensure text on connectors is brief and relevant.
  6.  Accurately reflect the technical steps and data flow based on the provided details.
  7.  **CRITICAL:** Do **NOT** include *any* explanation, introductory text, markdown formatting (like \`\`\`), code fences, or comments before or after the Mermaid flowchart definition itself. The output must **ONLY** be the raw Mermaid code starting *exactly* with \`flowchart TD\`.
  8.  Ensure **every** line is syntactically correct Mermaid code. There should be no trailing characters, incomplete definitions, or non-Mermaid text anywhere in the output. Check for balanced brackets and quotes.
  9.  Example of a simple valid output structure:
      \`\`\`mermaid
      flowchart TD
          A[User Action] --> B(Frontend Request);
          B --> C{API Call?};
          C -- Yes --> D[Backend Process];
          D --> E((Database Query));
          E --> D;
          D --> B;
          C -- No --> F[Render UI];
      \`\`\`
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

    // Basic cleanup attempt: Trim whitespace and ensure it starts correctly.
    // Remove potential markdown fences or leading/trailing explanations.
    let definition = output?.flowchartDefinition || '';
    definition = definition.trim();

    // Remove potential markdown code fences
    definition = definition.replace(/^```mermaid\s*/, '');
    definition = definition.replace(/\s*```$/, '');
    definition = definition.trim(); // Trim again after removing fences

    if (definition && !definition.startsWith('flowchart TD')) {
        // If it doesn't start correctly after cleanup, prepend it.
        definition = 'flowchart TD\n' + definition;
    } else if (!definition) {
        // Handle empty output case
        console.error("Flowchart generation resulted in empty definition.");
        return { flowchartDefinition: 'flowchart TD\n    error[Error Generating Flowchart]' };
    }

    return { flowchartDefinition: definition };
  }
);
