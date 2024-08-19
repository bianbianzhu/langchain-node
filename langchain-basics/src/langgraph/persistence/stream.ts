import { RunnableConfig } from "@langchain/core/runnables";
import { IterableReadableStream } from "@langchain/core/utils/stream";
import { app, GraphState } from "./react-agent";

async function main() {
  const config: RunnableConfig = {
    configurable: { thread_id: "42" },
  };

  const res = (await app.stream(
    {
      messages: [["human", "what is the weather in Paris?"]],
    },
    {
      ...config,
      // only adding `streamMode` here (but no in the RunnableConfig above), will have no TS error.
      streamMode: "values",
    }
  )) as IterableReadableStream<GraphState>;

  for await (const chunk of res) {
    const { messages } = chunk;

    console.log(messages);
  }
}

main();
