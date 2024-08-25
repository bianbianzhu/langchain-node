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
    providedTwoFactorCode: undefined, // `undefined` will remove the key from the state (if the key exists + initial is `null` (has no reducer))
    generatedTwoFactorCode: undefined, // `undefined` will remove the key from the state (if the key exists + initial is `null` (has no reducer))
  };
}

export default confirmAuthorization;
