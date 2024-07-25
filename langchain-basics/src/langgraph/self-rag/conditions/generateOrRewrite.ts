import { GraphNodes } from "../app";
import { GraphState } from "../graph-state";

function generateOrRewrite(
  state: GraphState
): GraphNodes.Generate | GraphNodes.RewriteQuery {
  const { documents } = state;

  if (documents.length === 0) {
    return GraphNodes.RewriteQuery;
  }

  return GraphNodes.Generate;
}

export default generateOrRewrite;
