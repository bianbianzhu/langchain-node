import { BaseMessage } from "@langchain/core/messages";
import { messagesStateReducer, StateGraphArgs } from "@langchain/langgraph";

export enum AuthenticationState {
  Authenticated = "Authenticated",
  Authorizing = "Authorizing",
  Unauthenticated = "Unauthenticated",
}

export interface GraphState {
  messages: BaseMessage[];
  authorizationFailureCount: number;
  authenticationState?: AuthenticationState;
  generatedTwoFactorCode?: string;
  providedTwoFactorCode?: string;
}

export const graphState: StateGraphArgs<GraphState>["channels"] = {
  messages: {
    default: () => [],
    reducer: messagesStateReducer,
  },
  // what are these ??? why no need to define default and reducer?
  authenticationState: null,
  generatedTwoFactorCode: null,
  providedTwoFactorCode: null,
  authorizationFailureCount: {
    default: () => 0,
    reducer: (x, y: number) => x + y,
  },
};
