import { OpenAI } from "openai";

const openai = new OpenAI();

function main() {
  //   Unfortunately, Node.js's process.stdin does not support placeholders. It's a stream that represents input from the terminal, and it doesn't have a built-in way to display a placeholder or prompt.

  // However, you can simulate a prompt by using process.stdout.write to display a message before waiting for input. Here's how you can do it:
  process.stdout.write("User: ");
  process.stdin.addListener("data", async function processInput(input) {
    // the type of input is Buffer
    // convert it to string and remove the leading or trailing newline character
    const userInput = input.toString().trim();
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        {
          role: "user",
          content: userInput,
        },
      ],
    });

    console.log("Assistant:", response.choices[0]?.message.content);
    // display the prompt again
    process.stdout.write("User: ");
  });
}

// main();
