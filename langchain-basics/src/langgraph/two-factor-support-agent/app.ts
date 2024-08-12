import { END, MemorySaver, START, StateGraph } from "@langchain/langgraph";
import { graphState, GraphState } from "./graph-state";
import supportAgent from "./nodes/support-agent";
import requestAuthorization from "./nodes/request-authorization";
import confirmAuthorization from "./nodes/confirm-authorization";
import shouldContinue from "./conditions/should-continue";
import executeReadOnlyTools from "./nodes/invoke-readonly-tools";
import executeAuthorizedTools from "./nodes/invoke-authorized-tools";
import shouldExecuteAuthorizedTool from "./conditions/should-execute-authorized-tools";
import { visualization } from "../visualization";

export enum GraphNodes {
  SupportAgent = "support_agent",
  RequestAuthorization = "request_authorization",
  ConfirmAuthorization = "confirm_authorization",
  InvokeAuthorizedTools = "invoke_authorized_tools",
  InvokeReadonlyTools = "invoke_readonly_tools",
}

const checkpointer = new MemorySaver();

const workflow = new StateGraph<GraphState>({ channels: graphState });

const app = workflow
  .addNode(GraphNodes.SupportAgent, supportAgent)
  .addNode(GraphNodes.RequestAuthorization, requestAuthorization)
  .addNode(GraphNodes.ConfirmAuthorization, confirmAuthorization)
  .addNode(GraphNodes.InvokeReadonlyTools, executeReadOnlyTools)
  .addNode(GraphNodes.InvokeAuthorizedTools, executeAuthorizedTools)
  // add edges to nodes
  .addEdge(START, GraphNodes.SupportAgent)
  .addConditionalEdges(GraphNodes.SupportAgent, shouldContinue, {
    [GraphNodes.RequestAuthorization]: GraphNodes.RequestAuthorization,
    [GraphNodes.InvokeReadonlyTools]: GraphNodes.InvokeReadonlyTools,
    [END]: END,
  })
  .addEdge(GraphNodes.RequestAuthorization, GraphNodes.ConfirmAuthorization)
  .addConditionalEdges(
    GraphNodes.ConfirmAuthorization,
    shouldExecuteAuthorizedTool,
    {
      [GraphNodes.InvokeAuthorizedTools]: GraphNodes.InvokeAuthorizedTools,
      [GraphNodes.RequestAuthorization]: GraphNodes.RequestAuthorization,
    }
  )
  .addEdge(GraphNodes.InvokeAuthorizedTools, GraphNodes.SupportAgent)
  .addEdge(GraphNodes.InvokeReadonlyTools, GraphNodes.SupportAgent)
  .compile({
    checkpointer,
    interruptBefore: [GraphNodes.ConfirmAuthorization],
  });

// Compile with a separate expression with interruptBefore would cause TS error since it only accepts START in the interruptBefore array here
// const app = workflow.compile({
//   checkpointer,
//   interruptBefore: [GraphNodes.ConfirmAuthorization],
// });

visualization("./src/langgraph/two-factor-support-agent/images/flow.png", app);

export default app;
