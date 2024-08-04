import app from "./app";
import { GraphState } from "./graph-state";

async function main() {
  const config = { configurable: { thread_id: "42" } };

  const response1 = (await app.invoke(
    {
      questions: ["my character is called `Kael` and it is a hunter"],
    },
    config
  )) as GraphState;

  const response2 = await app.invoke(
    {
      questions: ["What is my character's class?"],
    },
    config
  );

  console.log(response2.chatHistory);
}

main();
