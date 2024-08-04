import { z } from "zod";
import { GraphNodes } from "../app";
import { GraphState } from "../graph-state";

const REGENERATE_THRESHOLD = 3; // Maximum number of times to regenerate the query

function prepFinalORRegenerate(
  state: GraphState
): GraphNodes.Generate | GraphNodes.PrepForFinalGrade {
  const { generationGrounded, count } = state;

  // The first time of generation should not be counted (minus 1)
  const regenerateCount = count.regenerate > 0 ? count.regenerate - 1 : 0;

  if (!generationGrounded.grade && regenerateCount < REGENERATE_THRESHOLD) {
    console.log("*** DECIDE: REGENERATE ***");
    return GraphNodes.Generate;
  }

  console.log("*** DECIDE: PREPARE FOR FINAL GRADE ***");
  return GraphNodes.PrepForFinalGrade;
}

export default prepFinalORRegenerate;
