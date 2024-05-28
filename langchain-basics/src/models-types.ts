import { ChatOpenAI, OpenAI } from "@langchain/openai";
import { HumanMessage } from "@langchain/core/messages";

const llm = new OpenAI({
  model: "gpt-3.5-turbo-instruct",
});

const chatModel = new ChatOpenAI({
  model: "gpt-3.5-turbo",
});

async function main() {
  const userInput = "What is the capital of the United States?";

  // 1. LLM
  const llmResponse = await llm.invoke(userInput); // takes in a string and returns a string

  console.log(llmResponse); // type: string - "Washington D.C."

  // 2. Chat Model
  // 2.1 Convert user input to a message object
  const userMessage = new HumanMessage(userInput); // type: HumanMessage

  const lcName = HumanMessage.lc_name(); // 'HumanMessage'
  const messageType = userMessage._getType(); // 'human'
  lcName;
  messageType;

  // 2.2 Put the message object into an array (list of messages)
  const messages = [userMessage];

  const chatResponse = await chatModel.invoke(messages); // takes in a list of messages and returns a message

  console.log(chatResponse); // type: AIMessageChunk
}

main();
