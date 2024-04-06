import { OpenAI } from "openai";

export const openai = new OpenAI();

const main = async () => {
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "user",
        content: "How big is the earth?",
      },
    ],
  });

  console.log(response.choices[0].message.content);
};

main();
