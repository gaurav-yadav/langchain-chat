import { ChatOpenAI } from "@langchain/openai";
import {
  HNSWLib,
  HNSWLibArgs,
} from "@langchain/community/vectorstores/hnswlib";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings } from "@langchain/openai";
import { createRetrievalChain } from "langchain/chains/retrieval";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { Document } from "langchain/document";
import fs from "fs";
import path from "path";

let chain: any;
let isChainInitialized = false;
let model: ChatOpenAI;

const VECTOR_STORE_PATH = path.join(process.cwd(), "vector_store");
const METADATA_PATH = path.join(process.cwd(), "vector_store_metadata.json");

interface FileMetadata {
  [filename: string]: {
    size: number;
    lastProcessed: number;
  };
}

function loadMetadata(): FileMetadata {
  if (fs.existsSync(METADATA_PATH)) {
    return JSON.parse(fs.readFileSync(METADATA_PATH, "utf-8"));
  }
  return {};
}

function saveMetadata(metadata: FileMetadata) {
  fs.writeFileSync(METADATA_PATH, JSON.stringify(metadata, null, 2));
}

async function processFile(
  filePath: string,
  textSplitter: RecursiveCharacterTextSplitter
): Promise<Document[]> {
  const text = fs.readFileSync(filePath, "utf8");
  return await textSplitter.createDocuments([text], [{ source: filePath }]);
}

export async function initializeChain() {
  const dataDir = process.env.DATA_DIRECTORY;

  if (!dataDir) {
    throw new Error("DATA_DIRECTORY environment variable is not set");
  }

  console.log(`Initializing chain with data directory: ${dataDir}`);

  const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000 });
  let vectorStore: HNSWLib;
  let metadata = loadMetadata();
  let docsToProcess: Document[] = [];
  let filesToRemove = new Set(Object.keys(metadata));

  const embeddings = new OpenAIEmbeddings();
  const args: HNSWLibArgs = {
    space: "cosine",
    numDimensions: 1536, // This is the default for OpenAI embeddings
  };
  // Check if vector store exists
  if (fs.existsSync(VECTOR_STORE_PATH)) {
    console.log("Loading existing vector store...");
    vectorStore = await HNSWLib.load(VECTOR_STORE_PATH, embeddings);
  } else {
    console.log("Creating new vector store...");
    const args: HNSWLibArgs = {
      space: "cosine",
      numDimensions: 1536, // This is the default for OpenAI embeddings
    };
    vectorStore = new HNSWLib(embeddings, args);
  }

  // Process files
  const files = fs.readdirSync(dataDir);
  console.log(`Found ${files.length} files in the data directory.`);

  let processedCount = 0;
  let unchangedCount = 0;

  for (const file of files) {
    if (path.extname(file).toLowerCase() === ".txt") {
      const filePath = path.join(dataDir, file);
      const stats = fs.statSync(filePath);

      filesToRemove.delete(file);

      if (!metadata[file] || metadata[file].size !== stats.size) {
        console.log(`Processing file: ${file}`);
        const docs = await processFile(filePath, textSplitter);
        docsToProcess.push(...docs);
        metadata[file] = { size: stats.size, lastProcessed: Date.now() };
        processedCount++;
      } else {
        unchangedCount++;
      }
    }
  }

  console.log(`Processed ${processedCount} new or modified files.`);
  console.log(`${unchangedCount} files were unchanged.`);

  // Remove deleted files from vector store
  if (filesToRemove.size > 0) {
    console.log(
      `Removing ${filesToRemove.size} deleted files from vector store...`
    );
    const allDocs = await vectorStore.similaritySearch(
      "",
      vectorStore.index.getMaxElements()
    );
    const docsToKeep = allDocs.filter(
      (doc) => !filesToRemove.has(path.basename(doc.metadata.source))
    );

    // Recreate the vector store with only the documents to keep
    vectorStore = await HNSWLib.fromDocuments(docsToKeep, embeddings, args);

    for (const file of filesToRemove) {
      delete metadata[file];
    }
  }

  // Add new documents to vector store
  if (docsToProcess.length > 0) {
    console.log(
      `Adding ${docsToProcess.length} new documents to vector store...`
    );
    await vectorStore.addDocuments(docsToProcess);
  }

  // Save updated metadata
  saveMetadata(metadata);

  // Save vector store
  await vectorStore.save(VECTOR_STORE_PATH);

  const retriever = vectorStore.asRetriever();

  model = new ChatOpenAI({
    temperature: 0,
    modelName: "gpt-4",
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
  console.log("Chain initialization complete.");
}

export { chain, isChainInitialized, model };
