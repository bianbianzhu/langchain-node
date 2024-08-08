import { StateGraphArgs, messagesStateReducer } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";

export interface GraphState {
  messages: BaseMessage[];
}

export const graphState: StateGraphArgs<GraphState>["channels"] = {
  messages: {
    default: () => [],
    reducer: messagesStateReducer,
  },
};
