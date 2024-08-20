import { RunnableConfig } from "@langchain/core/runnables";
import { appWithInterrupt } from "./react-agent";

async function main() {
  const config: RunnableConfig = {
    configurable: { thread_id: "48" },
  };
}

main();
