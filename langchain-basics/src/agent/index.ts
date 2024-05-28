import { createAgentExecutor } from "./agent";
import { rl } from "./chatInterface";
import { HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";

const chatHistory: BaseMessage[] = [];

async function main() {
  const agentExecutor = await createAgentExecutor();

  function chat() {
    rl.question("You: ", async (input) => {
      if (input.toLowerCase() === "exit") {
        rl.close();
        return;
      }

      // call the agent
      const response = (await agentExecutor.invoke({
        input,
        chat_history: chatHistory,
      })) as { input: string; output: string };

      console.log(`Assistant: ${response.output}`);
      chatHistory.push(new HumanMessage(input));
      chatHistory.push(new AIMessage(response.output));

      chat();
    });
  }

  chat();
}

main();
