import { GoogleGenerativeAI } from "@google/generative-ai";
import { generateAiSummaryPrompt } from "../../utils/aiSummaryPrompt";

// Toggle for development logging
const DEV_MODE = false;

export async function POST(request) {
  try {
    const { transcript, customPrompt } = await request.json();
    
    if (!transcript) {
      return Response.json({ error: "Transcript data is required" }, { status: 400 });
    }
    
    // Get API key from environment variable
    const GOOGLE_GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY;
    
    if (!GOOGLE_GEMINI_API_KEY) {
      return Response.json(
        { error: "Missing Google Gemini API key in server configuration" }, 
        { status: 500 }
      );
    }

    // Log in dev mode
    if (DEV_MODE) {
      console.log("Generating AI summary for transcript");
    }

    // Initialize the Google Generative AI client
    const genAI = new GoogleGenerativeAI(GOOGLE_GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Create the prompt for summary generation
    const prompt = generateAiSummaryPrompt(transcript, customPrompt);
    
    // Log in dev mode
    if (DEV_MODE) {
      console.log("Using prompt:", prompt.substring(0, 100) + "...");
    }

    // Generate the summary
    const result = await model.generateContent(prompt);
    const summary = result.response.text();
    
    // Log in dev mode
    if (DEV_MODE) {
      console.log("AI summary generated successfully");
    }

    return Response.json({ success: true, summary });
  } catch (error) {
    console.error('Error in AI summary API:', error);
    return Response.json(
      { error: error.message || "Failed to generate AI summary" }, 
      { status: 500 }
    );
  }
} 