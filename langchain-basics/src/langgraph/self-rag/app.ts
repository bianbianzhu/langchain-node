import { END, MemorySaver, START, StateGraph } from "@langchain/langgraph";
import { graphState, GraphState } from "./graph-state";
import retrieve from "./nodes/retrieve";
import generate from "./nodes/generate";
import grade from "./nodes/grade";
import rewriteQuery from "./nodes/rewrite-query";
import generateOrRewrite from "./conditions/generateOrRewrite";

export enum GraphNodes {
  Retrieve = "retrieve",
  Generate = "generate",
  Grade = "grade",
  RewriteQuery = "rewriteQuery",
}

const workflow = new StateGraph<GraphState>({ channels: graphState });

const checkpointer = new MemorySaver();

workflow
  .addNode(GraphNodes.Retrieve, retrieve)
  .addNode(GraphNodes.Generate, generate)
  .addNode(GraphNodes.Grade, grade)
  .addNode(GraphNodes.RewriteQuery, rewriteQuery)
  .addEdge(START, GraphNodes.Retrieve)
  .addEdge(GraphNodes.Retrieve, GraphNodes.Grade)
  .addConditionalEdges(GraphNodes.Grade, generateOrRewrite, {
    [GraphNodes.Generate]: GraphNodes.Generate,
    [GraphNodes.RewriteQuery]: GraphNodes.RewriteQuery,
  })
  .addEdge(GraphNodes.RewriteQuery, GraphNodes.Retrieve)
  .addEdge(GraphNodes.Generate, END);

const app = workflow.compile({ checkpointer });

export default app;
