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
  test?: string; // 👈👈👈👈👈 ONLY DEFINED HERE (must be optional, otherwise `graphState` belong gives TS error)
}

const graphState: StateGraphArgs<GraphState>["channels"] = {
  messages: {
    default: () => [],
    reducer: (x, y: string[]) => x.concat(y),
  },
  // `test` is missing here
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
    test: "test", // 👉👉👉👉👉👉👉 Try writting into the state of the `test` value
  };
}

const NodeA = new GraphNode("I am A");
const NodeB = new GraphNode("I am B");

workflow
  .addNode("A", NodeA.call.bind(NodeA))
  .addNode("B", NodeB.call.bind(NodeB))
  .addNode("updateTest", updateTest)
  .addEdge(START, "A")
  .addEdge("A", "B")
  .addEdge("B", "updateTest")
  .addEdge("updateTest", END);

const checkpointer = new MemorySaver();

const app = workflow.compile({ checkpointer });

visualization("./src/langgraph/understand-reducer/images/reducer.png", app);

(async () => {
  const config: RunnableConfig = {
    configurable: { thread_id: "100" },
  };

  const res = await app.invoke(
    {
      messages: ["initial input"],
    },
    config
  );

  const history = app.getStateHistory(config);

  for await (const snapshot of history) {
    console.log(`====Step ${snapshot.metadata?.step}====`);
    console.log(JSON.stringify(snapshot, null, 2));
  }
})();
