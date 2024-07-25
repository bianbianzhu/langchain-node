import app from "./app";

async function main() {
  const config = { configurable: { thread_id: "42" } };

  const response1 = await app.invoke(
    {
      questions: ["What is Minimum Inner Search"],
    },
    config
  );

  const response2 = await app.invoke(
    {
      questions: ["What are the proof-of-concept examples?"],
    },
    config
  );

  console.log(response2);
}

main();
