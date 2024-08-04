import { END, MemorySaver, START, StateGraph } from "@langchain/langgraph";
import { graphState, GraphState } from "./graph-state";
import retrieve from "./nodes/retrieve";
import generate from "./nodes/generate";
import gradeDocuments from "./nodes/gradeDocuments";
import rewriteQuery from "./nodes/rewrite-query";
import generateOrRewrite from "./conditions/generateOrRewrite";
import gradeGenerationGrounded from "./nodes/gradeGenerationGrounded";
import prepFinalGrade from "./nodes/prepFinalGrade";
import prepFinalORRegenerate from "./conditions/prepFinalORRegenerate";
import { visualization } from "../visualization";
import gradeGenerationUseful from "./nodes/gradeGenerationUseful";
import endOrRewrite from "./conditions/endOrRewrite";

export enum GraphNodes {
  Retrieve = "retrieve",
  Generate = "generate",
  GradeDocuments = "gradeDocuments",
  RewriteQuery = "rewriteQuery",
  GradeGenerationGrounded = "gradeGenerationGrounded",
  PrepForFinalGrade = "prepForFinalGrade",
  GradeGenerationUseful = "gradeGenerationUseful",
}

const workflow = new StateGraph<GraphState>({ channels: graphState });

const checkpointer = new MemorySaver();

workflow
  .addNode(GraphNodes.Retrieve, retrieve)
  .addNode(GraphNodes.Generate, generate)
  .addNode(GraphNodes.GradeDocuments, gradeDocuments)
  .addNode(GraphNodes.RewriteQuery, rewriteQuery)
  .addNode(GraphNodes.GradeGenerationGrounded, gradeGenerationGrounded)
  .addNode(GraphNodes.PrepForFinalGrade, prepFinalGrade)
  .addNode(GraphNodes.GradeGenerationUseful, gradeGenerationUseful)
  // Add edges to nodes
  .addEdge(START, GraphNodes.Retrieve)
  .addEdge(GraphNodes.Retrieve, GraphNodes.GradeDocuments)
  .addConditionalEdges(GraphNodes.GradeDocuments, generateOrRewrite, {
    [GraphNodes.Generate]: GraphNodes.Generate,
    [GraphNodes.RewriteQuery]: GraphNodes.RewriteQuery,
  })
  .addEdge(GraphNodes.RewriteQuery, GraphNodes.Retrieve)
  .addEdge(GraphNodes.Generate, GraphNodes.GradeGenerationGrounded)
  .addConditionalEdges(
    GraphNodes.GradeGenerationGrounded,
    prepFinalORRegenerate,
    {
      [GraphNodes.Generate]: GraphNodes.Generate,
      [GraphNodes.PrepForFinalGrade]: GraphNodes.PrepForFinalGrade,
    }
  )
  .addEdge(GraphNodes.PrepForFinalGrade, GraphNodes.GradeGenerationUseful)
  .addConditionalEdges(GraphNodes.GradeGenerationUseful, endOrRewrite, {
    [GraphNodes.RewriteQuery]: GraphNodes.RewriteQuery,
    [END]: END,
  });

const app = workflow.compile({ checkpointer });

visualization("./src/langgraph/images/self-rag-new.png", app);

export default app;
