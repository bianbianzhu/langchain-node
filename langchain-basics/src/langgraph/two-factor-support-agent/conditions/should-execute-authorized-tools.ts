import { GraphNodes } from "../app";
import { AuthenticationState, GraphState } from "../graph-state";

function shouldExecuteAuthorizedTool(state: GraphState) {
  console.log("----SHOULD-EXECUTE-AUTHORIZED-TOOLS---");
  const { authenticationState } = state;

  if (authenticationState === AuthenticationState.Authenticated) {
    return GraphNodes.InvokeAuthorizedTools;
  } else {
    return GraphNodes.RequestAuthorization;
  }
}

export default shouldExecuteAuthorizedTool;
