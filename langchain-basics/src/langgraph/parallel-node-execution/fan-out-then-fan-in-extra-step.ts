import { END, START, StateGraph, StateGraphArgs } from "@langchain/langgraph";
import { visualization } from "../visualization";

// define state interface
interface GraphState {
  aggregate: string[];
}

// define the initial graph state
const graphState: StateGraphArgs<GraphState>["channels"] = {
  aggregate: {
    default: () => [],
    reducer: (x, y: string[]) => x.concat(y),
  },
};

// init graph
const workflow = new StateGraph<GraphState>({
  channels: graphState,
});

// OR use class
// Define the ReturnNodeValue class
class ReturnNodeValue {
  private _value: string;

  constructor(value: string) {
    this._value = value;
  }

  public call(state: GraphState): GraphState {
    console.log(`Adding ${this._value} to ${state.aggregate}`);
    return { aggregate: [this._value] };
  }
}

const nodeA = new ReturnNodeValue("I'm A");
const nodeB = new ReturnNodeValue("I'm B");
const nodeB2 = new ReturnNodeValue("I'm B2");
const nodeC = new ReturnNodeValue("I'm C");
const nodeD = new ReturnNodeValue("I'm D");

workflow
  .addNode("a", nodeA.call.bind(nodeA))
  .addNode("b", nodeB.call.bind(nodeB))
  .addNode("b2", nodeB2.call.bind(nodeB2))
  .addNode("c", nodeC.call.bind(nodeC))
  .addNode("d", nodeD.call.bind(nodeD))
  .addEdge(START, "a")
  .addEdge("a", "b")
  .addEdge("b", "b2")
  .addEdge("a", "c")
  // method 1 (right way)
  .addEdge(["b2", "c"], "d")

  // method 2 (wrong way) - The following will add one extra `I'm D` to the aggregate
  // .addEdge("b2", "d")
  // .addEdge("c", "d")
  .addEdge("d", END);

const app = workflow.compile();

visualization(
  "./src/langgraph/parallel-node-execution/images/flow-extra-step.png",
  app
);

async function main() {
  const endState = await app.invoke({
    aggregate: [],
  });

  console.log(endState);
}

main();
