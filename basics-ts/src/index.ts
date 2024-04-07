import { OpenAI } from "openai";
import { encoding_for_model } from "tiktoken";

/**
 * This function encodes the prompt using the TikToken library
 * @param prompt
 * @returns Uint32Array which is the encoded form of the prompt string, where each integer in the array represents a token from the prompt. Basically, a list of token ids.
 */
function encodePrompt(prompt: string) {
  // Specify the model you want to use
  const encoder = encoding_for_model("gpt-3.5-turbo");
  // Encode the prompt
  return encoder.encode(prompt);
}

const prompt = "What is the fastest car?";
const tokenIds = encodePrompt(prompt);

console.log(tokenIds);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function main() {
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      {
        role: "user",
        content: "give me a 50 words story",
      },
    ],
    seed: 1234567890,
  });

  console.log(response.choices[0]?.message.content);
}

main();
main();
