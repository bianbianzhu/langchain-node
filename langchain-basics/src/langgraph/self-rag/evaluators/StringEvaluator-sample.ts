import { Client, Run, Example } from "langsmith";
import { evaluate, StringEvaluator } from "langsmith/evaluation";
import { EvaluationResult } from "langsmith/evaluation";

const client = new Client();
const datasetName = "Sample Dataset";

// This evaluator compare text (e.g., answer vs reference answer, etc).

/**
 * For python, we can use the built-in `LangChainStringEvaluator` All `LangChainStringEvaluator` implementations can accept 3 inputs:
 * @param prediction: The prediction string - the output of the model
 * @param reference: The reference string - the expected output from the dataset
 * @param input: The input string - the question from the dataset or user input
 */

// In TS, we need to define our evaluator - Must follow EvaluatorT type and `example` must be optional

const sampleEvaluator = async (
  run: Run,
  example?: Example
): Promise<EvaluationResult> => {
  // Run - RunTree includes the input from the dataset, and the output from the model (input and prediction)
  // run.inputs?.<your-key-in-example> and run.outputs?.<your-key-in-model-response>

  // Example - includes the input from the dataset, and the output from the dataset (input and reference)
  // example.inputs?.<your-key-in-example> and example.outputs?.<your-key-in-example>

  return {
    key: "exact_match",
    score: run.outputs?.output === example?.outputs?.output,
  };
};

async function createDataset() {
  // Define dataset: these are your test cases

  const dataset = await client.createDataset(datasetName, {
    description: "A sample dataset in LangSmith.",
  });

  await client.createExamples({
    inputs: [
      { input: "to LangSmith" },
      { input: "to Evaluations in LangSmith" },
    ],
    outputs: [
      { output: "Welcome to LangSmith" },
      { output: "Welcome to Evaluations in LangSmith1" },
    ],
    datasetId: dataset.id,
  });
}

async function startEvaluation() {
  await createDataset(); // must be awaited before evaluation to ensure dataset is created and dataset.id is available

  await evaluate(
    (input: { input: string }) => ({ output: `Welcome ${input.input}` }),
    {
      data: datasetName,
      evaluators: [
        new StringEvaluator({
          evaluationName: "Sample String Evaluator",
          gradingFunction: async (params) => {
            console.log(`input: ${params.input}`);
            console.log(`params: ${JSON.stringify(params, null, 2)}}`);
            const exactMatch = params.answer === params.prediction;

            return {
              score: exactMatch ? 1 : 0,
              comment: exactMatch ? "Correct" : "Incorrect",
            };
          },
        }),
      ],
      experimentPrefix: "sample-test",
      metadata: {
        version: "1.0.0",
        revision_id: "beta",
      },
    }
  );
}

startEvaluation();
