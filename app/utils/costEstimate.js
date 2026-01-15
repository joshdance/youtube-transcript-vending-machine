import DEFAULT_PROMPT, { generateAiSummaryPrompt } from "./aiSummaryPrompt";

function parseNumber(value, fallback) {
  const n = typeof value === "number" ? value : parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Very rough heuristic for English-ish text:
 * ~4 characters per token (varies by language/content).
 */
export function estimateTokensFromText(text) {
  if (!text) return 0;
  return Math.max(1, Math.ceil(String(text).length / 4));
}

export function estimateTranscriptTokensFromDurationSeconds(durationSeconds, opts = {}) {
  const seconds = parseNumber(durationSeconds, 0);
  if (!seconds || seconds <= 0) return 0;

  const wpm = parseNumber(opts.wordsPerMinute, 150); // typical speaking rate
  const tokensPerWord = parseNumber(opts.tokensPerWord, 1.33); // ~0.75 words/token => ~1.33 tokens/word
  const minutes = seconds / 60;

  const words = minutes * wpm;
  return Math.max(1, Math.ceil(words * tokensPerWord));
}

export function estimateTranscriptFetchCostUSD(providerName) {
  const provider = providerName || process.env.TRANSCRIPT_PROVIDER || "youtube-transcript";

  if (provider === "oxylabs") {
    return {
      provider,
      costUSD: parseNumber(process.env.OXYLABS_COST_USD_PER_REQUEST, 0),
      billingUnit: "per_request",
    };
  }

  if (provider === "supadata") {
    return {
      provider,
      costUSD: parseNumber(process.env.SUPADATA_COST_USD_PER_REQUEST, 0),
      billingUnit: "per_request",
    };
  }

  // youtube-transcript: free (self-hosted scraping via npm package)
  return { provider, costUSD: 0, billingUnit: "free" };
}

export function estimateSummaryCostUSD({
  transcript,
  durationSeconds,
  customPrompt,
  completionTokens,
} = {}) {
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

  // Prefer actual transcript content if available; otherwise estimate from duration.
  const prompt =
    transcript
      ? generateAiSummaryPrompt(transcript, promptPrefix)
      : `${promptPrefix}\n\n(Transcript omitted. Estimated length: ${estimateTranscriptTokensFromDurationSeconds(
          durationSeconds
        )} tokens)\n`;

  const promptTokens = estimateTokensFromText(prompt);
  const completion = parseNumber(
    completionTokens ?? process.env.AI_SUMMARY_ESTIMATED_COMPLETION_TOKENS,
    800
  );

  // Prices are expected as USD per 1M tokens.
  const inputUSDPer1M = parseNumber(process.env.AI_SUMMARY_INPUT_USD_PER_1M, 0);
  const outputUSDPer1M = parseNumber(process.env.AI_SUMMARY_OUTPUT_USD_PER_1M, 0);

  const inputCostUSD = (promptTokens / 1_000_000) * inputUSDPer1M;
  const outputCostUSD = (completion / 1_000_000) * outputUSDPer1M;

  return {
    promptTokens,
    completionTokens: completion,
    inputUSDPer1M,
    outputUSDPer1M,
    inputCostUSD,
    outputCostUSD,
    totalCostUSD: inputCostUSD + outputCostUSD,
  };
}

export function estimateTranscriptAndSummaryCostUSD(params = {}) {
  const transcriptFetch = estimateTranscriptFetchCostUSD(params.transcriptProvider);
  const summary = estimateSummaryCostUSD(params);

  return {
    transcriptFetch,
    summary,
    totalCostUSD: transcriptFetch.costUSD + summary.totalCostUSD,
  };
}

