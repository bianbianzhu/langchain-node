import appInit from "../../app";
import { ExampleInput, ExampleOutput } from "./dataset";
import { GraphState } from "../../graph-state";
import { HumanMessage } from "@langchain/core/messages";
import { RunnableConfig } from "@langchain/core/runnables";
import { CompiledStateGraph } from "@langchain/langgraph";

const config: RunnableConfig = {
  configurable: { thread_id: "predict-sql-agent-1" },
};

let appInstance: CompiledStateGraph<
  GraphState,
  Partial<Record<"messages", any>>,
  "__start__"
> | null = null;

/**
 * @param input - The type should be a single element of example.inputs
 */
export async function predictSQLAgentAnswer(
  args: ExampleInput
): Promise<ExampleOutput> {
  const app = await getAppInstance();

  const state: GraphState = {
    messages: [new HumanMessage(args.input)],
  };

  const res = (await app.invoke(state, config)) as GraphState;
  return {
    output: res.messages.at(-1)?.content as string, // get the string content of the last message (AI Message)
  };
}

// This is a singleton function to ensure that the app is only initialized once - otherwise Error:
// Adding a node to a graph that has already been compiled. This will not be reflected in the compiled graph.
// Error running target function: Error: Node `sql_agent` already present.
async function getAppInstance() {
  if (!appInstance) {
    appInstance = await appInit();
  }
  return appInstance;
}
