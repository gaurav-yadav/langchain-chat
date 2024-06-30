// Function to estimate token count (very rough estimate)
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.split(/\s+/).length * 1.3);
}

// Function to estimate cost (based on gpt-3.5-turbo pricing)
export function estimateCost(
  inputTokens: number,
  outputTokens: number
): number {
  const inputCost = (inputTokens * 0.0015) / 1000;
  const outputCost = (outputTokens * 0.002) / 1000;
  return inputCost + outputCost;
}
