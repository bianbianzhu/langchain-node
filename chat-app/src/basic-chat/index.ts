import { OpenAI } from "openai";
import {
  ChatCompletionMessageParam,
  ChatCompletionUserMessageParam,
} from "openai/resources";
import readline from "readline";

const openai = new OpenAI();

function mainWithReadline() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const messages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: "You are a helpful chatbot.",
    },
  ];

  async function createChatCompletion(messages: ChatCompletionMessageParam[]) {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages,
    });

    const { message: completionMessage } = response.choices[0] ?? {};
    if (!completionMessage) {
      throw new Error("No completion message found in response");
    }
    // Although the completion message is `ChatCompletionMessage`, it can still be accepted by the ChatCompletionMessageParam type
    messages.push(completionMessage);
    console.log(`${completionMessage.role}: ${completionMessage.content}`);
  }

  rl.setPrompt("user: ");
  rl.prompt();

  rl.on("line", async function processInput(input) {
    const userMessage: ChatCompletionUserMessageParam = {
      role: "user",
      content: input.trim(),
    };

    messages.push(userMessage);
    await createChatCompletion(messages);

    console.log(messages);

    if (input === "exit") {
      rl.close();
    } else {
      rl.prompt();
    }
  });
}

mainWithReadline();
