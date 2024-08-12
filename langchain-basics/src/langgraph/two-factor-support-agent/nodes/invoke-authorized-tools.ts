import { AIMessage, ToolMessage } from "@langchain/core/messages";
import { ToolCall } from "@langchain/core/messages/tool";
import { GraphState } from "../graph-state";
import { AUTHORIZED_TOOLS_BY_NAME } from "../tools";

async function executeAuthorizedTools(
  state: GraphState
): Promise<
  Pick<
    GraphState,
    "messages" | "authenticationState" | "authorizationFailureCount"
  >
> {
  console.log("----INVOKE-AUTHORIZED-TOOLS-NODE---");

  const { messages } = state;
  const currentMessage = messages.at(-1) as AIMessage;

  const toolCall = currentMessage.tool_calls?.[0] as ToolCall;
  const selectedTool = AUTHORIZED_TOOLS_BY_NAME[toolCall.name];

  const toolResponse = (await selectedTool.invoke(toolCall)) as ToolMessage;

  return {
    messages: [toolResponse],
    authenticationState: undefined,
    authorizationFailureCount: 0,
  };
}

export default executeAuthorizedTools;
