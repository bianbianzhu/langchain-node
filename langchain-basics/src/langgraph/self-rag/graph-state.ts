import { AIMessage, BaseMessage } from "@langchain/core/messages";
import { InMemoryChatMessageHistory } from "@langchain/core/chat_history";
import { StateGraphArgs } from "@langchain/langgraph";
import { Document } from "@langchain/core/documents";

export interface GraphState {
  questions: string[];
  documents: Document[];
  chatHistory: BaseMessage[]; // can we use InMemoryChatMessageHistory instead?
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
  generations: {
    default: () => [],
    reducer: (x = [], y = []) => x.concat(y),
  },
};
