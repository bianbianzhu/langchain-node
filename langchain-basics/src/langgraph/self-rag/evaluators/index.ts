import {
  evaluate,
  GradingFunctionParams,
  GradingFunctionResult,
  StringEvaluator,
} from "langsmith/evaluation";
import { runOnDataset } from "langchain/smith";
import app from "../app";
import { DATASET_NAME, langsmithClient } from "./dataset";

// How to use the StringEvaluator class
// await evaluate(
//     (input: { input: string }) => ({ output: `Welcome ${input.input}` }),
//     {
//       data: datasetName,
//       evaluators: [
//         new StringEvaluator({
//           evaluationName: "Sample String Evaluator",
//           gradingFunction: async (params) => {
//             const exactMatch = params.answer === params.prediction;

//             return {
//               score: exactMatch ? 1 : 0,
//               comment: exactMatch ? "Correct" : "Incorrect",
//             };
//           },
//         }),
//       ],
//       experimentPrefix: "sample-test",
//       metadata: {
//         version: "1.0.0",
//         revision_id: "beta",
//       },
//     }
//   );

const answerVsReferenceEvaluator = new StringEvaluator({
  evaluationName: "CoT_QA_Ans_vs_Ref",
  inputKey: "input", // Record<"input", string>
  answerKey: "output", // Record<"output", string>
  predictionKey: "output",
  gradingFunction: answerVsReference,
});

async function answerVsReference(
  params: GradingFunctionParams
): Promise<GradingFunctionResult> {
  // The param object contains the input, prediction, and answer.
  // It successfully gets these values from the run and example objects.
  // params.input - example.inputs
  const { input, prediction, answer } = params;

  return {
    score: prediction === answer ? 1 : 0,
    comment: prediction === answer ? "Correct" : "Incorrect",
  };
}

async function startEvaluation() {
  await evaluate(app, {
    data: DATASET_NAME,
    client: langsmithClient,
    evaluators: [answerVsReferenceEvaluator],
    experimentPrefix: "Ans_vs_Ref",
  });
}

startEvaluation();

// runOnDataset is deprecated and will be removed in future LangSmith versions, use `evaluate` from `langsmith/evaluation` instead.
