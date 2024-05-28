import { createChain } from "./chains";
import { rl } from "./chat-interface";
import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";

async function main() {
  const chatHistory: BaseMessage[] = [];
  const chain = await createChain();

  function chat() {
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
