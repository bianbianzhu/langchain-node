import { GraphState } from "../graph-state";
import { ChatOpenAI } from "@langchain/openai";
import createSQLTools from "../tools/sql-toolkit";
import { SQL_PREFIX } from "langchain/agents/toolkits/sql";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import checkpointer from "../utils/checkpointer";
import { SystemMessage, AIMessage } from "@langchain/core/messages";
import { RunnableConfig } from "@langchain/core/runnables";

// This is a REACT AGENT
async function sqlAssistant(
  state: GraphState,
  config?: RunnableConfig
): Promise<GraphState> {
  console.log("----SQL-ASSISTANT-NODE---");
  const { messages } = state;

  // The config from the main graph is passed into here
  const chatModel = new ChatOpenAI({
    modelName: "gpt-4o",
    temperature: 0,
  });

  const tools = await createSQLTools();

  // react agent's inputkey is `messages`
  const agent = createReactAgent({
    llm: chatModel,
    tools,
    checkpointSaver: checkpointer,
    messageModifier: new SystemMessage(SQL_PREFIX), // this adds as the system message into the beginning of the chat_history
  });

  // const res = await agent.invoke(
  //   {
  //     messages,
  //   },
  //   {
  //     configurable: { thread_id: "42" }, // thread_id may need to be passed as a state into here
  //   } // must have this or error
  // );

  // =====================================
  // having the 2nd parameter - config, we can now access the thread_id from the main graph
  // console.log(config);

  const res = await agent.invoke(
    {
      messages,
    },
    config
  );

  return { messages: [res.messages.at(-1) as AIMessage] };
}

export default sqlAssistant;
