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

// define nodes

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

async function nodeBWithDelay(_state: GraphState): Promise<GraphState> {
  console.log("---- Node B ----");
  await sleep(3000); // wait for 3 seconds
  return { aggregate: ["I'm B delayed"] };
}

async function nodeCWithDelay(_state: GraphState): Promise<GraphState> {
  console.log("---- Node C ----");
  await sleep(5000); // wait for 5 seconds
  return { aggregate: ["I'm C delayed"] };
}

// This node will be executed after nodeB and nodeC have finished, so after 5 seconds
async function nodeDAsync(state: GraphState): Promise<GraphState> {
  console.log("---- Node D ----");
  const { aggregate } = state;
  const lastAggregate = aggregate.at(-1);
  const last2ndAggregate = aggregate.at(-2);
  console.log(`Last aggregate: ${lastAggregate}`);
  console.log(`Last 2nd aggregate: ${last2ndAggregate}`);
  return {
    aggregate: [
      `I'm D async and I summarize ${lastAggregate} and ${last2ndAggregate}`,
    ],
  };
}

const nodeA = new ReturnNodeValue("I'm A");
const nodeB = new ReturnNodeValue("I'm B");
const nodeC = new ReturnNodeValue("I'm C");
const nodeD = new ReturnNodeValue("I'm D");

workflow
  .addNode("a", nodeA.call.bind(nodeA))
  .addEdge(START, "a")
  // .addNode("b", nodeB.call.bind(nodeB))
  .addNode("b", nodeBWithDelay)
  // .addNode("c", nodeC.call.bind(nodeC))
  .addNode("c", nodeCWithDelay)
  // .addNode("d", nodeD.call.bind(nodeD))
  .addNode("d", nodeDAsync)
  .addEdge("a", "b")
  .addEdge("a", "c")
  .addEdge("b", "d")
  .addEdge("c", "d")
  .addEdge("d", END);

const app = workflow.compile();

visualization(
  "./src/langgraph/parallel-node-execution/images/flow-async.png",
  app
);

async function main() {
  const endState = await app.invoke({
    aggregate: [],
  });

  console.log(endState);
}

main();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
