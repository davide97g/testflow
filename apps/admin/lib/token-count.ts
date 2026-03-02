/**
 * Token estimation and optimization for LLM prompts.
 * Uses a character-based heuristic (~4 chars/token for GPT-style tokenizers).
 * For exact counts, consider using tiktoken or an API that returns token usage.
 */

const CHARS_PER_TOKEN_ESTIMATE = 4;

/** Cache for last estimate to avoid recomputing when the same text is passed (e.g. re-renders). */
let lastSummary: { text: string; result: TokenEstimateResult } | null = null;

export interface TokenEstimateResult {
  tokens: number;
  chars: number;
  words: number;
  approximate: true;
}

/**
 * Estimates the number of tokens for a given text using a character-based heuristic.
 * Suitable for GPT-2/GPT-3/GPT-4 style tokenizers (English + code/markdown).
 * Accuracy is typically within ~10–15% of actual tokenizers.
 */
export const estimateTokenCount = (text: string): number => {
  if (!text || text.length === 0) return 0;
  return Math.ceil(text.length / CHARS_PER_TOKEN_ESTIMATE);
};

/**
 * Returns a summary of the token estimate plus character and word counts for display.
 * Result is cached for the same text reference to optimize repeated calls (e.g. in React).
 */
export const getTokenEstimateSummary = (text: string): TokenEstimateResult => {
  if (lastSummary && lastSummary.text === text) {
    return lastSummary.result;
  }
  const chars = text.length;
  const tokens = estimateTokenCount(text);
  const words = text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  const result: TokenEstimateResult = { tokens, chars, words, approximate: true };
  lastSummary = { text, result };
  return result;
};

export interface PromptOptimizationResult {
  optimizedText: string;
  originalTokens: number;
  optimizedTokens: number;
  suggestions: string[];
}

/**
 * Optimizes prompt text to reduce token count while preserving meaning.
 * Applies: collapse multiple newlines, trim lines, remove excessive blank lines.
 * Optionally truncates to maxTokens (by character estimate) and appends a note.
 */
export const optimizePromptForTokens = (
  text: string,
  options?: { maxTokens?: number; preserveCodeBlocks?: boolean }
): PromptOptimizationResult => {
  const suggestions: string[] = [];
  let optimized = text;

  // Collapse 3+ newlines to 2 (keeps section spacing but reduces blanks)
  const beforeNewlines = optimized.length;
  optimized = optimized.replace(/\n{3,}/g, "\n\n");
  if (optimized.length < beforeNewlines) {
    suggestions.push("Collapsed excessive blank lines");
  }

  // Trim each line (trailing spaces add tokens with no benefit)
  const lines = optimized.split("\n");
  const trimmedLines = lines.map((line) => line.trimEnd());
  optimized = trimmedLines.join("\n");
  const trimmedTotal = lines.reduce((acc, line) => acc + line.length, 0) - optimized.length;
  if (trimmedTotal > 0) {
    suggestions.push("Trimmed trailing whitespace from lines");
  }

  // Optional: hard cap by token estimate
  const maxTokens = options?.maxTokens;
  const originalTokens = estimateTokenCount(text);
  let optimizedTokens = estimateTokenCount(optimized);

  if (typeof maxTokens === "number" && maxTokens > 0 && optimizedTokens > maxTokens) {
    const maxChars = maxTokens * CHARS_PER_TOKEN_ESTIMATE;
    if (optimized.length > maxChars) {
      optimized = optimized.slice(0, maxChars);
      const cutPoint = optimized.lastIndexOf("\n");
      if (cutPoint > maxChars * 0.8) {
        optimized = optimized.slice(0, cutPoint + 1);
      }
      optimized = optimized.trimEnd();
      optimized += `\n\n[... prompt truncated to ~${maxTokens} tokens for context window limits ...]`;
      optimizedTokens = estimateTokenCount(optimized);
      suggestions.push(`Truncated to ~${maxTokens} tokens (${optimizedTokens} estimated)`);
    }
  }

  if (suggestions.length === 0) {
    suggestions.push("No optimizations applied; prompt is already compact");
  }

  return {
    optimizedText: optimized,
    originalTokens,
    optimizedTokens,
    suggestions,
  };
};
