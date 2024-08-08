import { ChatOpenAI } from "@langchain/openai";
import { SQL_PREFIX } from "langchain/agents/toolkits/sql";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { GraphState } from "../graph-state";
import { BaseMessage } from "@langchain/core/messages";
import createSQLTools from "../tools/sql-toolkit";

async function sqlAgent(state: GraphState): Promise<GraphState> {
  console.log("----SQL-AGENT-NODE---");
  const { messages } = state;

  const chatModel = new ChatOpenAI({
    modelName: "gpt-4o",
    temperature: 0,
  });

  const tools = await createSQLTools();

  const modelWithTools = chatModel.bindTools(tools);

  // SQL_PREFIX has 2 input variables:
  // 1. {dialect} - such as MySQL, PostgreSQL, SQLite, SQL Server, Oracle, etc.
  // 2. {top_k} - limit your query to at most {top_k} results using the LIMIT clause
  const prompt = ChatPromptTemplate.fromMessages<{
    messages: BaseMessage[];
    dialect: string;
    top_k: string;
  }>([
    ["system", SQL_PREFIX],
    ["placeholder", "{messages}"],
  ]);

  const partialPrompt = await prompt.partial({
    dialect: "SQLite",
    top_k: "5",
  });

  const chain = partialPrompt.pipe(modelWithTools);

  const res = await chain.invoke({ messages });

  return { messages: [res] };
}

export default sqlAgent;
