import { generateText } from "ai";
import { generateAiSummaryPrompt } from "../../utils/aiSummaryPrompt";
import DEFAULT_PROMPT from "../../utils/aiSummaryPrompt";

// Toggle for development logging
const DEV_MODE = false;

async function generateSummaryViaVercelAiSdk(prompt) {
  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) {
    throw new Error("Missing AI_GATEWAY_API_KEY in server configuration");
  }

  const model = process.env.AI_SUMMARY_MODEL || "openai/gpt-5-nano";

  try {
    const { text } = await generateText({
      model,
      prompt,
      temperature: 0.2,
    });

    if (!text) {
      throw new Error("Vercel AI SDK returned an empty response");
    }

    return text;
  } catch (error) {
    const networkCode = error?.cause?.code || error?.code;
    if (networkCode === "ECONNRESET" || networkCode === "ENOTFOUND") {
      throw new Error(
        "Cannot reach Vercel AI Gateway. Check network/proxy/VPN or try again."
      );
    }
    throw error;
  }
}

export async function POST(request) {
  try {
    const { transcript, customPrompt } = await request.json();
    
    if (!transcript) {
      return Response.json({ error: "Transcript data is required" }, { status: 400 });
    }

    // Log in dev mode
    if (DEV_MODE) {
      console.log("Generating AI summary for transcript");
    }

    // Create the prompt for summary generation
    const promptPrefix = `${customPrompt || DEFAULT_PROMPT}
    
Format your response using markdown with:
- Headers for sections (use # for main headers, ## for subheaders)
- Bullet points for key information
- Bold or italic text for emphasis
- Quotes for notable statements from the transcript

Create a well-structured summary with:
1. A brief overview paragraph
2. Main themes/topics section
3. Key points or takeaways
4. Any surprising or unusual findings
5. Conclusion

Your response MUST be in markdown format. For example:
# Overview
Brief overview text here...

## Main Themes
* Theme 1: description
* Theme 2: description

## Key Points
* Important point 1
* Important point 2

Here is the transcript:
`;

    const prompt = generateAiSummaryPrompt(transcript, promptPrefix);
    
    // Log in dev mode
    if (DEV_MODE) {
      console.log("Using prompt:", prompt.substring(0, 100) + "...");
    }

    const provider = "vercel-ai-sdk";

    // Generate the summary via Vercel AI SDK (AI Gateway)
    const summary = await generateSummaryViaVercelAiSdk(prompt);
    
    // Log in dev mode
    if (DEV_MODE) {
      console.log("AI summary generated successfully");
    }

    return Response.json({ success: true, summary, provider });
  } catch (error) {
    console.error('Error in AI summary API:', error);
    return Response.json(
      { error: error.message || "Failed to generate AI summary" }, 
      { status: 500 }
    );
  }
} 