import { END, START, StateGraph, StateGraphArgs } from "@langchain/langgraph";

interface GraphState {
  messages: string[];
  which?: "bc1" | "bc2" | "all";
  temp?: { content: string; score: number }[];
}

const graphState: StateGraphArgs<GraphState>["channels"] = {
  messages: {
    default: () => [],
    reducer: (x, y: string[]) => x.concat(y),
  },
  which: {
    default: () => "bc1",
    reducer: (x = "bc1", y?: "bc1" | "bc2" | "all") => (y ? y : x),
  },
  temp: {
    default: () => [],
    reducer: (x = [], y?: { content: string; score: number }[]) => {
      if (y === undefined || y.length === 0) {
        // reset the temp field
        return [];
      }

      return x.concat(y);
    },
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

class ParallelGraphNode {
  private _value: { content: string; score: number };
  private _delayMs: number;

  constructor(value: { content: string; score: number }, delayMs: number) {
    this._value = value;
    this._delayMs = delayMs;
  }

  public async call(state: GraphState): Promise<Pick<GraphState, "temp">> {
    const { temp } = state;

    if (this._delayMs > 0) {
      await sleep(this._delayMs);
      console.log(`Wait ${this._delayMs} mills done!`);
    }

    console.log(`Add ${JSON.stringify(this._value)} to temp: [${temp}]`);
    return {
      temp: [this._value],
    };
  }
}

function sleep(delayMs: number) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

function handleRoutes(state: GraphState): string[] {
  const { which } = state;
  if (which === "bc1") {
    return ["B", "C1"];
  } else if (which === "bc2") {
    return ["B", "C2"];
  } else {
    return ["B", "C1", "C2"];
  }
}

const NodeA = new GraphNode("I am A");
const NodeB = new ParallelGraphNode({ content: "I am B", score: 0.6 }, 1000);
const NodeC1 = new ParallelGraphNode({ content: "I am C1", score: 0.9 }, 2000);
const NodeC2 = new ParallelGraphNode({ content: "I am C2", score: 0.1 }, 500);

async function NodeD(
  state: GraphState
): Promise<Pick<GraphState, "messages" | "temp">> {
  const { temp = [] } = state;

  // sort the temp array descending of the score - C1, B, C2
  const sortedMessages = temp
    .sort((a, b) => b.score - a.score)
    .map((item) => item.content);

  return {
    messages: sortedMessages.concat(["I am D"]),
    temp: undefined,
  };
}

workflow
  .addNode("A", NodeA.call.bind(NodeA))

  .addNode("C2", NodeC2.call.bind(NodeC2))

  .addNode("B", NodeB.call.bind(NodeB))

  .addNode("C1", NodeC1.call.bind(NodeC1))

  .addNode("D", NodeD)

  .addEdge(START, "A")

  .addConditionalEdges("A", handleRoutes, { B: "B", C1: "C1", C2: "C2" })

  .addEdge("B", "D")
  .addEdge("C1", "D")
  .addEdge("C2", "D")

  .addEdge("D", END);

const app = workflow.compile();

(async () => {
  const res = await app.invoke({
    messages: [],
    which: "all",
  });

  console.log(res);
})();
