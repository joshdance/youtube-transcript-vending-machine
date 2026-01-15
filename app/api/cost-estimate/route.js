import { estimateTranscriptAndSummaryCostUSD } from "@/app/utils/costEstimate";

/**
 * POST /api/cost-estimate
 * Body:
 * - transcript?: Array|Object|string (preferred; estimates from actual transcript)
 * - durationSeconds?: number (fallback; estimates transcript size from duration)
 * - customPrompt?: string
 * - transcriptProvider?: string (optional override; defaults to TRANSCRIPT_PROVIDER)
 * - completionTokens?: number (optional override; defaults to AI_SUMMARY_ESTIMATED_COMPLETION_TOKENS or 800)
 *
 * Env (optional but recommended):
 * - AI_SUMMARY_INPUT_USD_PER_1M
 * - AI_SUMMARY_OUTPUT_USD_PER_1M
 * - AI_SUMMARY_ESTIMATED_COMPLETION_TOKENS
 * - OXYLABS_COST_USD_PER_REQUEST
 * - SUPADATA_COST_USD_PER_REQUEST
 */
export async function POST(request) {
  try {
    const {
      transcript,
      durationSeconds,
      customPrompt,
      transcriptProvider,
      completionTokens,
    } = await request.json();

    if (!transcript && !durationSeconds) {
      return Response.json(
        { error: "Provide either transcript or durationSeconds" },
        { status: 400 }
      );
    }

    const estimate = estimateTranscriptAndSummaryCostUSD({
      transcript,
      durationSeconds,
      customPrompt,
      transcriptProvider,
      completionTokens,
    });

    return Response.json({ success: true, estimate });
  } catch (error) {
    console.error("[API /cost-estimate] Error:", error);
    return Response.json(
      { error: error.message || "Failed to estimate costs" },
      { status: 500 }
    );
  }
}

