import { RunnableConfig } from "@langchain/core/runnables";
import { appWithInterrupt, GraphState } from "./react-agent";

// ******How to pause before tools*****

// const workflowWithInterrupt = new StateGraph<GraphState>({
//     channels: graphState,
//   });

//   export const appWithInterrupt = workflowWithInterrupt
//     .addNode(GraphNodes.CallModel, callModel)
//     .addNode(GraphNodes.Tools, toolNode)

//     .addEdge(START, GraphNodes.CallModel)
//     .addConditionalEdges(GraphNodes.CallModel, shouldContinue, {
//       [GraphNodes.Tools]: GraphNodes.Tools,
//       [END]: END,
//     })
//     .addEdge(GraphNodes.Tools, GraphNodes.CallModel)
//     .compile({
//       checkpointer,
//       interruptBefore: [GraphNodes.Tools], // inline compile avoids typescript bug
//     });

async function main() {
  const config: RunnableConfig = {
    configurable: { thread_id: "43" },
  };

  const stateOne = (await appWithInterrupt.invoke(
    {
      messages: [["human", "what is the weather in Paris?"]],
    },
    config
  )) as GraphState;
  // Pause before tools (ToolNode)

  // Get State of the particular moment (the pause moment)
  const snapshot = await appWithInterrupt.getState(config);
  console.log(snapshot);
  // And the snapshot.next will be [ 'tools' ]

  // The full snapshot will be:
  //   {
  //     values: {
  //       messages: [
  //         HumanMessage {
  //           "content": "what is the weather in Paris?",
  //           "additional_kwargs": {},
  //           "response_metadata": {}
  //         },
  //         AIMessage {
  //           "id": "chatcmpl-9xaNQrKxxJtxZFkUzqwgrq0px97yE",
  //           "content": "",
  //           "additional_kwargs": {
  //             "tool_calls": [
  //               {
  //                 "id": "call_NdO0zpRRWyQxNSooBOwukv97",
  //                 "type": "function",
  //                 "function": "[Object]"
  //               }
  //             ]
  //           },
  //           "response_metadata": {
  //             "tokenUsage": {
  //               "completionTokens": 16,
  //               "promptTokens": 80,
  //               "totalTokens": 96
  //             },
  //             "finish_reason": "tool_calls",
  //             "system_fingerprint": "fp_48196bc67a"
  //           },
  //           "tool_calls": [
  //             {
  //               "name": "get_weather_per_city",
  //               "args": {
  //                 "city": "Paris"
  //               },
  //               "type": "tool_call",
  //               "id": "call_NdO0zpRRWyQxNSooBOwukv97"
  //             }
  //           ],
  //           "invalid_tool_calls": []
  //         }
  //       ]
  //     },
  //     next: [ 'tools' ],
  //     metadata: { source: 'loop', step: 1, writes: { call_model: [Object] } },
  //     config: {
  //       configurable: {
  //         thread_id: '43',
  //         checkpoint_id: '1ef5d66e-dd08-6d90-8001-eda49d06b5d3'
  //       }
  //     },
  //     createdAt: '2024-08-18T13:36:52.969Z',
  //     parentConfig: undefined
  //   }

  // Await human in the loop - allow the user to correct and update the state
  // for example, if one of the arguments is wrong, the user can correct it or if it is missing, the user can provide it.

  // Resume the execution

  //   You can resume by running the graph with a null input. The checkpoint is loaded, and with no new inputs, it will execute as if no interrupt had occurred.

  const finalState = await appWithInterrupt.invoke(null, snapshot.config);

  // console.log(finalState);

  const snapshot2 = await appWithInterrupt.getState(config);
  console.log("====================");
  console.log(snapshot2);
}

main();
