import { ToolNode } from "@langchain/langgraph/prebuilt";
import { GraphState } from "../graph-state";
import createSQLTools from "../tools/sql-toolkit";

export async function toolNodeInit(): Promise<ToolNode<GraphState>> {
  console.log("----Executing Tool---");
  const tools = await createSQLTools();
  return new ToolNode<GraphState>(tools);
}
