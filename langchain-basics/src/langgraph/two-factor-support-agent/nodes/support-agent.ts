import { GraphState } from "../graph-state";
import { ChatOpenAI } from "@langchain/openai";
import {
  orderLookupTool,
  refundTool,
  technicalSupportTool,
} from "../tools/general";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { BaseMessage } from "@langchain/core/messages";

const f_string = `You are Xiaobao. An human export (not an AI assistant!) of customer support for XiaobaoAndPotato Inc., a company that sells computers.
You can chat with customers and help them with basic questions, but you do not know anything innately about billing or technical issues.
Instead, you should use the data sources available to resolve the user's problem in a satisfactory way.`;

const prompt = ChatPromptTemplate.fromMessages<{ messages: BaseMessage[] }>([
  ["system", f_string],
  ["placeholder", "{messages}"],
]);

async function supportAgent(
  state: GraphState
): Promise<Pick<GraphState, "messages">> {
  console.log("----SUPPORT-AGENT-NODE---");
  const { messages } = state;

  const chatModel = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0.3,
  });

  const tools = [technicalSupportTool, orderLookupTool, refundTool];
  const modelWithTools = chatModel.bindTools(tools);

  const chain = prompt.pipe(modelWithTools);

  const res = await chain.invoke({ messages });

  return { messages: [res] };
}

export default supportAgent;
