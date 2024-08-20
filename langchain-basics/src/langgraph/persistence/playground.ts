import {
  END,
  MemorySaver,
  START,
  StateGraph,
  StateGraphArgs,
} from "@langchain/langgraph";
import { RunnableConfig } from "@langchain/core/runnables";
import { visualization } from "../visualization";

interface GraphState {
  messages: string[];
  flag?: "internal" | "external";
}

const graphState: StateGraphArgs<GraphState>["channels"] = {
  messages: {
    default: () => [],
    reducer: (x, y: string[]) => x.concat(y),
  },
  flag: {
    default: () => "internal",
    reducer: (x, y?: "internal" | "external") => (y ? y : x),
  },
};

const workflow = new StateGraph<GraphState>({ channels: graphState });

class GraphNode {
  private _value: string;

  constructor(value: string) {
    this._value = value;
  }

  public call(state: GraphState): Pick<GraphState, "messages"> {
    console.log(`Adding ${this._value} to ${state.messages}`);
    return { messages: [this._value] };
  }
}

function sleep(delayMs: number) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

function handleRoutes(state: GraphState): "A" | "B" {
  const { flag } = state;

  if (flag === "internal") {
    return "A";
  } else {
    return "B";
  }
}

const NodeA = new GraphNode("I am A");
const NodeB = new GraphNode("I am B");
const NodeC = new GraphNode("I am C");
const NodeD = new GraphNode("I am D");

workflow
  .addNode("A", NodeA.call.bind(NodeA))

  .addNode("B", NodeB.call.bind(NodeB))

  .addNode("C", NodeC.call.bind(NodeC))

  .addNode("D", NodeD.call.bind(NodeD))

  .addConditionalEdges(START, handleRoutes, { A: "A", B: "B" })
  .addEdge("A", "C")
  .addEdge("B", "C")
  .addEdge("C", "D")
  .addEdge("D", END);

const checkpointer = new MemorySaver();

const app = workflow.compile({ checkpointer });

visualization("./src/langgraph/persistence/images/playground.png", app);

(async () => {
  const config: RunnableConfig = {
    configurable: { thread_id: "46" },
  };

  const res = await app.invoke(
    {
      messages: [],
      flag: "external",
    },
    config
  );

  const history = app.getStateHistory(config);

  for await (const snapshot of history) {
    console.log(`====Step ${snapshot.metadata?.step}====`);
    console.log(JSON.stringify(snapshot, null, 2));
  }

  // console.log(res);
})();
