import { END } from "@langchain/langgraph";
import { GraphNodes } from "../app";
import { GraphState } from "../graph-state";
import { AIMessage } from "@langchain/core/messages";
import { AUTHORIZED_TOOLS_BY_NAME, READONLY_TOOLS_BY_NAME } from "../tools";

function shouldContinue(state: GraphState): GraphNodes | typeof END {
  const { messages } = state;
  const currentMessage = messages.at(-1) as AIMessage;

  // No tool calls, go to end
  if (!currentMessage.tool_calls || currentMessage.tool_calls.length === 0) {
    return END;
  }

  // For simplicity, handle single tool calls only
  const { name } = currentMessage.tool_calls[0];
  if (AUTHORIZED_TOOLS_BY_NAME[name]) {
    // If the picked tool is an authorized one, request authorization first
    return GraphNodes.RequestAuthorization;
  }

  if (READONLY_TOOLS_BY_NAME[name]) {
    return GraphNodes.InvokeReadonlyTools;
  }

  throw new Error(`Invalid tool call - Tool ${name} not found`);
}

export default shouldContinue;
