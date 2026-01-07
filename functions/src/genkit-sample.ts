import {genkit, z} from "genkit";
import {googleAI} from "@genkit-ai/google-genai";

// Cloud Functions for Firebase supports Genkit natively. The onCallGenkit function creates a callable
// function from a Genkit action. It automatically implements streaming if your flow does.
// The https library also has other utility methods such as hasClaim, which verifies that
// a caller's token has a specific claim (optionally matching a specific value)
import { onCallGenkit, hasClaim } from "firebase-functions/https";

// Gemini Developer API models and Vertex Express Mode models depend on an API key.
// API keys should be stored in Cloud Secret Manager so that access to these
// sensitive values can be controlled. defineSecret does this for you automatically.
// If you are using Google Developer API (googleAI) you can get an API key at https://aistudio.google.com/app/apikey
// If you are using Vertex Express Mode (vertexAI with apiKey) you can get an API key
// from the Vertex AI Studio Express Mode setup.
import { defineSecret } from "firebase-functions/params";
const apiKey = defineSecret("GOOGLE_GENAI_API_KEY");

// The Firebase telemetry plugin exports a combination of metrics, traces, and logs to Google Cloud
// Observability. See https://firebase.google.com/docs/genkit/observability/telemetry-collection.
import {enableFirebaseTelemetry} from "@genkit-ai/firebase";
enableFirebaseTelemetry();

const ai = genkit({
  plugins: [
    // Load the GoogleAI provider. You can optionally specify your API key by
    // passing in a config object; if you don't, the provider uses the value
    // from the GOOGLE_GENAI_API_KEY environment variable, which is the
    // recommended practice.
    googleAI()
  ],
});

const loopSchema = z.object({
  id: z.string(),
  title: z.string(),
  primaryObjective: z.string(),
  immediateNextStep: z.string().optional().nullable(),
  status: z.enum(["new", "act_on", "active", "stalled", "closed"]),
  priority: z.enum(["high", "medium", "low"]),
  dueAt: z.string().optional().nullable(),
  updatedAt: z.string().optional().nullable(),
  staleAt: z.string().optional().nullable(),
});

const suggestionSchema = z.object({
  loopId: z.string(),
  rationale: z.string(),
  score: z.number(),
});

const followUpPrompt = `
You are a follow-up copilot. Given a list of loops (tasks) return the 3-5 that need action first.

Consider, in order:
- Priority: high > medium > low.
- Status: stalled or act_on are urgent; active is mid; new can wait; closed is never returned.
- Due dates: overdue > due within 3 days > due within 7 days > later/none.
- Staleness / last update: items untouched for 48h should be lifted.
- Clarity of next step: if immediateNextStep is missing, call that out.

Respond with a short rationale for each picked loop explaining why it bubbled up.
`;

const followUpSuggestionsFlow = ai.defineFlow({
  name: "followUpSuggestionsFlow",
  inputSchema: z.object({
    prompt: z.string().default(followUpPrompt),
    loops: z.array(loopSchema),
  }),
  outputSchema: z.object({
    suggestions: z.array(suggestionSchema),
  }),
}, async ({prompt, loops}) => {
  const {output} = await ai.generate({
    model: googleAI.model("gemini-2.5-flash"),
    messages: [
      {role: "system", content: prompt || followUpPrompt},
      {
        role: "user",
        content: [
          "Analyze these loops and return the top 3-5 items needing attention.",
          "Respond as JSON matching the schema.",
          JSON.stringify(loops, null, 2),
        ].join("\n\n"),
      },
    ],
    output: z.object({ suggestions: z.array(suggestionSchema) }),
    config: { temperature: 0.2 },
  });

  return output;
});

// Define a simple flow that prompts an LLM to generate menu suggestions.
const menuSuggestionFlow = ai.defineFlow({
    name: "menuSuggestionFlow",
    inputSchema: z.string().describe("A restaurant theme").default("seafood"),
    outputSchema: z.string(),
    streamSchema: z.string(),
  }, async (subject, { sendChunk }) => {
    // Construct a request and send it to the model API.
    const prompt =
      `Suggest an item for the menu of a ${subject} themed restaurant`;
    const { response, stream } = ai.generateStream({
      model: googleAI.model("gemini-2.5-flash"),
      prompt: prompt,
      config: {
        temperature: 1,
      },
    });

    for await (const chunk of stream) {
      sendChunk(chunk.text);
    }

    // Handle the response from the model API. In this sample, we just
    // convert it to a string, but more complicated flows might coerce the
    // response into structured output or chain the response into another
    // LLM call, etc.
    return (await response).text;
  }
);

export const followUpSuggestions = onCallGenkit({
  secrets: [apiKey],
}, followUpSuggestionsFlow);

export const menuSuggestion = onCallGenkit({
  // Uncomment to enable AppCheck. This can reduce costs by ensuring only your Verified
  // app users can use your API. Read more at https://firebase.google.com/docs/app-check/cloud-functions
  // enforceAppCheck: true,

  // authPolicy can be any callback that accepts an AuthData (a uid and tokens dictionary) and the
  // request data. The isSignedIn() and hasClaim() helpers can be used to simplify. The following
  // will require the user to have the email_verified claim, for example.
  // authPolicy: hasClaim("email_verified"),

  // Grant access to the API key to this function:
  secrets: [apiKey],
}, menuSuggestionFlow);
