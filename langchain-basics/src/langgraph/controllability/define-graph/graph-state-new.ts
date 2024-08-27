import {
  Annotation,
  END,
  MemorySaver,
  messagesStateReducer,
  START,
  StateGraph,
} from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";
import { RunnableConfig } from "@langchain/core/runnables";

export enum AuthenticationState {
  Authenticating = "authenticating",
  Authenticated = "authenticated",
  Unauthenticated = "unauthenticated",
}

// Annotation.Root function -> the top-level state object
// each field -> a channel

const graphAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    default: () => [],
    reducer: messagesStateReducer,
  }),
  authenticationState: Annotation<AuthenticationState>,
  generatedTwoFactorCode: Annotation<string | undefined>,
  providedTwoFactorCode: Annotation<string>,
  authorizationFailureCount: Annotation<number>({
    default: () => 0,
    reducer: (x, y) => x + y,
  }),
});

export type GraphAnnotation = typeof graphAnnotation.State;

// instantiating your graph using the annotations is as simple as passing the annotation to the StateGraph constructor:

const workflow = new StateGraph(graphAnnotation);

async function node1(
  state: GraphAnnotation
): Promise<Partial<GraphAnnotation>> {
  const { generatedTwoFactorCode } = state;

  console.log(generatedTwoFactorCode?.length);

  return {
    generatedTwoFactorCode: "123",
  };
}

// "metadata": {
//     "source": "loop",
//     "writes": {},
//     "step": 1
//   },

// NOT
// "metadata": {
//     "source": "loop",
//     "writes": {
//       "node1": {},
//     "step": 1
//   },

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
