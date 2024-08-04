import { RunnableConfig } from "@langchain/core/runnables";

async function main() {
  const config: RunnableConfig = {
    configurable: { thread_id: "42" },
    runName: "Customer Support Agent",
  };
}

main();
