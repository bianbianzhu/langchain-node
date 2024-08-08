import { evaluate } from "langsmith/evaluation";
import { predictSQLAgentAnswer } from "./predict-sql-agent-answer";
import { createDataset, DATASET_NAME } from "./dataset";
import { answerVsReferenceEvaluator } from "./evaluator";
import { langsmithClient } from "../../../self-rag/evaluators/dataset";

async function runExperiment() {
  const datasetExists = await langsmithClient.hasDataset({
    datasetName: DATASET_NAME,
  });

  if (!datasetExists) {
    console.log("Creating dataset...");
    await createDataset();
  }

  await evaluate(predictSQLAgentAnswer, {
    data: DATASET_NAME,
    evaluators: [answerVsReferenceEvaluator],
    experimentPrefix: "sql-agent",
    metadata: {
      version: "1.0.0",
      revision_id: "beta",
    },
  });
}

runExperiment();
