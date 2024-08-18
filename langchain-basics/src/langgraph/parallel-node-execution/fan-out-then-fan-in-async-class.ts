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

class ReturnNodeValueAsync {
  private _value: string;
  private _delayMs: number;

  constructor(value: string, delayMs: number) {
    this._value = value;
    this._delayMs = delayMs;
  }

  public async call(state: GraphState): Promise<GraphState> {
    await sleep(this._delayMs);
    console.log(`Done waiting ${this._delayMs} ms`);
    console.log(`Adding ${this._value} to ${state.aggregate}`);
    return { aggregate: [this._value] };
  }
}

// This node will be executed after nodeB and nodeC have finished, so after 5 seconds
async function nodeDAsync(state: GraphState): Promise<GraphState> {
  console.log(`Adding D async to ${state.aggregate}`);
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
const nodeBWithDelay = new ReturnNodeValueAsync("I'm B", 500);
const nodeCWithDelay = new ReturnNodeValueAsync("I'm C", 5000);

workflow
  .addNode("a", nodeA.call.bind(nodeA))
  .addEdge(START, "a")

  .addNode("c", nodeCWithDelay.call.bind(nodeCWithDelay))
  .addNode("b", nodeBWithDelay.call.bind(nodeBWithDelay))

  .addNode("d", nodeDAsync) // the fan-in node will wait for nodeB and nodeC to finish and then execute
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
