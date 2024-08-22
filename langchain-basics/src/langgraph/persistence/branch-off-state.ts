import { RunnableConfig } from "@langchain/core/runnables";
import { appWithInterrupt, GraphNodes, GraphState } from "./react-agent";
import {
  HumanMessage,
  MessageType,
  isAIMessage,
  AIMessage,
  ToolMessage,
  ToolMessageFieldsWithToolCallId,
} from "@langchain/core/messages";
import { StateSnapshot } from "@langchain/langgraph/dist/pregel/types";

async function main() {
  const config: RunnableConfig = {
    configurable: { thread_id: "55" },
  };

  const state1 = await appWithInterrupt.invoke(
    {
      messages: [new HumanMessage("What is the weather today?")],
    } satisfies GraphState,
    config
  );

  const state2 = await appWithInterrupt.invoke(
    {
      messages: [new HumanMessage("I am in Melbourne")],
    } satisfies GraphState,
    config
  ); // interrupt before tools

  const history = appWithInterrupt.getStateHistory(config);

  let snapShotToStartBranchFrom: StateSnapshot | null = null;
  let targetedAIMessageWithToolCalls: AIMessage | null = null;

  for await (const snapshot of history) {
    // the flow will be interrupted before Tools, and the snapshot at that point should have a AI message with `tool_calls` field and an non-empty array of `tool_call` objects.

    // WE will use this snapshot to branch off from.
    const { messages } = snapshot.values as GraphState;
    // const lastMessage = messages[messages.length - 1]; // last message can be undefined when the messages array is empty (this happens at step -1, which the default state of the messages is an empty array)
    // SO Better use .at(-1)
    const lastMessage = messages.at(-1);

    if (
      lastMessage !== undefined &&
      isAIMessage(lastMessage) &&
      lastMessage.tool_calls &&
      lastMessage.tool_calls.length > 0
    ) {
      targetedAIMessageWithToolCalls = lastMessage;
      snapShotToStartBranchFrom = snapshot;
      break;

      /** 
       The `break;` statement in this context is used to exit the loop immediately when the specified condition is met. Here’s a step-by-step explanation:
       
       The code iterates over a collection of snapshots (not shown in the excerpt).
       For each snapshot, it extracts the messages array from snapshot.values.
       It retrieves the last message in the messages array using .at(-1).
       It checks if the lastMessage is defined, is an AI message, has a tool_calls field, and if that field is a non-empty array.
       If all these conditions are met, it assigns the current snapshot to snapShotToStartBranchFrom and then uses break; to exit the loop immediately, preventing any further iterations.
       In summary, break; stops the loop as soon as the desired snapshot is found, which optimizes the process by avoiding unnecessary iterations.
      */
    }
  }

  if (targetedAIMessageWithToolCalls === null) {
    throw new Error("Targeted AI message with tool calls not found");
  }

  if (snapShotToStartBranchFrom === null) {
    throw new Error("Snapshot to start branch from not found");
  }

  // Branch off from the snapshot using its config as the anchor point

  // 1. Simulating calling a new tool by adding a new tool message

  // Define a new tool message
  const mockToolMessage = new ToolMessage(
    "The weather is 38 degrees and sunny",
    targetedAIMessageWithToolCalls.tool_calls?.[0].id ?? ""
  );

  // OR using the `ToolMessageFieldsWithToolCallId` interface
  // const mockToolMessage = new ToolMessage({
  //   tool_call_id: // required
  //     targetedAIMessageWithToolCalls.tool_calls?.[0].id ?? "unknown",
  //   name: "get_weather_per_city",
  //   content: "The weather is 38 degrees and sunny", // required
  // });

  // 2. Start branching off from the snapshot

  const branchConfig = await appWithInterrupt.updateState(
    // updateState returns a RunnableConfig(promised)
    snapShotToStartBranchFrom.config,
    { messages: [mockToolMessage] },

    // Updates are applied "as if" they were coming from a node.
    // By default, the updates will come from the last node to run.
    // In our case, we want to treat this update as if it came from the tools node, so that the next node to run will be the agent.

    // in the code, this specifies the node that `writes` the state
    /**
    "writes": {
      "tools": { // >>>>>>>>>>> The tools write the state <<<<<<<<<<<<
        "messages": [
          {
            "lc": 1,
            "type": "constructor",
            "id": [
              "langchain_core",
              "messages",
              "ToolMessage"
            ],
            "kwargs": {
              "content": "The weather is 38 degrees and sunny",
              "tool_call_id": "call_yV6B1VrG6NXE6hcnh1BhhTTB",
              "additional_kwargs": {},
              "response_metadata": {}
            }
          }
        ]
      }
     */
    GraphNodes.Tools // asNode?
  );

  // 3. Run from the new branch
  const finalState = await appWithInterrupt.invoke(null, branchConfig);

  const branchedHistory = appWithInterrupt.getStateHistory(branchConfig);

  for await (const snapshot of branchedHistory) {
    console.log(`======${snapshot.metadata?.step}========`);
    console.log(JSON.stringify(snapshot, null, 2));
  }
}

main();
