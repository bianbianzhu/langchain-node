const URL_TIMEOUT = "https://user1713861685783.requestly.tech/timeout";
const URL_200 = "https://user1713861685783.requestly.tech/orders";
const URL_500 = "https://user1713861685783.requestly.tech/flights";

class HttpError extends Error {
  constructor(public response: Response) {
    super(`HTTP error: ${response.status} ${response.statusText}`);
    // this.response = response; // This line is not necessary in TypeScript
  }
}

(async () => {
  try {
    const response = await fetch(URL_TIMEOUT, {
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      throw new HttpError(response);
    }

    const data = await response.json();
    console.log(data);
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      console.log("Request was aborted");
      return;
    }

    if (error instanceof HttpError) {
      if (error.response.status === 404) {
        console.log("Not found");
      } else if (error.response.status === 500) {
        console.log("Server error");
      } else {
        console.log("Unknown error");
      }
    }
  }
})();
