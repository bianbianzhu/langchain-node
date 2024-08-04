import { GraphState } from "../graph-state";
import { AIMessage, ToolMessage } from "@langchain/core/messages";
import { ToolCall } from "@langchain/core/messages/tool";
import { READONLY_TOOLS_BY_NAME } from "../tools";

// see this Doc: https://js.langchain.com/v0.2/docs/how_to/tool_results_pass_to_model

async function executeReadOnlyTools(
  state: GraphState
): Promise<Pick<GraphState, "messages">> {
  const { messages } = state;
  const currentMessage = messages.at(-1) as AIMessage;

  const toolCall = currentMessage.tool_calls?.[0] as ToolCall;
  const selectedTool = READONLY_TOOLS_BY_NAME[toolCall.name];

  // the response from the tool is a ToolMessage (with the content of the function returned value). Simply pass the entire tool call object to invoke the tool
  const toolResponse = (await selectedTool.invoke(toolCall)) as ToolMessage;

  return {
    messages: [toolResponse],
  };
}

// executeReadOnlyTools({
//   messages: [
//     {
//       id: "chatcmpl-9p1Ib4xfxV4yahv2ZWm1IRb1fRVD7",
//       content: "",
//       additional_kwargs: {
//         tool_calls: [
//           {
//             id: "call_CrZkMP0AvUrz7w9kim0splbl",
//             type: "function",
//             function: "[Object]",
//           },
//         ],
//       },
//       response_metadata: {
//         tokenUsage: {
//           completionTokens: 24,
//           promptTokens: 93,
//           totalTokens: 117,
//         },
//         finish_reason: "tool_calls",
//         system_fingerprint: "fp_400f27fa1f",
//       },
//       tool_calls: [
//         {
//           name: "technical_support_manual",
//           args: {
//             product: "macbook air 2020",
//             problem: "battery not charging",
//           },
//           type: "tool_call",
//           id: "call_CrZkMP0AvUrz7w9kim0splbl",
//         },
//       ],
//       invalid_tool_calls: [],
//       usage_metadata: {
//         input_tokens: 93,
//         output_tokens: 24,
//         total_tokens: 117,
//       },
//     },
//   ],
// } as any);

export default executeReadOnlyTools;
