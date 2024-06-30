import express from "express";
import { BaseMessage } from "@langchain/core/messages";
import { chain, isChainInitialized, model } from "../initChain";
import { estimateTokenCount, estimateCost } from "../utils";

const router = express.Router();

router.post("/", async (req, res) => {
  if (!isChainInitialized) {
    return res.status(503).json({
      error:
        "The AI model is still initializing. Please try again in a moment.",
    });
  }

  const { question, history } = req.body;

  // Input validation
  if (typeof question !== "string" || question.length > 500) {
    return res.status(400).json({ error: "Invalid question format or length" });
  }

  if (!Array.isArray(history)) {
    return res.status(400).json({ error: "Invalid history format" });
  }

  try {
    console.log("\n--- New Chat Request ---");
    console.log(`Question: ${question}`);
    console.log(`Chat History: ${JSON.stringify(history)}`);

    const chat_history: BaseMessage[] = history || [];

    const startTime = Date.now();

    console.log("\n--- Chain Invocation ---");
    const chainStartTime = Date.now();
    const response = await chain.invoke({
      chat_history,
      input: question,
    });
    console.log("Chain Response:");
    console.log(JSON.stringify(response, null, 2));
    console.log(`Chain Invocation Time: ${Date.now() - chainStartTime}ms`);

    const endTime = Date.now();

    // Estimate token count and cost
    const inputTokens =
      estimateTokenCount(question) +
      estimateTokenCount(JSON.stringify(chat_history));
    const outputTokens = estimateTokenCount(response.answer);
    const estimatedCost = estimateCost(inputTokens, outputTokens);

    console.log("\n--- Request Summary ---");
    console.log(`Model used: ${model.modelName}`);
    console.log(`Estimated input tokens: ${inputTokens}`);
    console.log(`Estimated output tokens: ${outputTokens}`);
    console.log(`Estimated cost: $${estimatedCost.toFixed(6)}`);
    console.log(`Total response time: ${endTime - startTime}ms`);

    res.json(response);
  } catch (error) {
    console.error("\n--- Error ---");
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while processing your request." });
  }
});

export const chatRouter = router;
