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
  test?: string;
  compare?: string; // 👈👈👈👈👈 This uses default + reducer
}

const graphState: StateGraphArgs<GraphState>["channels"] = {
  messages: {
    default: () => [],
    reducer: (x, y: string[]) => x.concat(y),
  },
  test: null,
  compare: {
    default: () => "",
    reducer: (x, y?: string) => y ?? x, // replace logic
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

async function updateTest(state: GraphState): Promise<Partial<GraphState>> {
  console.log(`Updating test`);

  return {
    test: "test",
    compare: "compare",
  };
}

async function wipeFields(state: GraphState): Promise<Partial<GraphState>> {
  console.log(`Wiping fields`);

  return {
    test: undefined,
    compare: "",
  };
}

const NodeA = new GraphNode("I am A");
const NodeB = new GraphNode("I am B");

workflow
  .addNode("A", NodeA.call.bind(NodeA))
  .addNode("B", NodeB.call.bind(NodeB))
  .addNode("updateTest", updateTest)
  .addNode("wipeFields", wipeFields)
  .addEdge(START, "A")
  .addEdge("A", "B")
  .addEdge("B", "updateTest")
  .addEdge("updateTest", "wipeFields")
  .addEdge("wipeFields", END);

const checkpointer = new MemorySaver();

const app = workflow.compile({ checkpointer });

visualization("./src/langgraph/understand-reducer/images/reducer.png", app);

(async () => {
  const config: RunnableConfig = {
    configurable: { thread_id: "102" },
  };

  const res = await app.invoke(
    {
      messages: ["initial input"],
    },
    config
  );

  console.log("final state", res);

  const history = app.getStateHistory(config);

  for await (const snapshot of history) {
    console.log(`====Step ${snapshot.metadata?.step}====`);
    console.log(JSON.stringify(snapshot, null, 2));
  }
})();
