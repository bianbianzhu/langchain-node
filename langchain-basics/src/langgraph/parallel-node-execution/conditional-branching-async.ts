import { END, START, StateGraph, StateGraphArgs } from "@langchain/langgraph";
import { visualization } from "../visualization";

// define state interface
interface GraphState {
  aggregate: string[];
  which: string;
}

// define the initial graph state
const graphState: StateGraphArgs<GraphState>["channels"] = {
  aggregate: {
    default: () => [],
    reducer: (x, y: string[]) => x.concat(y),
  },
  which: {
    default: () => "bc",
    reducer: (x, y: string) => (y ? y : x),
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

  public call(state: GraphState): Pick<GraphState, "aggregate"> {
    console.log(`Adding ${this._value} to ${state.aggregate}`);
    return { aggregate: [this._value] };
  }
}

const nodeA = new ReturnNodeValue("I'm A");
const nodeE = new ReturnNodeValue("I'm E");

async function nodeBWithDelay(
  _state: GraphState
): Promise<Pick<GraphState, "aggregate">> {
  console.log("---- Node B ----");
  await sleep(1000); // wait for 1 seconds
  return { aggregate: ["I'm B delayed"] };
}

async function nodeCWithDelay(
  _state: GraphState
): Promise<Pick<GraphState, "aggregate">> {
  console.log("---- Node C ----");
  await sleep(3000); // wait for 3 seconds
  return { aggregate: ["I'm C delayed"] };
}

async function nodeDWithDelay(
  state: GraphState
): Promise<Pick<GraphState, "aggregate">> {
  console.log("---- Node D ----");
  await sleep(7000); // wait for 7 seconds
  return { aggregate: ["I'm D delayed"] };
}

async function nodeEWithSummary(
  state: GraphState
): Promise<Pick<GraphState, "aggregate">> {
  console.log("---- Node E ----");
  const { aggregate } = state;
  const display = aggregate.slice(1);
  console.log(display);
  return {
    aggregate: [`I'm E and I summarize`],
  };
}

// define condition
function routeToBCorCD(state: GraphState): string[] {
  const { which } = state;
  return which === "bc" ? ["b", "c"] : ["c", "d"]; // this means the next two nodes to be executed are `b and c` or `c and d`

  // !!!!! b and c will be executed in parallel
  // OR
  // !!!!! c and d will be executed in parallel

  // neat! so you can define `a single node` to be executed or `multiple nodes` to be executed based on the condition
}

function complexRouter(state: GraphState): string[] {
  const { which } = state;
  if (which === "bc") {
    return ["b", "c"];
  } else if (which === "cd") {
    return ["c", "d"];
  } else if (which === "bd") {
    return ["b", "d"];
  } else {
    return ["b", "c", "d"];
  }
}

workflow
  .addNode("a", nodeA.call.bind(nodeA))
  .addNode("b", nodeBWithDelay)
  .addNode("c", nodeCWithDelay)
  .addNode("d", nodeDWithDelay)
  .addNode("e", nodeEWithSummary)
  .addEdge(START, "a")
  // .addConditionalEdges("a", routeToBCorCD, { b: "b", c: "c", d: "d" })
  .addConditionalEdges("a", complexRouter, {
    b: "b",
    c: "c",
    d: "d",
  })
  .addEdge("b", "e")
  .addEdge("c", "e")
  .addEdge("d", "e")
  .addEdge("e", END);

const app = workflow.compile();

visualization(
  "./src/langgraph/parallel-node-execution/images/conditional-branching.png",
  app
);

async function main() {
  const endState = await app.invoke({
    aggregate: [],
  });

  console.log(endState);

  const endState2 = await app.invoke({
    aggregate: [],
    which: "x", // calls b, c, and d in parallel
  });

  console.log(endState2);
}

main();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
