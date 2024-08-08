import { Client, Run, Example } from "langsmith";
import { evaluate } from "langsmith/evaluation";
import { EvaluationResult } from "langsmith/evaluation";
import { RunEvaluatorLike } from "langchain/smith";

const client = new Client();
const datasetName = "Sample Dataset";

/**
 * For evaluator that compare text (e.g., answer vs reference answer, etc).
 * In python, we can use the built-in `LangChainStringEvaluator` All `LangChainStringEvaluator` implementations can accept 3 inputs:
 * @param prediction: The prediction string - the output of the model
 * @param reference: The reference string - the expected output from the dataset
 * @param input: The input string - the question from the dataset or user input
 */

// In TS, we need to define our evaluator - Must follow RunEvaluatorLike type and `example` must be optional

/** type definition: (from langchain/smith)
export type RunEvaluatorLike = 

 | ((run: Run, example?: Example) => Promise<EvaluationResult | EvaluationResults>) 
 
 | ((run: Run, example?: Example) => 
 EvaluationResult | EvaluationResults);
 */

const sampleEvaluator = async (
  run: Run,
  example?: Example
): Promise<EvaluationResult> => {
  // Run - RunTree includes the input from the dataset, and the output from the model (input and prediction)
  // run.inputs?.<your-key-in-example> and run.outputs?.<your-key-in-model-response>

  // Example - includes the input from the dataset, and the output from the dataset (input and reference)
  // example.inputs?.<your-key-in-example> and example.outputs?.<your-key-in-example>

  //*****Unlike StringEvaluator, Fully flexible of the input.key and output.key*******

  // In our case, the run input key is "prefix", the example output key is "final" and the run output key is "output"

  return {
    key: "exact_match",
    score: run.outputs?.output === example?.outputs?.final,
  };
};

async function createDataset() {
  // Define dataset: these are your test cases

  const dataset = await client.createDataset(datasetName, {
    description: "A sample dataset in LangSmith.",
  });

  await client.createExamples({
    inputs: [
      { prefix: "to LangSmith" },
      { prefix: "to Evaluations in LangSmith" },
    ],
    outputs: [
      { final: "Welcome to LangSmith" },
      { final: "Welcome to Evaluations in LangSmith haha" },
    ],
    datasetId: dataset.id,
  });
}

async function startEvaluation() {
  const datasetExists = await client.hasDataset({ datasetName });

  if (!datasetExists) {
    await createDataset();
  }
  // must be awaited before evaluation to ensure dataset is created and dataset.id is available

  await evaluate(
    (input: { prefix: string }) => ({ output: `Welcome ${input.prefix}` }), // this is the runnalbe you want to evaluate. It accepts the input (each element of `inputs` from the dataset example) and returns the prediction - in our case, an object with the key `output`
    {
      data: datasetName,
      evaluators: [sampleEvaluator],
      experimentPrefix: "sample-test",
      numRepetitions: 2,
      metadata: {
        version: "1.0.0",
        revision_id: "beta",
      },
    }
  );
}

startEvaluation();
