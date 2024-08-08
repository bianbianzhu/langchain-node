import { END, START, StateGraph } from "@langchain/langgraph";
import { graphState, GraphState } from "./graph-state";
import checkpointer from "./utils/checkpointer";
import reactSqlAssistant from "./nodes/react-sql-assistant";
import sqlAgent from "./nodes/sql-agent";
import { toolNodeInit } from "./nodes/tools";
import shouldContinue from "./conditions/shouldContinue";

export enum GraphNodes {
  ReactSQLAssistant = "react_sql_assistant",
  SQLAgent = "sql_agent",
  ToolNode = "tool_node",
}

const workflow = new StateGraph<GraphState>({ channels: graphState });

async function appInit() {
  // ====== This workflow only contains one node, the ReactSQLAssistant node. Basically a React Agent ======

  // workflow
  //   .addNode(GraphNodes.ReactSQLAssistant, reactSqlAssistant)
  //   // add edges to nodes
  //   .addEdge(START, GraphNodes.ReactSQLAssistant)
  //   .addEdge(GraphNodes.ReactSQLAssistant, END);

  // ===== This workflow is the breakdown of the agent into multiple nodes =====

  const toolNode = await toolNodeInit();

  workflow
    .addNode(GraphNodes.SQLAgent, sqlAgent)
    .addNode(GraphNodes.ToolNode, toolNode)
    // add edges to nodes
    .addEdge(START, GraphNodes.SQLAgent)
    .addConditionalEdges(GraphNodes.SQLAgent, shouldContinue, {
      [GraphNodes.ToolNode]: GraphNodes.ToolNode,
      [END]: END,
    })
    .addEdge(GraphNodes.ToolNode, GraphNodes.SQLAgent);

  const app = workflow.compile({ checkpointer });

  return app;
}

export default appInit;
