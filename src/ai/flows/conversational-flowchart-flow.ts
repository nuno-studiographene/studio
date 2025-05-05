'use server';
/**
 * @fileOverview Conversational flowchart generator AI agent.
 *
 * - converseAndGenerateFlowchart - A function that handles the conversational generation of a flowchart.
 * - ConversationInput - The input type for the converseAndGenerateFlowchart function.
 * - ConversationOutput - The return type for the converseAndGenerateFlowchart function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

// Define the structure for a single message in the conversation
const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});
export type Message = z.infer<typeof MessageSchema>;

// Input schema: the conversation history so far
const ConversationInputSchema = z.object({
  messages: z.array(MessageSchema).describe('The history of the conversation between the user and the assistant.'),
});
export type ConversationInput = z.infer<typeof ConversationInputSchema>;

// Output schema: either the next question or the final flowchart
const ConversationOutputSchema = z.object({
    type: z.enum(['question', 'flowchart', 'error']).describe('Indicates whether the output is a question for the user, the final flowchart definition, or an error message.'),
    content: z.string().describe('If type is "question", this is the next question to ask the user. If type is "flowchart", this is the Mermaid flowchart definition. If type is "error", this provides details about the issue.'),
});
export type ConversationOutput = z.infer<typeof ConversationOutputSchema>;

// Exported function to be called from the frontend
export async function converseAndGenerateFlowchart(input: ConversationInput): Promise<ConversationOutput> {
  return conversationalFlowchartFlow(input);
}

const flowchartPrompt = ai.definePrompt({
    name: 'conversationalFlowchartPrompt',
    input: { schema: ConversationInputSchema },
    output: { schema: ConversationOutputSchema },
    prompt: `You are a helpful AI assistant acting as a senior software architect. Your goal is to gather information from the user through a conversation to generate a technical flowchart in Mermaid syntax.

    Analyze the conversation history provided in 'messages'. The last message is the user's most recent input.

    Based on the conversation so far, determine what crucial technical information is still missing to create a detailed flowchart. Ask clarifying questions ONE AT A TIME to collect these details. Focus on:
    1.  Initial User Action/Trigger.
    2.  Frontend Interaction (if any).
    3.  Data Fetching Method: API call (mention method like GET/POST, endpoint URL, key parameters) or Server-Side Rendering (SSR).
    4.  Loading Indicators: How loading is shown (spinners, skeletons, none).
    5.  Backend Processing: Key steps the backend takes (if applicable).
    6.  Database Interaction: How the backend connects/queries the database (e.g., technologies like Node.js/PostgreSQL/AWS RDS/Prisma).
    7.  Final UI Update/Result.

    Keep your questions concise, friendly, and focused on a single missing piece of technical information.

    **Conversation Flow:**
    - If critical information is missing, respond with \`type: 'question'\` and the clarifying question in the \`content\` field.
    - Once you are confident you have gathered *all* necessary details (including user flow, fetching method, loading state, API details if applicable, backend/DB info), STOP asking questions.
    - Generate the final flowchart definition in valid Mermaid syntax. The definition MUST start with \`flowchart TD\`.
    - **Mermaid Syntax Rules:**
        - Use standard shapes: \`NodeID[Description]\` for rectangles, \`NodeID(Round Edges)\` for rounded rectangles, \`NodeID{{Database}}\` for databases, \`NodeID>Decision]\` for rhombus (decision), etc.
        - **IMPORTANT: Ensure node labels are concise and enclosed in appropriate brackets (e.g., \`A[Descriptive Label]\`, \`B(Decision Point)\`). Avoid using complex punctuation like commas, parentheses, semicolons, or special characters *inside* the node labels themselves, as this can break rendering.**
        - Define links between nodes using \`-->\` for arrows. Example: \`A --> B\`.
        - Each link definition (like \`A --> B\`) MUST end with a semicolon (\`;\`). Example: \`A --> B;\`.
        - **CRITICAL: Do NOT place semicolons directly after a node definition's closing bracket/parenthesis (e.g., NEVER do \`A[Label];\`). Semicolons ONLY belong at the end of a complete link definition.**
    - Respond with \`type: 'flowchart'\` and the complete, valid Mermaid flowchart definition in the \`content\` field. Ensure the entire output is valid Mermaid syntax and follows best practices. Do NOT include any explanations or markdown fences (like \`\`\`) around the Mermaid code in the final flowchart output.

    **Example Interaction:**
    User: "Show related products on the product page."
    Assistant (output): \`{ type: 'question', content: 'Okay, how are the related products fetched? Is it via an API call from the frontend or rendered on the server (SSR)?' }\`
    User: "It uses an API call."
    Assistant (output): \`{ type: 'question', content: 'Got it. What is the endpoint URL for the related products API, and is it a GET or POST request?' }\`
    ... (continue until all info is gathered) ...
    Assistant (final output): \`{ type: 'flowchart', content: 'flowchart TD\\nA[User visits Product Page] --> B(Frontend makes GET request to /api/products/id/related);\\nB --> C{Show Loading Skeleton};\\nC --> D[API Gateway];\\nD --> E[Backend Service Fetches Data];\\nE --> F{{Database Query}};\\nF --> E;\\nE --> G[API Gateway Returns Data];\\nG --> H(Frontend receives data);\\nH --> I[Update UI with Related Products];\\nC --> H;' }\`

    **Current Conversation:**
    {{#each messages}}
    {{role}}: {{{content}}}
    {{/each}}

    Analyze the history and decide: Ask the next question OR generate the flowchart.`,
});

const conversationalFlowchartFlow = ai.defineFlow<
  typeof ConversationInputSchema,
  typeof ConversationOutputSchema
>(
  {
    name: 'conversationalFlowchartFlow',
    inputSchema: ConversationInputSchema,
    outputSchema: ConversationOutputSchema,
  },
  async (input) => {
    console.log('Conversational Flow Input:', input);
    try {
        const { output } = await flowchartPrompt(input);

        if (!output) {
             console.error("Flow received null output from prompt.");
             return { type: 'error', content: 'Sorry, I encountered an issue processing your request. Please try again.' };
        }

        console.log('Conversational Flow Raw Output:', output);

        // Validate and potentially clean the flowchart definition
        if (output.type === 'flowchart') {
            let definition = output.content.trim();
            // Remove potential markdown fences sometimes added by the LLM
            definition = definition.replace(/^```mermaid\s*/, '');
            definition = definition.replace(/\s*```$/, '');
            definition = definition.trim();

            // Ensure it starts with 'flowchart TD'
            if (!definition.startsWith('flowchart TD')) {
                console.warn("Generated flowchart definition doesn't start with 'flowchart TD'. Attempting to fix.");
                 // Basic check if it looks like Mermaid content but lacks the header
                 if (definition.includes('-->') || definition.includes('---')) {
                     definition = 'flowchart TD\n' + definition;
                 } else {
                     console.error("Generated content doesn't look like a valid Mermaid flowchart:", definition);
                    // Revert to asking a question or providing an error
                    return { type: 'error', content: 'I seem to have trouble generating the flowchart structure correctly. Could you perhaps rephrase the last piece of information?' };
                 }
            }

             // Sanitize node labels: Remove problematic characters *inside* brackets/parens/braces
             definition = definition.replace(/([\[({>])(.*?)([\])}])/g, (match, openBracket, label, closeBracket) => {
                 // Remove internal quotes, parentheses, commas, semicolons for simplicity
                 const sanitizedLabel = label.replace(/["'(),;]/g, '');
                 // Ensure label doesn't exceed a reasonable length (e.g., 100 chars) to prevent issues
                 const truncatedLabel = sanitizedLabel.substring(0, 100);
                 return `${openBracket}${truncatedLabel}${closeBracket}`;
             });

            // NEW: Remove semicolons directly after closing brackets/parens/braces
            // This regex looks for ], ), }, >] followed by optional whitespace and then a semicolon, and removes the semicolon.
            definition = definition.replace(/([\]\)\}>]\s*);/g, '$1');

            // Ensure all lines (link definitions) end with a semicolon, except the first line ('flowchart TD')
            const lines = definition.split('\n');
            definition = lines.map((line, index) => {
                const trimmedLine = line.trim();
                if (index === 0 || trimmedLine === '' || trimmedLine.endsWith(';')) {
                    return line; // Keep first line, empty lines, and lines already ending with ;
                }
                // Add semicolon if it's a link definition (heuristic: contains -> or ---) and doesn't already end with one
                if (trimmedLine.includes('-->') || trimmedLine.includes('---')) {
                     // Check again if it *really* doesn't end with ;, considering potential trailing whitespace removed by trim()
                     if (!line.trim().endsWith(';')) {
                         return line + ';';
                     }
                }
                return line; // Return line as is if it's not a link or already has a semicolon
            }).join('\n');


            output.content = definition;
            console.log('Cleaned Flowchart Definition:', definition);
        }

        return output;
    } catch (error) {
      console.error('Error in conversationalFlowchartFlow:', error);
       return { type: 'error', content: 'An unexpected error occurred while processing your request. Please check the logs or try again later.' };
    }
  }
);
