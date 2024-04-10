import { OpenAI } from "openai";
import {
  ChatCompletionMessageParam,
  ChatCompletionUserMessageParam,
} from "openai/resources";
import readline from "readline";
import { encoding_for_model } from "tiktoken";

const MAX_TOKENS = 600;

const openai = new OpenAI();
const encoder = encoding_for_model("gpt-3.5-turbo");

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

  // @example response.usage - { prompt_tokens: 500, completion_tokens: 300, total_tokens: 800 }
  // The completion tokens are simply the number of tokens in the completion message
  if (response.usage && response.usage.total_tokens > MAX_TOKENS) {
    // delete the messages one by one from the beginning of the `messages` array until the total tokens are less than the MAX_TOKENS
    // console.log(response.usage.total_tokens);
    deleteOlderMessages(messages);
  }

  console.log(`${completionMessage.role}: ${completionMessage.content}`);
}

function deleteOlderMessages(messages: ChatCompletionMessageParam[]) {
  let totalTokens = countTokens(messages);
  // the reason why we need to calculate the total tokens use tiktoken is that we may need to remove multiple messages to make the total tokens less than MAX_TOKENS,
  // and we have to calculate the total tokens after removing each message (ofc we should not call the api to get the token count)

  while (totalTokens > MAX_TOKENS) {
    // 1. find the first message that is not a system message
    const index = messages.findIndex((message) => message.role !== "system");
    // 2. remove the message
    messages.splice(index, 1);
    // 3. calculate the total tokens again and update the totalTokens variable
    totalTokens = countTokens(messages);
  }

  // can also filter out all the system messages first and then remove the older messages and in the end add the system messages back (headache)

  // while (totalTokens > MAX_TOKENS) {
  //   for (let i = 0; i < messages.length; i++) {
  //     const message = messages[i];

  //     if (message?.role !== "system") {
  //       messages.splice(i, 1);
  //       totalTokens = countTokens(messages);
  //       break;
  //     }
  //   }
  // }
}

function countTokens(messages: ChatCompletionMessageParam[]) {
  let totalTokens = 0;

  messages.forEach((message) => {
    const { content } = message;

    if (!content) {
      return;
    }

    if (Array.isArray(content)) {
      const tokens = content.reduce(
        (acc, part) =>
          part.type === "text" ? acc + encoder.encode(part.text).length : acc,
        0
      );
      totalTokens += tokens;
    } else {
      totalTokens += encoder.encode(content).length;
    }
  });

  return totalTokens;
}

mainWithReadline();
