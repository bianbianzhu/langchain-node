import { AuthenticationState, GraphState } from "../graph-state";
import { traceable } from "langsmith/traceable";
import { callTwilio } from "../tools/twilio";

async function requestAuthorization(
  state: GraphState
): Promise<Omit<GraphState, "messages">> {
  console.log("----REQUEST-AUTHORIZATION-NODE---");
  const { authenticationState } = state;
  const hadPreviousAttempt =
    authenticationState === AuthenticationState.Authorizing;

  const twoFactorCode = generateRandomSixDigitNumber();

  try {
    const sendSMS = traceable(callTwilio, {
      run_type: "tool",
      name: "Twilio SMS",
    });

    await sendSMS(twoFactorCode, process.env);
  } catch (error) {
    console.log(`Error in requestAuthorization: ${error}`);
  }

  return {
    authenticationState: AuthenticationState.Authorizing,
    generatedTwoFactorCode: twoFactorCode,
    providedTwoFactorCode: undefined,
    authorizationFailureCount: hadPreviousAttempt ? 1 : 0,
  };
}

function generateRandomSixDigitNumber(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default requestAuthorization;
