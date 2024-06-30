import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { ChatOpenAI } from "@langchain/openai";
import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings } from "@langchain/openai";
import { createRetrievalChain } from "langchain/chains/retrieval";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { BaseMessage } from "@langchain/core/messages";
import fs from "fs";
import path from "path";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 4004;

let chain: any;
let isChainInitialized = false;
let model: ChatOpenAI;

// Function to estimate token count (very rough estimate)
function estimateTokenCount(text: string): number {
  return Math.ceil(text.split(/\s+/).length * 1.3);
}

// Function to estimate cost (based on gpt-3.5-turbo pricing)
function estimateCost(inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens * 0.0015) / 1000;
  const outputCost = (outputTokens * 0.002) / 1000;
  return inputCost + outputCost;
}

async function initializeChain() {
  const dataDir = process.env.DATA_DIRECTORY;

  if (!dataDir) {
    throw new Error("DATA_DIRECTORY environment variable is not set");
  }

  const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000 });
  let docs = [];

  // Read all text files in the specified directory
  const files = fs.readdirSync(dataDir);
  for (const file of files) {
    if (path.extname(file).toLowerCase() === ".txt") {
      const filePath = path.join(dataDir, file);
      const text = fs.readFileSync(filePath, "utf8");
      const fileDocs = await textSplitter.createDocuments([text]);
      docs.push(...fileDocs);
    }
  }

  if (docs.length === 0) {
    throw new Error("No text files found in the specified directory");
  }

  const vectorStore = await HNSWLib.fromDocuments(docs, new OpenAIEmbeddings());
  const retriever = vectorStore.asRetriever();

  model = new ChatOpenAI({
    temperature: 0,
    modelName: "gpt-4o", // You can change this to the model you want to use
  });

  console.log(`Using model: ${model.modelName}`);

  const qaPrompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      "You are an assistant for question-answering tasks. Use the following pieces of retrieved context to answer the question. If you don't know the answer, just say that you don't know. Use three sentences maximum and keep the answer concise.\n\n{context}",
    ],
    new MessagesPlaceholder("chat_history"),
    ["human", "{input}"],
  ]);

  const combineDocsChain = await createStuffDocumentsChain({
    llm: model,
    prompt: qaPrompt,
  });

  chain = await createRetrievalChain({
    retriever,
    combineDocsChain,
  });

  isChainInitialized = true;
}

initializeChain().catch(console.error);

app.post("/chat", async (req, res) => {
  if (!isChainInitialized) {
    return res
      .status(503)
      .json({
        error:
          "The AI model is still initializing. Please try again in a moment.",
      });
  }

  const { question, history } = req.body;

  try {
    const chat_history: BaseMessage[] = history || [];

    const startTime = Date.now();
    const response = await chain.invoke({
      chat_history,
      input: question,
    });
    const endTime = Date.now();

    // Estimate token count and cost
    const inputTokens =
      estimateTokenCount(question) +
      estimateTokenCount(JSON.stringify(chat_history));
    const outputTokens = estimateTokenCount(response.answer);
    const estimatedCost = estimateCost(inputTokens, outputTokens);

    console.log(`Model used: ${model.modelName}`);
    console.log(`Estimated input tokens: ${inputTokens}`);
    console.log(`Estimated output tokens: ${outputTokens}`);
    console.log(`Estimated cost: $${estimatedCost.toFixed(6)}`);
    console.log(`Response time: ${endTime - startTime}ms`);

    res.json(response);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while processing your request." });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
