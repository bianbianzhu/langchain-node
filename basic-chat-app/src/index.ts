import { OpenAI } from "openai";

const openai = new OpenAI();

async function main() {
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      {
        role: "user",
        content: "give me a 10 words story",
      },
    ],
  });

  console.log(response.choices[0]?.message.content);
}

main();
