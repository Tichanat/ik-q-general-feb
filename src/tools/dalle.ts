import { TToolArg } from "@/hooks";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { DallEAPIWrapper } from "@langchain/openai";
import { z } from "zod";

const dalleTool = (args: TToolArg) => {
  const { sendToolResponse } = args;
  const imageGenerationSchema = z.object({
    imageDescription: z.string(),
  });

  return new DynamicStructuredTool({
    name: "image_generation",
    description: "Useful for when you are asked to generate an image based on a description.",
    schema: imageGenerationSchema,
    func: async ({ imageDescription }, runManager) => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;

        if (!apiKey) {
          throw new Error("Server misconfiguration: OpenAI API key not set.");
        }

        const tool = new DallEAPIWrapper({
          n: 1,
          model: "dall-e-3",
          apiKey,
        });

        console.log("🎨 Calling DALL·E API with description:", imageDescription); // ✅ Log input
        const result = await tool.invoke(imageDescription);
        console.log("🎨 DALL·E API Response:", result); // ✅ Log output

        if (!result) {
          runManager?.handleToolError("Error performing DALL·E image generation");
          throw new Error("Invalid response from DALL·E API");
        }

        // Extract image URL (if DALL·E returns data array)
        const imageUrl = result?.data?.[0]?.url || result;

        console.log("🖼️ Extracted Image URL:", imageUrl); // ✅ Log extracted URL

        sendToolResponse({
          toolName: "image_generation",
          toolArgs: { imageDescription },
          toolRenderArgs: { image: imageUrl }, // Pass only image URL
          toolResponse: imageUrl,
        });

        return imageUrl; // Return the image URL
      } catch (error) {
        console.error("❌ DALL·E Error:", error);
        return "Error performing DALL·E image generation.";
      }
    },
  });
};


export { dalleTool };
