// By default callbacks run in-line with the your chain/LLM run.
// This means that if you have a slow callback you can see an impact on the overall latency of your runs.
// You can make callbacks not be awaited by setting the environment variable LANGCHAIN_CALLBACKS_BACKGROUND=true.
// This will cause the callbacks to be run in the background, and will not impact the overall latency of your runs. When you do this you might need to await all pending callbacks before exiting your application. You can do this with the following method:

// import { awaitAllCallbacks } from "@langchain/core/callbacks/promises";

// await awaitAllCallbacks();
