import {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources";
import { openai } from "./openai";
import { encoding_for_model } from "tiktoken";

const MAX_TOKEN_LIMIT = 500;
const encoder = encoding_for_model("gpt-3.5-turbo");

export async function createChatCompletion(
  messages: ChatCompletionMessageParam[],
  tools?: ChatCompletionTool[]
) {
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages,
    tools,
    tool_choice: "auto",
  });

  const completion = response.choices[0];

  if (!completion) {
    throw new Error("No completion found");
  }

  const { message: completionMessage } = completion;

  messages.push(completionMessage);

  if (response.usage && response.usage.total_tokens > MAX_TOKEN_LIMIT) {
    deleteOlderMessages(messages);
  }

  // console.log(`${completionMessage.role}: ${completionMessage.content}`);

  return completion;
}

function deleteOlderMessages(messages: ChatCompletionMessageParam[]) {
  let tokens = countTokens(messages);

  while (tokens > MAX_TOKEN_LIMIT) {
    const index = messages.findIndex((message) => message.role !== "system");
    messages.splice(index, 1);

    tokens = countTokens(messages);
  }
}

function countTokens(messages: ChatCompletionMessageParam[]) {
  let count = 0;
  for (const { content } of messages) {
    if (typeof content === "string") {
      count += encoder.encode(content).length;
    } else if (Array.isArray(content)) {
      const tokens = content.reduce(
        (acc, part) =>
          part.type === "text" ? acc + encoder.encode(part.text).length : acc,
        0
      );
      count += tokens;
    } else {
      continue;
    }
  }

  return count;
}
