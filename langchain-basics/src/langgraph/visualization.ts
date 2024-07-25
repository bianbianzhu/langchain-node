import { Runnable } from "@langchain/core/runnables";
import fs from "fs";

export async function visualization(app: Runnable): Promise<void> {
  const imageBlob = await app.getGraph().drawMermaidPng();
  const imageArrayBuffer = await imageBlob.arrayBuffer();
  const imageBuffer = Buffer.from(imageArrayBuffer);
  // save the image to "./images/graph.png" using fs
  fs.writeFile("./src/self-rag/images/graph.png", imageBuffer, (err) => {
    if (err) {
      console.error("Failed to save the image.", err);
      return;
    }

    console.log("The image has been saved.");
    return;
  });

  // fs.writeFileSync("./src/self-rag/images/graph.png", imageBuffer);
}
