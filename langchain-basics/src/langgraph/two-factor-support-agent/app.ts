import { END, MemorySaver, START, StateGraph } from "@langchain/langgraph";
import { graphState, GraphState } from "./graph-state";
import supportAgent from "./nodes/support-agent";
import requestAuthorization from "./nodes/request-authorization";
import confirmAuthorization from "./nodes/confirm-authorization";
import shouldContinue from "./conditions/should-continue";
import executeReadOnlyTools from "./nodes/invoke-readonly-tools";

export enum GraphNodes {
  SupportAgent = "support_agent",
  RequestAuthorization = "request_authorization",
  ConfirmAuthorization = "confirm_authorization",
  InvokeAuthorizedTools = "invoke_authorized_tools",
  InvokeReadonlyTools = "invoke_readonly_tools",
}

const checkpointer = new MemorySaver();

const workflow = new StateGraph<GraphState>({ channels: graphState });

workflow
  .addNode(GraphNodes.SupportAgent, supportAgent)
  .addNode(GraphNodes.RequestAuthorization, requestAuthorization)
  .addNode(GraphNodes.ConfirmAuthorization, confirmAuthorization)
  .addNode(GraphNodes.InvokeReadonlyTools, executeReadOnlyTools)
  // add edges to nodes
  .addEdge(START, GraphNodes.SupportAgent)
  .addConditionalEdges(GraphNodes.SupportAgent, shouldContinue, {
    [GraphNodes.RequestAuthorization]: GraphNodes.RequestAuthorization,
    [GraphNodes.InvokeReadonlyTools]: GraphNodes.InvokeReadonlyTools,
    [END]: END,
  });

const app = workflow.compile({ checkpointer });

export default app;
