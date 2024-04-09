import { OpenAI } from "openai";
import readline from "readline";

const openai = new OpenAI();

function mainWithReadline() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // readline module in Node.js provides a method called setPrompt which can be used to display a prompt before user input
  rl.setPrompt("user: ");
  rl.prompt();

  rl.on("line", async function processInput(input) {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        {
          role: "user",
          content: input,
        },
      ],
    });

    console.log("Assistant:", response.choices[0]?.message.content);

    // display the prompt again
    if (input === "exit") {
      rl.close();
    } else {
      rl.prompt();
    }
  });
}

mainWithReadline();
