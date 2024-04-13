import {
  ChatCompletion,
  ChatCompletionMessage,
  ChatCompletionMessageParam,
  ChatCompletionTool,
  ChatCompletionToolMessageParam,
  ChatCompletionUserMessageParam,
} from "openai/resources";
import { rl } from "./interface";
import { createChatCompletion } from "./chat";
import availableFns from "./functions";

interface ChoiceWithToolCalls extends ChatCompletion.Choice {
  finish_reason: "tool_calls";
  message: ChatCompletionMessageWithToolCalls;
}

type ChatCompletionMessageWithToolCalls = Required<
  Omit<ChatCompletionMessage, "function_call">
>;

const messages: ChatCompletionMessageParam[] = [
  {
    role: "system",
    content:
      "You are a helpful flight assistant that can help users book flights and find flights.",
  },
];

const tools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "getFlights",
      description: "Get the list of flights between two locations",
      parameters: {
        type: "object",
        properties: {
          origin: {
            type: "string",
            description: "The airport code of the origin. e.g. SYD",
          },
          destination: {
            type: "string",
            description: "The airport code of the destination. e.g. LAX",
          },
        },
        required: ["origin", "destination"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "bookFlight",
      description: "Book a flight",
      parameters: {
        type: "object",
        properties: {
          flightNumber: {
            type: "string",
            description: "The flight number to book",
          },
          name: {
            type: "string",
            description: "The name of the passenger",
          },
          passportNumber: {
            type: "string",
            description: "The passport number of the passenger",
          },
          numberOfTickets: {
            type: "number",
            description: "The number of tickets to book",
          },
          email: {
            type: "string",
            description: "The email address of the passenger",
          },
        },
        required: [
          "flightNumber",
          "name",
          "passportNumber",
          "numberOfTickets",
          "email",
        ],
      },
    },
  },
];

rl.setPrompt("You: ");

function main() {
  rl.prompt();
  rl.on("line", async function processInput(input) {
    const userMessage: ChatCompletionUserMessageParam = {
      role: "user",
      content: input.trim(),
    };

    messages.push(userMessage);
    const completion = await createChatCompletion(messages, tools);

    if (shouldCallTool(completion)) {
      const { tool_calls } = completion.message;

      for (const toolCall of tool_calls) {
        const { id: toolCallId } = toolCall;
        const { name: toolName, arguments: rawToolArgs } = toolCall.function;

        const toolArgs = JSON.parse(rawToolArgs);

        const fnResponse = await availableFns[
          toolName as keyof typeof availableFns
        ](toolArgs);

        const toolMessage: ChatCompletionToolMessageParam = {
          role: "tool",
          tool_call_id: toolCallId,
          content: fnResponse,
        };

        messages.push(toolMessage);
      }

      const completionWithTool = await createChatCompletion(messages, tools);

      console.log(completionWithTool.message.content);
    } else {
      console.log(`${completion.message.role}: ${completion.message.content}`);
    }

    if (input === "exit") {
      rl.close();
    } else {
      rl.prompt();
    }
  });
}

main();

function shouldCallTool(
  completion: ChatCompletion.Choice
): completion is ChoiceWithToolCalls {
  return completion.finish_reason === "tool_calls";
}
