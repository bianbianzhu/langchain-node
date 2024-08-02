import { ConversationChain } from "langchain/chains";
import { ChatOpenAI } from "@langchain/openai";
import { BufferMemory } from "langchain/memory";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatMessageHistory } from "langchain/memory";

ChatMessageHistory;

const model = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0.1,
});

const memory = new BufferMemory({
  memoryKey: "chat_history",
  returnMessages: true,
});

const prompt = ChatPromptTemplate.fromMessages([
  ["system", "You are a helpful assistant who can answer user questions."],
  ["placeholder", "{chat_history}"],
  ["user", "{input}"],
]);

const chain2 = new ConversationChain({
  llm: model,
  // memory,
  // prompt,
});

(async () => {
  const response1 = await chain2.invoke({
    input: "my name is Jim Chou",
  });

  const response2 = await chain2.invoke({
    input: "What is my name",
  });

  // const response3 = await chain2.invoke({
  //   input: "What is your name?",
  // });

  console.log(response2.response);
})();
