import { RunnableConfig } from "@langchain/core/runnables";
import { appWithInterrupt } from "./react-agent";
import { HumanMessage } from "@langchain/core/messages";

async function main() {
  const config: RunnableConfig = {
    configurable: { thread_id: "43" },
  };

  const interruptState = await appWithInterrupt.invoke(
    {
      messages: [new HumanMessage("what is the weather in Paris?")],
    },
    config
  ); // interrupt before tools

  const finalState = await appWithInterrupt.invoke(null, config); // resume

  // The type of `fullStateHistory` is AsyncIterableIterator<StateSnapshot>
  const fullStateHistory = appWithInterrupt.getStateHistory(config);

  for await (const stateSnapshot of fullStateHistory) {
    console.log(`======${stateSnapshot.metadata?.step}========`);
    console.log(JSON.stringify(stateSnapshot, null, 2));
  }
}

main();
