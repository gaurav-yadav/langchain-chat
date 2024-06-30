import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { chatRouter } from "./routes/chat";
import { initializeChain } from "./initChain";

dotenv.config();

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",")
    : "http://localhost:4004",
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

app.use(express.json({ limit: "1mb" })); // Limit body size

const PORT = process.env.PORT || 4004;

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, "public")));

// Serve the chat API
app.use("/api/chat", chatRouter);

// Serve index.html for the root route and any other unmatched routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

async function startServer() {
  console.log("Starting server initialization...");
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set in the environment variables");
    }
    if (!process.env.DATA_DIRECTORY) {
      throw new Error("DATA_DIRECTORY is not set in the environment variables");
    }
    await initializeChain();
    console.log("Chain initialization completed successfully.");
  } catch (error) {
    console.error("Error during chain initialization:", error);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Chat interface available at http://localhost:${PORT}`);
  });
}

startServer();
