// import { ChatOpenAI } from "@langchain/openai";
// import { SqlDatabase } from "langchain/sql_db";
// import { DataSource } from 'typeorm'
import { ZodError, ZodIssue, z } from "zod";
const itemSchema = z.object({
  itemId: z
    .string()
    .length(3, { message: "itemId must be 3 digits" })
    .describe("The item ID"),
  name: z.string().min(3).max(100).describe("The name of the item"),
  quantity: z.number().positive().describe("The quantity of the item"),
  price: z
    .number()
    .positive()
    .refine(isTwoDecimals)
    .describe("The price of the item"),
});
const customerSchema = z.object({
  customerId: z.string().min(5).describe("The customer ID"),
  name: z.string().min(3).max(100).describe("The name of the customer"),
  address: z.string().min(3).max(100).describe("The address of the customer"),
});
const orderSchema = z.object({
  orderId: z.string().length(6).describe("The order ID"),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .describe("The date of the order"),
  status: z
    .enum(["pending", "delivered", "cancelled", "processing", "shipped"])
    .describe("The status of the order"),
  total: z
    .number()
    .positive()
    .refine(isTwoDecimals)
    .describe("The total amount of the order"),
  items: z.array(itemSchema).min(1).describe("The items of the order"),
  customer: customerSchema.describe("The customer of the order"),
});
const ordersSchema = z.object({
  orders: z.array(orderSchema).min(1).describe("The list of orders"),
});
function isTwoDecimals(value: number): boolean {
  return Number(value.toFixed(2)) === value;
}
const BASE_URL = "https://9869a3a9-f664-4a36-9b12-8eaa99787ff8.mock.pstmn.io";
const TIME_OUT_MS = 3000;
const NETWORK_ERRORS = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  500: "Internal Server Error",
  502: "Bad Gateway",
  503: "Service Unavailable",
  504: "Gateway Timeout",
  default: "Network Unknown Error",
};
const RESOURCES = {
  orders: "/orders",
  serverError: "/server-error",
  notFound: "/not-found",
  notAuthorized: "/not-authorized",
};
type ResourceName = keyof typeof RESOURCES;
type SuccessResponse<T = any> = [null, T];
type ErrorResponse = [string, null];
type FetchWrapperResponse<T = any> = SuccessResponse<T> | ErrorResponse;
type Orders = z.infer<typeof ordersSchema>;
class HttpsError extends Error {
  constructor(public response: Response) {
    super();
  }
}
async function fetchWrapper<TValues>(
  resourceName: ResourceName,
  schema: z.Schema<TValues>,
  options: RequestInit = {}
): Promise<FetchWrapperResponse<TValues>> {
  const url = new URL(RESOURCES[resourceName], BASE_URL);
  try {
    const response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(TIME_OUT_MS),
    });
    if (!response.ok) {
      throw new HttpsError(response);
    }
    const data = await response.json();
    const result = schema.safeParse(data);
    if (!result.success) {
      throw result.error;
    }
    return [null, result.data];
  } catch (error) {
    return handleError(error);
  }
}
function handleError(error: unknown): ErrorResponse {
  if (error instanceof HttpsError) {
    const errorText =
      NETWORK_ERRORS[error.response.status as keyof typeof NETWORK_ERRORS] ||
      NETWORK_ERRORS.default;
    return [errorText, null];
  } else if (error instanceof DOMException && error.name === "TimeoutError") {
    const errorText = `Timeout: ${TIME_OUT_MS}ms`;
    return [errorText, null];
  } else if (error instanceof ZodError) {
    return [(error.errors[0] as ZodIssue).message, null];
  } else {
    return [error as string, null];
  }
}
// function assertValidData(data: unknown): asserts data is Orders {}

(async () => {
  const [err, result] = await fetchWrapper("orders", ordersSchema);
  if (!err) {
    console.error(result);
  } else {
    console.error(err);
  }
})();
