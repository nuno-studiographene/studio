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
    2.  Frontend Interaction (if any, e.g., button click, form submission).
    3.  Data Fetching Method: API call (mention method like GET/POST/PUT/PATCH/DELETE, endpoint URL, key parameters/body structure) or Server-Side Rendering (SSR).
    4.  Loading Indicators: How loading is shown (spinners, skeletons, specific text, none).
    5.  Backend Processing: Key steps the backend takes (if applicable, e.g., validation, data transformation, calling other services).
    6.  Database Interaction: How the backend connects/queries the database (e.g., technologies like Node.js/PostgreSQL/AWS RDS/Prisma, ORM usage, type of query like SELECT/INSERT/UPDATE).
    7.  Final UI Update/Result (e.g., displaying data, showing success message, navigating).
    8.  Error Handling: Briefly how errors are handled (e.g., show error message, redirect).

    Keep your questions concise, friendly, and focused on a single missing piece of technical information. Avoid jargon where possible, but ask for technical specifics when needed (like API method/URL).

    **Conversation Flow:**
    - If critical information is missing, respond with \`type: 'question'\` and the clarifying question in the \`content\` field.
    - Once you are confident you have gathered *all* necessary details (user flow, fetching, loading, API details, backend, DB, error handling, UI result), STOP asking questions.
    - Generate the final flowchart definition in valid Mermaid syntax. The definition MUST start with \`flowchart TD\`.
    - **Mermaid Syntax Rules:**
        - Use standard shapes: \`NodeID["Description"]\` for rectangles (use quotes for labels with spaces/special chars), \`NodeID("Rounded Edges")\` for rounded rectangles, \`NodeID{{"Database Symbol"}} \` for databases, \`NodeID{"Decision Point?"}\` for rhombus (decision).
        - **IMPORTANT:** Ensure node labels are concise and enclosed in appropriate quotes or brackets/parentheses if simple. Quotes (\`"..."\`) are generally safer for labels containing spaces, punctuation, or special characters. Example: \`A["User Clicks Button"]\`, \`B("Process Data")\`.
        - **CRITICAL FOR NODE IDs:** Node IDs (the part before the brackets/quotes, e.g., 'A', 'B', 'fetchData') MUST NOT contain spaces or special characters other than underscores. Use simple IDs like \`fetchData\` or \`HandleError\`.
        - Define links between nodes using \`-->\`. Example: \`A --> B\`.
        - Add labels to links where appropriate using \`-- text -->\`. Example: \`B -- GET /api/data --> C\`.
        - Each link definition (like \`A --> B\` or \`B -- text --> C\`) MUST end with a semicolon (\`;\`). Example: \`A --> B;\`, \`B -- GET /api/data --> C;\`.
        - **CRITICAL: Do NOT place semicolons directly after a node definition's closing bracket/parenthesis/quote (e.g., NEVER do \`A["Label"];\`). Semicolons ONLY belong at the end of a complete link definition.**
    - Respond with \`type: 'flowchart'\` and the complete, valid Mermaid flowchart definition in the \`content\` field. Ensure the entire output is valid Mermaid syntax and follows best practices. Do NOT include any explanations or markdown fences (like \`\`\`) around the Mermaid code in the final flowchart output.

    **Example Interaction:**
    User: "Show related products on the product page."
    Assistant (output): \`{ type: 'question', content: 'Okay, how are the related products fetched? Is it via an API call from the frontend or rendered on the server (SSR)?' }\`
    User: "It uses an API call."
    Assistant (output): \`{ type: 'question', content: 'Got it. What is the HTTP method (GET, POST, etc.) and the endpoint URL for the related products API?' }\`
    User: "GET /api/products/123/related"
    Assistant (output): \`{ type: 'question', content: 'Thanks! How is the loading state indicated to the user while the API call is in progress?' }\`
    User: "A skeleton loader."
    Assistant (output): \`{ type: 'question', content: 'Understood. What happens on the backend when it receives this request? Does it interact with a database?' }\`
    User: "Yes, the Node.js backend queries a PostgreSQL DB using Prisma."
    Assistant (output): \`{ type: 'question', content: 'Excellent. And finally, how is an error handled if the API call fails?' }\`
    User: "Show a toast message 'Failed to load related products'."
    Assistant (final output): \`{ type: 'flowchart', content: 'flowchart TD\\nA["User visits Product Page"] --> B{Make API Call};\\nB -- GET /api/products/123/related --> C["Show Skeleton Loader"];\\nB --> D[Backend: Node.js/Prisma];\\nD --> E{{"DB: PostgreSQL Query"}};\\nE --> D;\\nD --> F[API Response];\\nF -- Success --> G["Hide Skeleton, Display Products"];\\nC --> G;\\nF -- Error --> H["Show Error Toast"];\\nC --> H;' }\`

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
        // **NEW: Validate input**
        if (!input || typeof input !== 'object') {
            console.error('Invalid input: Input is not an object.');
            return { type: 'error', content: 'Invalid input format. Please try again.' };
        }

        if (!input.messages || !Array.isArray(input.messages)) {
            console.error('Invalid input: Messages is not an array.');
            return { type: 'error', content: 'Invalid input format: Missing conversation messages. Please try again.' };
        }

        // Check structure of each message in array (optional, but recommended)
        for (const message of input.messages) {
            if (!message || typeof message !== 'object' || typeof message.role !== 'string' || typeof message.content !== 'string') {
                console.error('Invalid input: Message is malformed:', message);
                return { type: 'error', content: 'Invalid input format: Malformed message in conversation. Please try again.' };
            }
             // Basic check for known roles
             if (message.role !== 'user' && message.role !== 'assistant') {
                 console.warn('Warning: Unknown role in message:', message.role);
                 // Decide if this is an error or just a warning
                 // return { type: 'error', content: `Invalid input format: Unknown role '${message.role}' in conversation.` };
             }
        }


        const { output } = await flowchartPrompt(input);

        // **NEW: Validate output**
        if (!output) {
             console.error("Flow received null or undefined output from prompt.");
             return { type: 'error', content: 'Sorry, I encountered an issue processing your request. The AI response was empty. Please try again.' };
        }

        console.log('Conversational Flow Raw Output:', output);

        // Validate and potentially clean the flowchart definition
        if (output.type === 'flowchart') {
            let definition = output.content.trim();
            // Remove potential markdown fences sometimes added by the LLM
            definition = definition.replace(/^```mermaid\s*/i, ''); // Case-insensitive mermaid tag
            definition = definition.replace(/\s*```$/, '');
            definition = definition.trim();

            // Ensure it starts with 'flowchart TD' (allow variations like 'graph TD')
             if (!definition.toLowerCase().startsWith('flowchart td') && !definition.toLowerCase().startsWith('graph td')) {
                console.warn("Generated flowchart definition doesn't start with 'flowchart TD' or 'graph TD'. Attempting to fix.");
                 // Basic check if it looks like Mermaid content but lacks the header
                 if (definition.includes('-->') || definition.includes('---')) {
                     // Default to flowchart TD if missing
                     definition = 'flowchart TD\n' + definition;
                 } else {
                     console.error("Generated content doesn't look like a valid Mermaid flowchart:", definition);
                    // Revert to asking a question or providing an error
                    return { type: 'error', content: 'I seem to have trouble generating the flowchart structure correctly. Could you perhaps rephrase the last piece of information or provide more detail?' };
                 }
            }

             // Sanitize node labels: Ensure quotes for complex labels, simplify IDs
             definition = definition.replace(
                /(\w+)(\[|\(|\{|")(.*?)(\]|\)|\}|"|\})/g,
                (match, id, openBracket, label, closeBracket) => {
                    // Simplify ID: remove problematic characters if any (should be handled by LLM prompt ideally)
                    const sanitizedId = id.replace(/[^a-zA-Z0-9_]/g, '_');

                    // Ensure label is properly quoted if it contains problematic characters or spaces
                    // Basic check: if label contains spaces, quotes, common punctuation -> use quotes
                    let sanitizedLabel = label.replace(/"/g, "'"); // Escape internal double quotes
                    if (/[ "(),;{}<>]/ .test(sanitizedLabel) && openBracket !== '"') {
                        // If it needs quotes but doesn't have them, add them
                        return `${sanitizedId}["${sanitizedLabel}"]`;
                    } else if (openBracket === '"') {
                         // If it already has quotes, just ensure ID is sanitized
                         return `${sanitizedId}["${sanitizedLabel}"]`;
                    } else {
                         // If simple label in simple brackets, keep it but sanitize ID
                         // Remove internal problematic chars just in case
                         sanitizedLabel = sanitizedLabel.replace(/["'(),;]/g, '');
                         return `${sanitizedId}${openBracket}${sanitizedLabel.substring(0, 100)}${closeBracket}`;
                    }
                }
             );


            // Remove semicolons directly after closing brackets/parens/braces/quotes
            // Looks for ], ), }, "] followed by optional whitespace and then a semicolon, removes the semicolon.
            definition = definition.replace(/([\]\)\}"']\s*);/g, '$1');

            // Ensure all link definition lines end with a semicolon, except the first line ('flowchart TD')
            const lines = definition.split('\n');
            definition = lines.map((line, index) => {
                const trimmedLine = line.trim();
                if (index === 0 || trimmedLine === '' || trimmedLine.endsWith(';')) {
                    return line; // Keep first line, empty lines, and lines already ending with ;
                }
                // Add semicolon if it's a link definition (heuristic: contains -> or ---) and doesn't already end with one
                 // Also check it's not just a node definition line
                 if ((trimmedLine.includes('-->') || trimmedLine.includes('---')) && !/^\s*\w+[\[({"].*?[\])}"]\s*$/.test(trimmedLine)) {
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
    } catch (error: unknown) { // Explicitly type error as unknown
      // Log the full error object for better debugging
      console.error('Error in conversationalFlowchartFlow:', error);

      // Construct a user-friendly message, potentially including limited error info if safe
      let errorMessage = 'An unexpected error occurred while processing your request.';
      if (error instanceof Error) {
        // You might want to be cautious about exposing specific error messages to the client
        // depending on your security requirements.
        // errorMessage += ` Details: ${error.message}`; // Example: Include message
        console.error("Error details:", error.message, error.stack); // Log stack trace server-side
      }
      errorMessage += ' Please check the server logs or try again later.';

      return { type: 'error', content: errorMessage };
    }
  }
);
