import langSmithClient from "./client";

export type ExampleInput = Record<"input", string>;
export type ExampleOutput = Record<"output", string>;

// Provide example.inputs and example.outputs
const inputs: ExampleInput[] = [
  {
    input:
      "Which country's customers spent the most? And how much did they spend?",
  },
  {
    input: "What was the most purchased track of 2023?",
  },
  {
    input: "How many albums does the artist Led Zeppelin have?",
  },
  {
    input: "What is the total price for the album “Big Ones”?",
  },
  {
    input: "Which sales agent made the most in sales in 2009?",
  },
];

const outputs: ExampleOutput[] = [
  {
    output:
      "The country whose customers spent the most is the USA, with a total expenditure of $523.06",
  },
  { output: "The most purchased track of 2023 was Hot Girl." },
  { output: "Led Zeppelin has 14 albums" },
  { output: "The total price for the album 'Big Ones' is 14.85" },
  { output: "Steve Johnson made the most sales in 2009" },
];

// Create the dataset
export const DATASET_NAME = "sql-agent-05-08";

export async function createDataset() {
  const dataset = await langSmithClient.createDataset(DATASET_NAME, {
    description:
      "Dataset for evaluating the sql agent's predictions against the reference outputs on a set of questions related to the Chinook database.",
  });

  await langSmithClient.createExamples({
    inputs,
    outputs,
    datasetId: dataset.id,
  });
}
