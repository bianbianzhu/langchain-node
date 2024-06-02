import readline from "readline";
import { ChatOpenAI } from "@langchain/openai";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const chatModel = new ChatOpenAI({
  modelName: "gpt-4o",
});
