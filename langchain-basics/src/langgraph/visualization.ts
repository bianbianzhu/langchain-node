import { Runnable } from "@langchain/core/runnables";
import fs from "fs";

export async function visualization(
  path: string,
  app: Runnable
): Promise<void> {
  const imageBlob = await app.getGraph().drawMermaidPng();
  // const imageString = app.getGraph().drawMermaid();

  // const nodeObjects = app.getGraph().nodes;

  // const stringWithNodes = replaceOtherClass(imageString);

  // const colorStyles = Object.keys(nodeObjects)
  //   .map((key) => `\tclassDef ${key}class fill:${generateRandomColor()};\n`)
  //   .join("");

  // const finalString = stringWithNodes + colorStyles;

  // const imageBlob = await drawMermaidPng(finalString, {
  //   backgroundColor: "white",
  // });
  const imageArrayBuffer = await imageBlob.arrayBuffer();
  const imageBuffer = Buffer.from(imageArrayBuffer);
  // save the image to "./images/graph.png" using fs
  fs.writeFile(path, imageBuffer, (err) => {
    if (err) {
      console.error("Failed to save the image.", err);
      return;
    }

    console.log("The image has been saved.");
    return;
  });

  // fs.writeFileSync("./src/self-rag/images/graph.png", imageBuffer);
}

// this function is copied directly from langchain-core/src/runnables/graph_mermaid.ts
async function drawMermaidPng(
  mermaidSyntax: string,
  config?: {
    backgroundColor?: string;
  }
) {
  let { backgroundColor = "white" } = config ?? {};
  // Use btoa for compatibility, assume ASCII
  const mermaidSyntaxEncoded = btoa(mermaidSyntax);
  // Check if the background color is a hexadecimal color code using regex
  if (backgroundColor !== undefined) {
    const hexColorPattern = /^#(?:[0-9a-fA-F]{3}){1,2}$/;
    if (!hexColorPattern.test(backgroundColor)) {
      backgroundColor = `!${backgroundColor}`;
    }
  }
  const imageUrl = `https://mermaid.ink/img/${mermaidSyntaxEncoded}?bgColor=${backgroundColor}`;
  const res = await fetch(imageUrl);
  if (!res.ok) {
    throw new Error(
      [
        `Failed to render the graph using the Mermaid.INK API.`,
        `Status code: ${res.status}`,
        `Status text: ${res.statusText}`,
      ].join("\n")
    );
  }
  const content = await res.blob();
  return content;
}

function replaceOtherClass(text: string): string {
  // Regular expression to match the pattern '([CONTENT]):::otherclass'
  const pattern = /\((\[.*?\])\):::\s*otherclass/g;

  return text.replace(pattern, (match, group1) => {
    // Extract the text within the nearest '[]'
    const insideBrackets = group1.match(/\[(.*?)\]/)?.[1] ?? "";

    // Replace 'otherclass' with the extracted text followed by 'class'
    return `(${group1}):::${insideBrackets}class`;
  });
}

function generateRandomColor(): string {
  const randomColor = Math.floor(Math.random() * 16777215).toString(16);
  return `#${randomColor}`;
}
