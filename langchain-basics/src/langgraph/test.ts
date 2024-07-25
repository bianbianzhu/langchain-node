import { z } from "zod";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";

const calculatorSchema = z.object({
  operation: z
    .enum(["add", "subtract", "multiply", "divide"])
    .describe("The type of operation to execute"),
  number1: z.number().describe("The first number to operate on."),
  number2: z.number().describe("The second number to operate on."),
});

const model = new ChatOpenAI({
  model: "gpt-4o",
  temperature: 0.1,
});

// Pass the schema and tool name to the withStructuredOutput method
const modelWithTool = model.withStructuredOutput(calculatorSchema);

// You can also set force: false to allow the model scratchpad space.
// This may improve reasoning capabilities.
// const modelWithTool = model.withStructuredOutput(calculatorSchema, {
//   force: false,
// });

const prompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    "You are a helpful assistant who always needs to use a calculator.",
  ],
  ["human", "{input}"],
]);

// Chain your prompt and model together
const chain = prompt.pipe(modelWithTool);

(async () => {
  const response = await chain.invoke({
    input: "What is 2 + 2?",
  });
  console.log(response);
})();
/*
  { operation: 'add', number1: 2, number2: 2 }
*/
