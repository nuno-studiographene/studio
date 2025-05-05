'use server';
/**
 * @fileOverview Conversational flowchart generator AI agent.
 *
 * - converseAndGenerateFlowchart - A function that handles the conversational generation of a flowchart.
 * - ConversationInput - The input type for the converseAndGenerateFlowchart function.
 * - ConversationOutput - The return type for the converseAndGenerateFlowchart function.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';

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
    - **Mermaid Syntax Rules (Strict):**
        - Use standard shapes: \`NodeID["Label with spaces/chars"]\`, \`NodeID(Rounded)\`, \`NodeID{{"DB Symbol"}}\`, \`NodeID{"Decision?"}\`.
        - **CRITICAL FOR NODE IDs:** Node IDs (e.g., 'A', 'B', 'fetchData') MUST consist ONLY of letters, numbers, and underscores. NO spaces or other special characters are allowed in Node IDs. Use simple IDs like \`FetchData\` or \`Handle_Error\`.
        - **CRITICAL FOR LABELS:** Node labels MUST be enclosed in quotes (\`"..."\`) if they contain spaces, punctuation (like \`()[]{}:;/\`), or special characters. Simple single-word labels can use parentheses \`()\`, but quotes are safer. Example: \`A["User Clicks Submit Button"]\`, \`B("Process")\`, \`C{{"DB Symbol"}}\`. Double-check quoting for complex labels.
        - **EXTREMELY IMPORTANT:** Only use plain ASCII characters in your flowchart. DO NOT use any special characters, Unicode symbols, curly quotes, or HTML entities in your labels or IDs. Use only regular straight quotes (") and standard ASCII characters.
        - When you need to include a double quote within a label, escape it with a backslash like this: \`A["Click \\"Submit\\" Button"]\`.
        - Define links between nodes using \`-->\`. Example: \`A --> B\`.
        - Add labels to links where appropriate using \`-- text -->\`. Example: \`B -- GET /api/data --> C\`.
        - **ABSOLUTELY CRITICAL SEMICOLON RULE:** A semicolon (\`;\`) MUST ONLY appear at the very end of a complete link definition line (e.g., \`A --> B;\` or \`B -- Success --> C;\`).
        - **NEVER, EVER place a semicolon directly after a node definition's closing bracket/parenthesis/quote.** Incorrect: \`A["Label"];\`. Correct: \`A["Label"] --> B;\`.
        - Each line defining a node-to-node link MUST end with a semicolon. The first line (\`flowchart TD\`) does not need one. Node definition lines (like \`A["Label"]\`) should NOT end with a semicolon.
    - Respond with \`type: 'flowchart'\` and the complete, valid Mermaid flowchart definition in the \`content\` field. Ensure the entire output adheres strictly to the Mermaid syntax rules above. Do NOT include any explanations or markdown fences (like \`\`\`) around the Mermaid code in the final flowchart output.

    **Example Interaction:**
    User: "Show related products on the product page."
    Assistant (output): \`{ type: 'question', content: 'Okay, how are the related products fetched? Is it via an API call from the frontend or rendered on the server (SSR)?' }\`
    User: "It uses an API call."
    Assistant (output): \`{ type: 'question', content: 'Got it. What is the HTTP method (GET, POST, etc.) and the endpoint URL for the related products API?' }\`
    User: "GET /api/products/{id}/related"
    Assistant (output): \`{ type: 'question', content: 'Thanks! How is the loading state indicated to the user while the API call is in progress?' }\`
    User: "A skeleton loader."
    Assistant (output): \`{ type: 'question', content: 'Understood. What happens on the backend when it receives this request? Does it interact with a database?' }\`
    User: "Yes, the Node.js backend queries a PostgreSQL DB using Prisma."
    Assistant (output): \`{ type: 'question', content: 'Excellent. And finally, how is an error handled if the API call fails?' }\`
    User: "Show a toast message 'Failed to load related products'."
    Assistant (final output): \`{ type: 'flowchart', content: 'flowchart TD\\nA["User visits Product Page"] --> B{"Make API Call?"};\\nB -- Yes --> C["Show Skeleton Loader"];\\nC --> D["API Call: GET /api/products/{id}/related"];\\nD --> E["Backend: Node.js/Prisma"];\\nE --> F{{"DB: PostgreSQL Query"}};\\nF -- Success --> G["API Success Response"];\\nF -- Failure --> H["API Error Response"];\\nE --> G;\\nE --> H;\\nG --> I["Hide Skeleton, Display Products"];\\nH --> J["Show Error Toast"];\\nC --> I;\\nC --> J;\\nB -- No --> K["Render Page without related"];' }\`

    **Current Conversation:**
    {{#each messages}}
    {{role}}: {{{content}}}
    {{/each}}

    Analyze the history and decide: Ask the next question OR generate the flowchart based on the STRICT rules.`,
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
    console.log('Conversational Flow Input:', JSON.stringify(input, null, 2));
    try {
      // **NEW: Validate input**
      if (!input || typeof input !== 'object') {
        console.error('Invalid input: Input is not an object.');
        return { type: 'error', content: 'Invalid input format. Please try again.' };
      }

      if (!input.messages || !Array.isArray(input.messages) || input.messages.length === 0) {
        console.error('Invalid input: Messages is not a non-empty array.');
        return { type: 'error', content: 'Invalid input format: Missing or empty conversation messages. Please try again.' };
      }

      // Basic check structure of each message in array
      for (const message of input.messages) {
        if (!message || typeof message !== 'object' || typeof message.role !== 'string' || typeof message.content !== 'string' || !['user', 'assistant'].includes(message.role)) {
          console.error('Invalid input: Message is malformed or has invalid role:', message);
          return { type: 'error', content: `Invalid input format: Malformed message or invalid role ('${message.role}') in conversation. Please try again.` };
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
        definition = definition.replace(/^```(?:mermaid)?\s*/i, ''); // Optional mermaid tag
        definition = definition.replace(/\s*```$/, '');
        definition = definition.trim();

        // Ensure it starts with 'flowchart TD' (allow variations like 'graph TD')
        if (!definition.toLowerCase().startsWith('flowchart td') && !definition.toLowerCase().startsWith('graph td')) {
          console.warn("Generated flowchart definition doesn't start with 'flowchart TD' or 'graph TD'. Attempting to fix.");
          // Basic check if it looks like Mermaid content but lacks the header
          if (definition.includes('-->') || definition.includes('---')) {
            definition = 'flowchart TD\n' + definition;
          } else {
            console.error("Generated content doesn't look like a valid Mermaid flowchart:", definition);
            // Revert to asking a question or providing an error
            return { type: 'error', content: 'I seem to have trouble generating the flowchart structure correctly. Could you perhaps rephrase the last piece of information or provide more detail?' };
          }
        }

        // Attempt to sanitize Node IDs (remove disallowed characters) - Best effort
        definition = definition.replace(/^(\s*)(\w+)(?=\[|\(|\{)/gm, (match, prefix, id) => {
          const sanitizedId = id.replace(/[^a-zA-Z0-9_]/g, '_');
          if (id !== sanitizedId) {
            console.warn(`Sanitized Node ID: '${id}' -> '${sanitizedId}'`);
          }
          return prefix + sanitizedId;
        });

        // Ensure proper quoting for labels with spaces/symbols, handle escaped quotes
        definition = definition.replace(/(\w+)(\[|\(|\{)(.*?)(\]|\)|\})/g, (match, id, openBracket, label, closeBracket) => {
          const sanitizedId = id.replace(/[^a-zA-Z0-9_]/g, '_'); // Ensure ID is clean again
          let sanitizedLabel = label;

          // If the label contains problematic characters or spaces, ensure it uses double quotes ""
          // Problematic chars: space, "()[]{};/<>|!@#$%^&*+=`~
          if (/[ "()[\]{};\/<>|!@#$%^&*+=`~]/.test(sanitizedLabel) || openBracket !== '"') {
            // Escape existing double quotes within the label before wrapping
            sanitizedLabel = sanitizedLabel.replace(/"/g, '\\"'); // Use escaped quote instead of #quot;
            return `${sanitizedId}["${sanitizedLabel}"]`;
          } else if (openBracket === '"') {
            // Already has quotes, just ensure ID is sanitized and maybe escape internal quotes
            sanitizedLabel = sanitizedLabel.replace(/"/g, '\\"'); // Use escaped quote instead of #quot;
            return `${sanitizedId}["${sanitizedLabel}"]`;
          } else {
            // Simple label in simple brackets like (Process) - keep as is, but sanitize ID
            return `${sanitizedId}${openBracket}${sanitizedLabel}${closeBracket}`;
          }
        });


        // Remove semicolons directly after closing brackets/parens/braces/quotes of node definitions
        // Looks for ], ), }, " followed by optional whitespace and then a semicolon, removes the semicolon.
        // IMPORTANT: Do this BEFORE ensuring links end with semicolons.
        definition = definition.replace(/([\]\)\}"']\s*);/g, '$1');

        // Ensure all actual link definition lines end with a semicolon, except the first line ('flowchart TD')
        const lines = definition.split('\n');
        definition = lines.map((line, index) => {
          const trimmedLine = line.trim();
          // Ignore first line, empty lines, comments, and lines already ending correctly
          if (index === 0 || trimmedLine === '' || trimmedLine.startsWith('%%') || trimmedLine.endsWith(';')) {
            return line;
          }

          // Check if it's a link definition (contains -> or ---)
          // AND is NOT just a node definition (e.g., `A["Label"]` or `B(Simple)`)
          const isLink = /-->|---/.test(trimmedLine);
          // Stricter check for node def: starts with node ID, optional brackets/parens/etc., optional label, ends with the closing bracket/paren/etc.
          const isStrictNodeDef = /^\s*[a-zA-Z0-9_]+\s*(?:\[.*?\]|\(.*?\)|{.*?}|\w+)\s*$/.test(trimmedLine);


          if (isLink && !isStrictNodeDef) {
            // It looks like a link and not just a node definition, add semicolon if missing.
            return line.trimRight() + ';'; // Trim trailing whitespace before adding
          }

          // Otherwise, return the line as is (likely a node definition or malformed)
          return line;
        }).join('\n');


        output.content = definition;
        console.log('Cleaned Flowchart Definition:\n', definition); // Log with newline for readability
      } else if (output.type === 'error') {
        console.error("Flow returned an error type:", output.content);
        // Ensure the error content is passed through
        return output; // Return the error object as received
      } else if (output.type === 'question') {
        // Pass the question through
        return output;
      }


      return output;

    } catch (error: unknown) { // Explicitly type error as unknown
      // Log the full error object for better debugging
      console.error('Error in conversationalFlowchartFlow catch block:', error);

      // Construct a user-friendly message, potentially including limited error info if safe
      let errorMessage = 'An unexpected error occurred while processing your request.';
      if (error instanceof Error) {
        // You might want to be cautious about exposing specific error messages to the client
        // depending on your security requirements.
        // Example: Include message if needed, but usually avoid exposing internal details
        // errorMessage += ` Details: ${error.message}`;
        console.error("Error details:", error.message, error.stack); // Log stack trace server-side
      } else {
        console.error("Caught non-Error object:", error);
      }
      errorMessage += ' Please check the server logs or try again later.';

      return { type: 'error', content: errorMessage };
    }
  }
);
