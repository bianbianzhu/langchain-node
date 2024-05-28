import { ChatOpenAI } from "@langchain/openai";

const MAX_TOKENS = 700;

const model = new ChatOpenAI({
  model: "gpt-3.5-turbo",
  temperature: 0.8,
  maxTokens: MAX_TOKENS,
  verbose: true, // log
});

async function main() {
  const response = await model.stream("give me 4 books to read");

  for await (const chunk of response) {
    console.log(chunk.content);
  }
}

main();
