import { StructuredTool } from "@langchain/core/tools";
import { MemorySaver } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { HumanMessage } from "@langchain/core/messages";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import fs from "fs";

const agentTools: StructuredTool[] = [
  new TavilySearchResults({ maxResults: 1 }),
];

const chatModel = new ChatOpenAI({
  modelName: "gpt-3.5-turbo",
  temperature: 0,
});

const checkpointer = new MemorySaver();

const agent = createReactAgent({
  tools: agentTools,
  llm: chatModel,
  checkpointSaver: checkpointer,
});

async function main() {
  const agentFinalState = await agent.invoke(
    { messages: [new HumanMessage("what is the current weather in sf")] },
    { configurable: { thread_id: "42" } }
  );

  console.log(
    agentFinalState.messages[agentFinalState.messages.length - 1].content
  );

  const agentNextState = await agent.invoke(
    { messages: [new HumanMessage("what about ny")] },
    { configurable: { thread_id: "42" } }
  );

  console.log(
    agentNextState.messages[agentNextState.messages.length - 1].content
  );

  const imageBlob = await agent.getGraph().drawMermaidPng();
  const imageArrayBuffer = await imageBlob.arrayBuffer();
  const imageBuffer = Buffer.from(imageArrayBuffer);

  fs.writeFileSync("./src/self-rag/images/graph.png", imageBuffer);
}

main();
