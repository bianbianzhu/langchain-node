import { createChain } from "./chains";
import { rl } from "./chatInterface";
import { BaseMessage, AIMessage, HumanMessage } from "@langchain/core/messages";

async function main() {
  const chain = await createChain();
  const chatHistory: BaseMessage[] = [];

  async function chat() {
    rl.question("You: ", async (input) => {
      if (input.toLowerCase() === "exit") {
        rl.close();
        return;
      }

      const response = await chain.invoke({
        input,
        chat_history: chatHistory,
      });

      console.log(`Assistant: ${response.answer}`);
      chatHistory.push(new HumanMessage(input));
      chatHistory.push(new AIMessage(response.answer));

      chat();
    });
  }

  chat();
}

main();
