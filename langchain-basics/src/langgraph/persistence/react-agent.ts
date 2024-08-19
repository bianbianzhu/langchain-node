// Once you start checkpointing your graphs, you can easily get or update the state of the agent at any point in time. This permits a few things:

// You can surface a state during an interrupt to a user to let them accept an action.
// You can rewind the graph to reproduce or avoid issues.
// You can modify the state to embed your agent into a larger system, or to let the user better control its actions.

import { BaseMessage } from "@langchain/core/messages";
import {
  END,
  MemorySaver,
  messagesStateReducer,
  START,
  StateGraph,
  StateGraphArgs,
} from "@langchain/langgraph";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { RunnableConfig } from "@langchain/core/runnables";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { isAIMessage, HumanMessage } from "@langchain/core/messages";

export interface GraphState {
  messages: BaseMessage[];
}

enum GraphNodes {
  CallModel = "call_model",
  Tools = "tools",
}

const graphState: StateGraphArgs<GraphState>["channels"] = {
  messages: {
    default: () => [],
    reducer: messagesStateReducer,
  },
};

const chatModel = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0.3,
});

const getWeatherPerCity = tool(
  (args) => {
    return `The weather in ${args.city} is 10 degrees and rainy`;
  },
  {
    name: "get_weather_per_city",
    description: "Use to get the weather for a specific city",
    schema: z.object({
      city: z.string().describe("The name of the city to get the weather for"),
    }),
  }
);

// const step1 = tool(
//   (args) => {
//     return `The result from step 1 for ${args.query}: put the kettle on`;
//   },
//   {
//     name: "making_coffee_step_one_tool",
//     description:
//       "Use to perform the first step in the process of completing the task: how to make a cup of coffee",
//     schema: z.object({
//       query: z.string().describe("The task to perform"),
//     }),
//   }
// );

// const step2 = tool(
//   (args) => {
//     return `The result from step 2 for ${args.query}: pour the water into the cup`;
//   },
//   {
//     name: "making_coffee_step_two_tool",
//     description:
//       "Use to perform the second step in the process of completing the task: how to make a cup of coffee",
//     schema: z.object({
//       query: z.string().describe("The task to perform"),
//     }),
//   }
// );

// const step3 = tool(
//   (args) => {
//     return `The result from step 3 for ${args.query}: add the coffee to the cup`;
//   },
//   {
//     name: "making_coffee_step_three_tool",
//     description:
//       "Use to perform the third step in the process of completing the task: how to make a cup of coffee",
//     schema: z.object({
//       query: z.string().describe("The task to perform"),
//     }),
//   }
// );

const workflow = new StateGraph<GraphState>({ channels: graphState });

async function callModel(
  state: GraphState,
  config?: RunnableConfig
): Promise<GraphState> {
  const { messages } = state;

  const prompt = ChatPromptTemplate.fromMessages<{ messages: BaseMessage[] }>([
    [
      "system",
      "You are a helpful assistant that can help people answer questions.",
    ],
    ["placeholder", "{messages}"],
  ]);

  const modelWithTools = chatModel.bindTools([getWeatherPerCity]);

  const chain = prompt.pipe(modelWithTools);

  const res = await chain.invoke({ messages }, config); // passing the config here is not necessary

  //   console.log(`The config passed to callModel is: ${JSON.stringify(config)}`);

  return { messages: [res] };
}

const toolNode = new ToolNode<GraphState>([getWeatherPerCity]);

function shouldContinue(state: GraphState): GraphNodes.Tools | typeof END {
  const { messages } = state;
  const lastMessage = messages[messages.length - 1];

  if (
    isAIMessage(lastMessage) &&
    lastMessage.tool_calls &&
    lastMessage.tool_calls.length > 0
  ) {
    return GraphNodes.Tools;
  }

  return END;
}

workflow
  .addNode(GraphNodes.CallModel, callModel)
  .addNode(GraphNodes.Tools, toolNode)

  .addEdge(START, GraphNodes.CallModel)
  .addConditionalEdges(GraphNodes.CallModel, shouldContinue, {
    [GraphNodes.Tools]: GraphNodes.Tools,
    [END]: END,
  })
  .addEdge(GraphNodes.Tools, GraphNodes.CallModel);

const checkpointer = new MemorySaver();

export const app = workflow.compile({ checkpointer });

// TS bug, Must compile inline
// export const appWithInterrupt = workflow.compile({
//   checkpointer,
//   interruptBefore: [GraphNodes.Tools], // this has a typescript bug
// });

const workflowWithInterrupt = new StateGraph<GraphState>({
  channels: graphState,
});

export const appWithInterrupt = workflowWithInterrupt
  .addNode(GraphNodes.CallModel, callModel)
  .addNode(GraphNodes.Tools, toolNode)

  .addEdge(START, GraphNodes.CallModel)
  .addConditionalEdges(GraphNodes.CallModel, shouldContinue, {
    [GraphNodes.Tools]: GraphNodes.Tools,
    [END]: END,
  })
  .addEdge(GraphNodes.Tools, GraphNodes.CallModel)
  .compile({
    checkpointer,
    interruptBefore: [GraphNodes.Tools], // inline compile avoids typescript bug
  });

// (async () => {
//   const config: RunnableConfig = {
//     configurable: { thread_id: "1234" },
//   };

//   const state1 = await app.invoke(
//     {
//       messages: [new HumanMessage("My name is john")],
//     },
//     config
//   );

//   const state2 = await app.invoke(
//     {
//       messages: [new HumanMessage("What is my name")],
//     },
//     config
//   );
//   // do stream
//   const state3 = await app.invoke(
//     {
//       messages: [new HumanMessage("how to make coffee")],
//     },
//     config
//   );

//   console.log(state3);
// })();
