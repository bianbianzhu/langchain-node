import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { Runnable } from "@langchain/core/runnables";

const chatModel = new ChatOpenAI({
  model: "gpt-3.5-turbo",
});

async function main() {
  const promptTemplate = ChatPromptTemplate.fromTemplate(
    "What is the price of {product_name} in {category}?"
  );

  // Create a chain:
  // 1. Connecting the chat model with the prompt template
  const chain = promptTemplate.pipe(chatModel);

  // 2. Invoking the chain
  const response = await chain.invoke({
    product_name: "Apple",
    category: "fruit",
  });

  console.log(response);
}

// main();

async function stopSequence() {
  const prompt = ChatPromptTemplate.fromTemplate(
    `Give me a list of facts about {subject}`
  );

  const chain = prompt
    .bind({
      metadata: {
        m_subject: "capybaras",
      },
    })
    .pipe(
      chatModel.bind({
        stop: ["4. "],
      })
    );

  console.log(JSON.stringify(chain, null, 2));

  const result = await chain.invoke({ subject: "capybaras" });

  console.log(result);
}

stopSequence();
