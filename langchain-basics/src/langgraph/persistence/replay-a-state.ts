import { RunnableConfig } from "@langchain/core/runnables";
import { appWithInterrupt, GraphState } from "./react-agent";
import { StateSnapshot } from "@langchain/langgraph/dist/pregel/types";
import { BaseMessage } from "@langchain/core/messages";

async function main() {
  const config: RunnableConfig = {
    configurable: { thread_id: "48" },
  };

  const state1 = await appWithInterrupt.invoke(
    {
      messages: [["human", "What is the weather today?"]],
    },
    config
  );

  const snapshot1 = await appWithInterrupt.getState(config);

  const state2 = await appWithInterrupt.invoke(
    {
      messages: [["human", "I am in Melbourne"]],
    },
    config
  );

  const snapshot2 = await appWithInterrupt.getState(config);

  const finalState = await appWithInterrupt.invoke(null, config);

  const history = appWithInterrupt.getStateHistory(config);

  let snapShotToRewindTo: StateSnapshot | null = null;

  for await (const snapshot of history) {
    //====================LOGGING====================
    // console.log(`====Step ${snapshot.metadata?.step}====`);
    // console.log(JSON.stringify(snapshot, null, 2));

    // console.log(`next: [ ${snapshot.next} ]`);
    // console.log(
    //   `writes: ${JSON.stringify(snapshot.metadata?.writes, null, 2)}`
    // );
    // console.log(
    //   `checkpoint_id: ${snapshot.config.configurable?.checkpoint_id}`
    // );
    // console.log(`Messages: [${snapshot.values.messages}]`);

    //====================FIND THE Snapshot to rewind to====================
    if ((snapshot.values as GraphState).messages.length === 3) {
      // snapshot.values.messages: [HumanMessage, AIMessage, HumanMessage("I am in Melbourne")]
      snapShotToRewindTo = snapshot;

      // console.log("Rewinding to step", snapShotToRewindTo);
    }
  }

  if (snapShotToRewindTo === null) {
    throw new Error("Snapshot to rewind to not found");
  }

  // use the config as the anchor point
  // still input `null` to invoke
  const rewindState = await appWithInterrupt.invoke(
    null,
    snapShotToRewindTo.config
  );

  const historyWithRewind = appWithInterrupt.getStateHistory(config);

  for await (const snapshot of historyWithRewind) {
    //====================LOGGING================
    console.log(`====Step ${snapshot.metadata?.step}====`);

    console.log(`next: [ ${snapshot.next} ]`);
    console.log(
      `writes: ${JSON.stringify(snapshot.metadata?.writes, null, 2)}`
    );
    console.log(
      `checkpoint_id: ${snapshot.config.configurable?.checkpoint_id}`
    );
    console.log(`Messages: [${snapshot.values.messages}]`);
  }
}

main();

