import { END, START, StateGraph, StateGraphArgs } from "@langchain/langgraph";
import { visualization } from "../visualization";

// ## Stable Sorting

// When fanned out, nodes are run in parallel as a single "superstep". The updates from each superstep are all applied to the state in sequence once the superstep has completed.

// If you need consistent, predetermined ordering of updates from a parallel superstep, you should write the outputs (along with an identifying key) to a separate field in your state, then combine them in the "sink" node by adding regular `edge`s from each of the fanout nodes to the rendezvous point.

// For instance, suppose I want to order the outputs of the parallel step by "reliability".

type FanOutValue = { value: string; reliability: number };

// define state interface
interface GraphState {
  aggregate: string[];
  which: string;
  fanOutValues?: FanOutValue[];
}

// define the initial graph state
const graphState: StateGraphArgs<GraphState>["channels"] = {
  aggregate: {
    default: () => [],
    reducer: (x, y: string[]) => x.concat(y),
  },
  which: {
    default: () => "",
    reducer: (x, y: string) => (y ? y : x),
  },
  fanOutValues: {
    default: () => [],
    reducer: (x, y?: FanOutValue[]) => {
      if (x === undefined) {
        x = [];
      }

      if (y === undefined || y.length === 0) {
        return [];
      } // Overwrite, Similar to redux

      return x.concat(y);
    },
  },
};

// init graph
const workflow = new StateGraph<GraphState>({
  channels: graphState,
});

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

class ParallelReturnNodeValue {
  private _value: string;
  private _reliability: number;

  constructor(value: string, reliability: number) {
    this._value = value;
    this._reliability = reliability;
  }

  public call(state: GraphState): Pick<GraphState, "fanOutValues"> {
    console.log(`Adding ${this._value} to ${state.aggregate} in parallel`);
    return {
      fanOutValues: [
        {
          value: this._value,
          reliability: this._reliability,
        },
      ],
    };
  }
}

function aggregateFanOutValueNode(
  state: GraphState
): Pick<GraphState, "aggregate" | "fanOutValues"> {
  const { fanOutValues = [] } = state;
  const rankedValue = fanOutValues
    .sort((a, b) => b.reliability - a.reliability)
    .map((item) => item.value);

  return {
    aggregate: rankedValue.concat(["I'm E"]),
    fanOutValues: [],
  };
}

function routeBCOrCD(state: GraphState): string[] {
  const { which } = state;
  return which === "bc" ? ["b", "c"] : ["c", "d"];
}

const nodeA = new ReturnNodeValue("I'm A");
const nodeB = new ParallelReturnNodeValue("I'm B", 0.1);
const nodeC = new ParallelReturnNodeValue("I'm C", 0.9);
const nodeD = new ParallelReturnNodeValue("I'm D", 0.3);

workflow
  .addNode("a", nodeA.call.bind(nodeA))
  .addNode("b", nodeB.call.bind(nodeB))
  .addNode("c", nodeC.call.bind(nodeC))
  .addNode("d", nodeD.call.bind(nodeD))
  .addNode("e", aggregateFanOutValueNode)
  .addEdge(START, "a")
  .addConditionalEdges("a", routeBCOrCD, { b: "b", c: "c", d: "d" })
  .addEdge("b", "e")
  .addEdge("c", "e")
  .addEdge("d", "e")
  .addEdge("e", END);

const app = workflow.compile();

visualization(
  "./src/langgraph/parallel-node-execution/images/flow-stable-sorting.png",
  app
);

async function main() {
  const endState = await app.invoke({
    aggregate: [],
    which: "bc",
  });

  console.log(endState);
}

main();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
