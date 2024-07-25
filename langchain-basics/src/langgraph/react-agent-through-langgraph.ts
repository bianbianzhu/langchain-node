import {
  HumanMessage,
  AIMessage,
  SystemMessage,
  BaseMessage,
} from "@langchain/core/messages";
import {
  END,
  MemorySaver,
  START,
  StateGraph,
  StateGraphArgs,
} from "@langchain/langgraph";
import { DynamicStructuredTool, StructuredTool } from "@langchain/core/tools";
import { z, ZodObject, ZodString } from "zod";
import { ChatOpenAI } from "@langchain/openai";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { visualization } from "./visualization";

// check this: https://langchain-ai.github.io/langgraphjs/tutorials/quickstart/
// which explains `createReactAgent` vs achieve the same with `Langgraph`

interface AgentState {
  messages: BaseMessage[];
}

type ToolParamSchema = ZodObject<{
  query: ZodString; // this makes sure `query` is required
}>;

const toolParamSchema: ToolParamSchema = z.object({
  query: z.string().describe("The query to use in your search"),
});

// Initial graph state - will be passed to the StateGraph constructor as an argument to the `channels` key
const graphState: StateGraphArgs<AgentState>["channels"] = {
  messages: {
    default: () => [new SystemMessage("Welcome to the chat!")], // initial state - optional
    // defines how updates from each node should be merged into the graph's state
    reducer: (x: BaseMessage[], y: BaseMessage[]) => {
      // x is the current state that passed into the node
      return x.concat(y);
    },
  },
};

// initialize the graph with the initial state
const workflow = new StateGraph<AgentState>({ channels: graphState });

// Custom tool
const searchTool = new DynamicStructuredTool({
  name: "search",
  description: "Call to surf the web",
  schema: toolParamSchema,
  // must be async function
  func: async ({ query }) => {
    if (query.toLowerCase().includes("melbourne")) {
      return "It's 10 degree and rainy in Melbourne";
    }

    return "It's 25 degree and sunny";
  },
});

/**
 * The issue to define tools as an array of DynamicStructuredTool here:
 * if toolParamSchema has no explicit type, error here:
 * Property 'query' is missing in type '{ [x: string]: any; }' but required in type '{ query: string; }'
 * { [x: string]: any; } is from `ZodAny` in DynamicStructuredTool<T extends ZodAny = ZodAny>
 * However, if we define toolParamSchema like
 * ```
 * type ToolParamSchema = ZodObject<{
  query: ZodString; // or Schema<string>
}>;
```
 * Same error occurs.
 * Only like:
 * ```
 * type ToolParamSchema = ZodObject<{
  query: Schema;
}>;
```
 * Error disappears.
 */

/**
 * That is why - don't use DynamicStructuredTool, but StructuredTool
 */
const tools: StructuredTool[] = [searchTool];

// The tools node that invokes tools: if the agent decides to take an action, this node will then execute that action.
const toolNode = new ToolNode<AgentState>(tools);

// Initialize the chatModel
const chatModel = new ChatOpenAI({
  model: "gpt-4o",
  temperature: 0,
});

// Bind the chatModel with the tools
const modelWithTools = chatModel.bindTools(tools);

// The agent node: responsible for deciding what (if any) actions to take.
// callModel is the main function of the node
async function callModel(state: AgentState): Promise<AgentState> {
  console.log("callModel");
  console.log(state.messages);
  const { messages } = state;
  const response = await modelWithTools.invoke(messages);

  return { messages: [response] }; // this [response] will be concatenated to the current state (x in the reducer)
}

// This is the `path` function that determines the next node to execute based on the current state
// This is NOT a node.
function next(state: AgentState): "tools" | typeof END {
  console.log("next");
  console.log(state.messages);
  const { messages } = state;

  const lastMessage = messages.at(-1) as AIMessage; // "agent" node links to `next` path function, so the last message must be AIMessage

  if (lastMessage.tool_calls?.length) {
    return "tools"; // this will not affect the state, but point to the next node
  }

  return END; // this will not affect the state, but point to the END node
}

const checkpointer = new MemorySaver();

/**
 * To following is not correct:
 * next returns "tools" or "__end__" (string)
 * So it cannot be added as a node due to the TS error:
 * Type 'string' is not assignable to type 'Partial<AgentState> | Promise<Partial<AgentState>>'.
 */
// workflow.addNode("next", next);

/**
 * Looks like doing the addNode and addEdge separately will violate the types
 * The following is not correct:
 */
// const workflowTest = new StateGraph<AgentState>({ channels: graphState });

// workflowTest.addNode("agent", callModel);
// workflowTest.addNode("tools", toolNode);

// workflowTest.addEdge(START, "agent"); // gives TS error on "agent"
// workflowTest.addConditionalEdges("agent", next); // gives TS error on "agent"
// workflowTest.addEdge("tools", "agent"); // gives TS error on "tools"

workflow
  .addNode("agent", callModel)
  .addNode("tools", toolNode)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", next) // A conditional edge means that the destination depends on the contents of the graph's state (AgentState). In our case, the destination is not known until the agent (LLM) decides.
  .addEdge("tools", "agent");

// Conditional edge: after the agent is called, we should either:
// a. Run tools if the agent said to take an action, OR
// b. Finish (respond to the user) if the agent did not ask to run tools

// Normal edge: after the tools are invoked, the graph should always return to the agent to decide what to do next

const app = workflow.compile({ checkpointer });

visualization(app);

async function main() {
  //   const finalState = await app.invoke(
  //     {
  //       messages: [new HumanMessage("what is the weather in melbourne")],
  //     },
  //     { configurable: { thread_id: "42" } }
  //   );

  //   console.log(finalState);

  const nextState = await app.invoke(
    {
      messages: [
        new HumanMessage(
          "what is the weather in Brisbane compared to Melbourne"
        ),
      ],
    },
    { configurable: { thread_id: "42" } } // really wired types for this object. If extracted, don't give the type to it
  );

  console.log(nextState.messages.at(-1).content);
}

main();

// 1. LangGraph adds the input message to the internal state (In START), then passes the state to the entrypoint node, "agent".
// 2. The "agent" node executes, invoking the chat model.
// 3. The chat model returns an AIMessage. LangGraph adds (concat) this to the state.
// 4. The graph cycles through the following steps until there are no more tool_calls on the AIMessage:

// a. (via next) If AIMessage has tool_calls, the "tools" node executes.
// b. The "agent" node executes again and returns an AIMessage.

// OR
// a. (via next) If AIMessage has no tool_calls, the graph reaches the END value.

// 5. Execution progresses to the special END value and outputs the final state. As a result, we get a list of all our chat messages as output.
