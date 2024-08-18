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
// use curried function to avoid repeating the same logic
function returnNodeValue(
  nodeValue: string
): (state: GraphState) => Promise<GraphState> {
  return async (state) => {
    console.log(`Adding ${nodeValue} to ${state.aggregate}`);
    return { aggregate: [nodeValue] };
  };
}

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

// Create the graph
// const nodeA = new ReturnNodeValue("I'm A");
// const nodeB = new ReturnNodeValue("I'm B");
// const nodeC = new ReturnNodeValue("I'm C");
// const nodeD = new ReturnNodeValue("I'm D");

// init the workflow like this when using the class
// const builder = new StateGraph<GraphState>({ channels: graphState })
//   .addNode("a", nodeA.call.bind(nodeA))
//   .addEdge(START, "a")
//   .addNode("b", nodeB.call.bind(nodeB))
//   .addNode("c", nodeC.call.bind(nodeC))
//   .addNode("d", nodeD.call.bind(nodeD))
//   .addEdge("a", "b")
//   .addEdge("a", "c")
//   .addEdge("b", "d")
//   .addEdge("c", "d")
//   .addEdge("d", END);

const nodeA = returnNodeValue("A");
const nodeB = returnNodeValue("B");
const nodeC = returnNodeValue("C");
const nodeD = returnNodeValue("D");

// add nodes to the graph
workflow
  .addNode("A", nodeA)

  // this determines the order of execution
  .addNode("B", nodeB)
  .addNode("C", nodeC)

  .addNode("D", nodeD)
  // add edges to the graph

  // *** fan out from Node A to B and C and then fan in to D ***
  .addEdge(START, "A")
  .addEdge("A", "B")
  .addEdge("A", "C")
  // method 1
  .addEdge("B", "D")
  .addEdge("C", "D")
  // method 2
  // .addEdge(["B", "C"], "D")
  .addEdge("D", END);

const app = workflow.compile();

visualization("./src/langgraph/parallel-node-execution/images/flow.png", app);

async function main() {
  const endState = await app.invoke({
    aggregate: [],
  });

  console.log(endState);
}

main();
