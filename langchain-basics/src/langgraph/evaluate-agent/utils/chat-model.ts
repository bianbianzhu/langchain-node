import { ChatOpenAI } from "@langchain/openai";

const chatModel = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0,
});

export default chatModel;
