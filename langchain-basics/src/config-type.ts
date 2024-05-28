import { assessmentConfig } from "./config";

type NonAlphanumeric =
  | " "
  | "\t"
  | "\n"
  | "\r"
  | '"'
  | "'"
  | "{"
  | "["
  | "("
  | "`"
  | ":"
  | ";";

export type InputValues<K extends string = string> = Record<K, any>;

type ExtractParamsRecursive<
  T extends string,
  Result extends string[] = []
> = T extends `${string}{{${infer Param}}}${infer Rest}`
  ? Param extends `${NonAlphanumeric}${string}`
    ? ExtractParamsRecursive<Rest, Result>
    : ExtractParamsRecursive<Rest, [...Result, Param]>
  : Result;

export type ParamsFromString<T extends string> = {
  [Key in ExtractParamsRecursive<T>[number]]: string;
};

const extractedString = assessmentConfig.screens[0]?.body ?? "";

const paramValuePairs: ParamsFromString<(typeof extractedString)[number]> = {
  name: "John Doe",
  questions: "ibs related questions",
  subtype: "Ibs-Mixed",
};

function replaceParamsWithValues<T extends string, K extends string = string>(
  input: T,
  values: InputValues<K>
): string {
  return input.replace(
    /{{\s*([^\s]+)\s*}}/g,
    (_, key) => values[key as K] as string
  );
}

function loopThroughBody<T extends string>(
  body: T[],
  values: InputValues<keyof ParamsFromString<T>>
): string[] {
  return body.map((item) => replaceParamsWithValues(item, values));
}

const finalBody = loopThroughBody(
  assessmentConfig.screens[0].body,
  paramValuePairs
);
