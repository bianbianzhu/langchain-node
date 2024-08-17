import { StateGraphArgs } from "@langchain/langgraph";

interface GraphState {
  aggregate: string[];
}

const graphState: StateGraphArgs<GraphState>["channels"] = {
  aggregate: {
    default: () => [],
    reducer: (x, y: string[]) => x.concat(y),
  },
};
