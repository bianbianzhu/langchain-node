import appInit from "./app";
import { HumanMessage } from "@langchain/core/messages";

// This is the doc https://docs.smith.langchain.com/tutorials/Developers/agents#sql-agent

async function main() {
  const app = await appInit();

  const res = await app.invoke(
    {
      messages: [
        new HumanMessage(
          "Which country's customers spent the most? And how much did they spend?"
        ),
      ],
    },
    {
      configurable: { thread_id: "42" },
    }
  );

  console.log(res);

  const res2 = await app.invoke(
    {
      messages: [
        new HumanMessage(
          "Can you repeat the name of the country and the amount spent?"
        ),
      ],
    },
    {
      configurable: { thread_id: "42" },
    }
  );

  console.log(res2);
}

main();
