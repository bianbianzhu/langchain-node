import { createOpenAIToolsAgent, AgentExecutor } from "langchain/agents";
import { chatModel } from "./chatModel";
import { createTools } from "./tools";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";

const prompt = ChatPromptTemplate.fromMessages([
  ["system", "You are a helpful assistant named Bob."],
  new MessagesPlaceholder("chat_history"),
  ["user", "Question: {input}"],
  new MessagesPlaceholder("agent_scratchpad"),
]);

export async function createAgentExecutor(): Promise<AgentExecutor> {
  // get tools
  const tools = await createTools();

  // create an agent
  const agent = await createOpenAIToolsAgent({
    llm: chatModel,
    tools,
    prompt,
  });

  // create an agent executor
  const agentExecutor = new AgentExecutor({
    agent,
    tools,
  });

  return agentExecutor;
}
