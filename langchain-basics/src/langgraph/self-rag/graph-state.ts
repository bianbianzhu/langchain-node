import { AIMessage, BaseMessage } from "@langchain/core/messages";
import { StateGraphArgs } from "@langchain/langgraph";
import { Document } from "@langchain/core/documents";
import { BooleanGraderToolParamSchema } from "./shared-utils";

type Count = {
  rewriteQuery: number;
  regenerate: number;
};

export interface GraphState {
  questions: string[];
  documents: Document[];
  chatHistory: BaseMessage[]; // can we use InMemoryChatMessageHistory instead?
  count: Count;
  generationGrounded: BooleanGraderToolParamSchema;
  generations?: AIMessage[];
}

export const graphState: StateGraphArgs<GraphState>["channels"] = {
  questions: {
    default: () => [],
    reducer: (x, y: string[]) => x.concat(y),
  },
  documents: {
    default: () => [],
    reducer: (x, y: Document[]) => (y ? y : x),
  },
  chatHistory: {
    default: () => [],
    reducer: (x, y: BaseMessage[]) => x.concat(y), // reducer should always return the exact same type as the defined one, BaseMessage[].
  },
  count: {
    default: () => ({ rewriteQuery: 0, regenerate: 0 }),
    reducer: (x, y: Partial<Count>) => {
      const { rewriteQuery = 0, regenerate = 0 } = y;

      return {
        rewriteQuery: x.rewriteQuery + rewriteQuery,
        regenerate: x.regenerate + regenerate,
      };
    },
  },
  generationGrounded: {
    default: () => ({ grade: false, explanation: "" }),
    reducer: (x, y: BooleanGraderToolParamSchema) => (y ? y : x),
  },
  generations: {
    default: () => [],
    reducer: (x = [], y = []) => x.concat(y),
  },
};
