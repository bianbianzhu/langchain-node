import { AuthenticationState, GraphState } from "../graph-state";

async function confirmAuthorization(
  state: GraphState
): Promise<
  Pick<
    GraphState,
    "authenticationState" | "generatedTwoFactorCode" | "providedTwoFactorCode"
  >
> {
  console.log("----CONFIRM-AUTHORIZATION-NODE---");
  const { generatedTwoFactorCode, providedTwoFactorCode } = state;

  const isAuthorized = generatedTwoFactorCode === providedTwoFactorCode;

  return {
    authenticationState: isAuthorized
      ? AuthenticationState.Authenticated
      : AuthenticationState.Authorizing,
    providedTwoFactorCode: undefined,
    generatedTwoFactorCode: undefined,
  };
}

export default confirmAuthorization;