/** Full log
====Step 4==== >>>>>>>> **REWIND TO STEP 3 (The end of step 3)** and immediately START STEP 4 <<<<<<<<
next: [ tools ]
writes: {
  "call_model": {
    "messages": [
      {
        "lc": 1,
        "type": "constructor",
        "id": [
          "langchain_core",
          "messages",
          "AIMessage"
        ],
        "kwargs": {
          "content": "",
          "tool_calls": [
            {
              "name": "get_weather_per_city",
              "args": {
                "city": "Melbourne"
              },
              "type": "tool_call",
              "id": "call_qCdgIsUWsEPIg8AEBnnsAr5m"
            }
          ],
          "invalid_tool_calls": [],
          "additional_kwargs": {
            "tool_calls": [
              {
                "id": "call_qCdgIsUWsEPIg8AEBnnsAr5m",
                "type": "function",
                "function": {
                  "name": "get_weather_per_city",
                  "arguments": "{\"city\":\"Melbourne\"}"
                }
              }
            ]
          },
          "response_metadata": {
            "tokenUsage": {
              "completionTokens": 17,
              "promptTokens": 107,
              "totalTokens": 124
            },
            "finish_reason": "tool_calls",
            "system_fingerprint": "fp_507c9469a1"
          },
          "id": "chatcmpl-9yJjMgaYknifnYcpFDF09DhbsDcIM"
        }
      }
    ]
  }
}
checkpoint_id: 1ef5efcd-8990-6050-8004-d3c9f4f42c56
Messages: [[object HumanMessage],[object AIMessage],[object HumanMessage],[object AIMessage]]

====Step 6==== >>>>>>>>>> END OF 2nd RUN <<<<<<<<<<<<
next: [  ]
writes: {
  "call_model": {
    "messages": [
      {
        "lc": 1,
        "type": "constructor",
        "id": [
          "langchain_core",
          "messages",
          "AIMessage"
        ],
        "kwargs": {
          "content": "Today in Melbourne, the weather is 10 degrees Celsius and rainy.",
          "tool_calls": [],
          "invalid_tool_calls": [],
          "additional_kwargs": {},
          "response_metadata": {
            "tokenUsage": {
              "completionTokens": 15,
              "promptTokens": 144,
              "totalTokens": 159
            },
            "finish_reason": "stop",
            "system_fingerprint": "fp_48196bc67a"
          },
          "id": "chatcmpl-9yJjKQMMaUink1gMN8LTBLXMBTI0L"
        }
      }
    ]
  }
}
checkpoint_id: 1ef5efcd-778c-6340-8006-fc183e71853f
Messages: [[object HumanMessage],[object AIMessage],[object HumanMessage],[object AIMessage],[object ToolMessage],[object AIMessage]]

====Step 5====
next: [ call_model ]
writes: {
  "tools": {
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
          "content": "The weather in Melbourne is 10 degrees and rainy",
          "tool_call_id": "call_tPGJmpnm2kVXSTO1L3Ry4q5Q",
          "name": "get_weather_per_city",
          "additional_kwargs": {},
          "response_metadata": {}
        }
      }
    ]
  }
}
checkpoint_id: 1ef5efcd-6ee5-6d90-8005-e6d85f96d251
Messages: [[object HumanMessage],[object AIMessage],[object HumanMessage],[object AIMessage],[object ToolMessage]]

====Step 4==== >>>>>>>>>> BEFORE TOOLS INTERRUPT AND RESUMED <<<<<<<<<<
next: [ tools ]
writes: {
  "call_model": {
    "messages": [
      {
        "lc": 1,
        "type": "constructor",
        "id": [
          "langchain_core",
          "messages",
          "AIMessage"
        ],
        "kwargs": {
          "content": "",
          "tool_calls": [
            {
              "name": "get_weather_per_city",
              "args": {
                "city": "Melbourne"
              },
              "type": "tool_call",
              "id": "call_tPGJmpnm2kVXSTO1L3Ry4q5Q"
            }
          ],
          "invalid_tool_calls": [],
          "additional_kwargs": {
            "tool_calls": [
              {
                "id": "call_tPGJmpnm2kVXSTO1L3Ry4q5Q",
                "type": "function",
                "function": {
                  "name": "get_weather_per_city",
                  "arguments": "{\"city\":\"Melbourne\"}"
                }
              }
            ]
          },
          "response_metadata": {
            "tokenUsage": {
              "completionTokens": 17,
              "promptTokens": 107,
              "totalTokens": 124
            },
            "finish_reason": "tool_calls",
            "system_fingerprint": "fp_507c9469a1"
          },
          "id": "chatcmpl-9yJjJRRnI0kPqpeQRKPobghsa4sd9"
        }
      }
    ]
  }
}
checkpoint_id: 1ef5efcd-6b43-6ac0-8004-2ea02ee2ea7e
Messages: [[object HumanMessage],[object AIMessage],[object HumanMessage],[object AIMessage]]

====Step 3==== >>>>>>> 2nd RUN START <<<<<<<<
next: [ call_model ]
writes: null
checkpoint_id: 1ef5efcd-6140-6320-8003-464aaa07375f
Messages: [[object HumanMessage],[object AIMessage],[object HumanMessage]]

====Step 2==== >>>>>>>> 2nd RUN BEFORE START <<<<<<<<
next: [ __start__ ]
writes: {
  "__start__": {
    "messages": [
      [
        "human",
        "I am in Melbourne"
      ]
    ]
  }
}
checkpoint_id: 1ef5efcd-613b-6500-8002-37f1858f30cf
Messages: [[object HumanMessage],[object AIMessage]]

====Step 1==== >>>>>>> END OF 1st RUN <<<<<<<<
next: [  ]
writes: {
  "call_model": {
    "messages": [
      {
        "lc": 1,
        "type": "constructor",
        "id": [
          "langchain_core",
          "messages",
          "AIMessage"
        ],
        "kwargs": {
          "content": "Could you please specify the city for which you would like to know the weather?",
          "tool_calls": [],
          "invalid_tool_calls": [],
          "additional_kwargs": {},
          "response_metadata": {
            "tokenUsage": {
              "completionTokens": 17,
              "promptTokens": 79,
              "totalTokens": 96
            },
            "finish_reason": "stop",
            "system_fingerprint": "fp_48196bc67a"
          },
          "id": "chatcmpl-9yJjHPDXUfcw3HYSHu5i9plDBefXJ"
        }
      }
    ]
  }
}
checkpoint_id: 1ef5efcd-5e66-6370-8001-f39f11d2ff55
Messages: [[object HumanMessage],[object AIMessage]]

====Step 0==== >>>>>> START OF 1st RUN <<<<<<
next: [ call_model ]
writes: null
checkpoint_id: 1ef5efcd-54b5-6bf0-8000-8e5302f83160
Messages: [[object HumanMessage]]

====Step -1==== >>>>>>> 1st RUN BEFORE START <<<<<<<<
next: [ __start__ ]
writes: {
  "__start__": {
    "messages": [
      [
        "human",
        "What is the weather today?"
      ]
    ]
  }
}
checkpoint_id: 1ef5efcd-548c-63e1-ffff-4c4b86f4ede9
Messages: []
 */
