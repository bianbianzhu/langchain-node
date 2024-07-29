import { GraphNodes } from "../app";
import { GraphState } from "../graph-state";

const REWRITE_THRESHOLD = 3; // Maximum number of times to rewrite the query

function generateOrRewrite(
  state: GraphState
): GraphNodes.Generate | GraphNodes.RewriteQuery {
  const { documents, count } = state;

  if (documents.length === 0 && count.rewriteQuery < REWRITE_THRESHOLD) {
    console.log("*** DECIDE: REWRITE QUERY ***");
    return GraphNodes.RewriteQuery;
  }

  console.log("*** DECIDE: GENERATE ***");
  return GraphNodes.Generate;
}

export default generateOrRewrite;
