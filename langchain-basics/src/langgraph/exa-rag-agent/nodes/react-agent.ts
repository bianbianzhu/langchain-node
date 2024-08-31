import { createReactAgent } from "@langchain/langgraph/prebuilt";
import retrieveTool from "../tools/create-retriever-tool";
import { ChatAnthropic } from "@langchain/anthropic";
import { MemorySaver } from "@langchain/langgraph";
import { RunnableConfig } from "@langchain/core/runnables";

const chatModel = new ChatAnthropic({
  model: "claude-3-5-sonnet-20240620",
  temperature: 0.1,
});

const checkpointer = new MemorySaver();

const reactAgent = createReactAgent({
  tools: [retrieveTool],
  llm: chatModel,
  checkpointSaver: checkpointer,
});

async function main() {
  const config: RunnableConfig = {
    configurable: { thread_id: "0828" },
  };

  const res = await reactAgent.invoke(
    { messages: [["human", "fascinating article about cats"]] },
    config
  );

  const history = reactAgent.getStateHistory(config);

  for await (const snapshot of history) {
    console.log(`=====Step ${snapshot.metadata?.step}====`);
    console.log(snapshot);
  }
}

main();
