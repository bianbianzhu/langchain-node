import {
  ChatCompletion,
  ChatCompletionMessage,
  ChatCompletionMessageParam,
  ChatCompletionTool,
  ChatCompletionToolMessageParam,
  ChatCompletionUserMessageParam,
} from "openai/resources";
import { createChatCompletion } from "./chat";
import { rl } from "./interface";

interface ChoiceWithToolCalls extends ChatCompletion.Choice {
  finish_reason: "tool_calls";
  message: ChatCompletionMessageWithToolCalls;
}

type ChatCompletionMessageWithToolCalls = Required<
  Omit<ChatCompletionMessage, "function_call">
>;

rl.setPrompt("You: ");

// 1. Configure chat tools for first openAI call
const tools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "getTimeOfDay",
      description: "Get the current time of day",
    },
  },
];

function main() {
  const messages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content:
        "You are a helpful assistant that gives information about the time of day",
    },
  ];

  rl.prompt();

  rl.on("line", async (input) => {
    const userMessage: ChatCompletionUserMessageParam = {
      role: "user",
      content: input.trim(),
    };
    messages.push(userMessage);

    const completion = await createChatCompletion(messages, tools);

    // 2. Decide if tool call is required
    if (shouldCallTool(completion)) {
      const { tool_calls } = completion.message;
      // 3. Invoke the tool
      if (!tool_calls[0]) {
        throw new Error("No tool call found");
      }

      const { name: toolName } = tool_calls[0].function;
      const { id: toolCallId } = tool_calls[0];

      if (toolName === "getTimeOfDay") {
        const toolResponse = getTimeOfDay();

        // 4. make a second call to openAI with the tool response
        const toolMessage: ChatCompletionToolMessageParam = {
          role: "tool",
          content: toolResponse,
          tool_call_id: toolCallId,
        };

        messages.push(toolMessage);

        const completionWithTool = await createChatCompletion(messages, tools);

        console.log(completionWithTool.message.content);
      }
    } else {
      const { message: completionMessage } = completion;
      console.log(`${completionMessage.role}: ${completionMessage.content}`);
    }

    if (input.trim() === "exit") {
      rl.close();
    } else {
      rl.prompt();
    }
  });
}

function getTimeOfDay() {
  const date = new Date();

  return date.toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function shouldCallTool(
  completion: ChatCompletion.Choice
): completion is ChoiceWithToolCalls {
  return completion.finish_reason === "tool_calls";
}

main();
