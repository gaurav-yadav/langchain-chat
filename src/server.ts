import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { chatRouter } from "./routes/chat";
import { initializeChain } from "./initChain";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 4004;
initializeChain();
app.use("/chat", chatRouter);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
