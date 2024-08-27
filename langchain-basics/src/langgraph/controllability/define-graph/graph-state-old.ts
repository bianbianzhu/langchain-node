import {
  END,
  MemorySaver,
  messagesStateReducer,
  START,
  StateGraph,
  StateGraphArgs,
} from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";
import { RunnableConfig } from "@langchain/core/runnables";

// DEFINE STATE USING `STATE CHANNELS`

export enum AuthenticationState {
  Authenticating = "authenticating",
  Authenticated = "authenticated",
  Unauthenticated = "unauthenticated",
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
  authenticationState: null,
  generatedTwoFactorCode: null,
  providedTwoFactorCode: null,
  authorizationFailureCount: {
    default: () => 0,
    reducer: (x, y: number) => x + y,
  },
};

const workflow = new StateGraph<GraphState>({ channels: graphState });

async function node1(state: GraphState): Promise<Partial<GraphState>> {
  const { generatedTwoFactorCode } = state;

  console.log(generatedTwoFactorCode?.length);

  return {};
}

const checkpointer = new MemorySaver();

const app = workflow
  .addNode("node1", node1)
  .addEdge(START, "node1")
  .addEdge("node1", END)
  .compile({ checkpointer });

(async () => {
  const config: RunnableConfig = {
    configurable: {
      thread_id: "0827",
    },
  };

  const state = await app.invoke({}, config);

  console.log("state:", state);

  const history = app.getStateHistory(config);

  for await (const snapshot of history) {
    console.log(`=======Step ${snapshot.metadata?.step}=======`);
    console.log(JSON.stringify(snapshot, null, 2));
  }
})();
