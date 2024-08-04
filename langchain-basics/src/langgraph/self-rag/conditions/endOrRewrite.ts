import { GraphNodes } from "../app";
import { GraphState } from "../graph-state";
import { END } from "@langchain/langgraph";

const TOTAL_REWRITE_THRESHOLD = 5; // Maximum number of times to rewrite the query

function endOrRewrite(state: GraphState): GraphNodes.RewriteQuery | typeof END {
  const { generationUseful, count } = state;

  if (!generationUseful.grade && count.rewriteQuery < TOTAL_REWRITE_THRESHOLD) {
    console.log("*** DECIDE: REWRITE QUERY ***");
    return GraphNodes.RewriteQuery;
  }

  console.log("*** DECIDE: END ***");
  return END;
}

export default endOrRewrite;
