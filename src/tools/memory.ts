import { TToolArg } from "@/hooks";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { ChatOpenAI } from "@langchain/openai";
import { StructuredOutputParser } from "langchain/output_parsers";
import { z } from "zod";
const memoryParser = StructuredOutputParser.fromZodSchema(
  z.object({
    memories: z
      .array(z.string().describe("key information point"))
      .describe("list of key informations"),
  })
);
const memoryTool = (args: TToolArg) => {
  const { sendToolResponse, preferences, updatePreferences } = args; // Remove apiKeys
  const memorySchema = z.object({
    memory: z
      .string()
      .describe(
        "key information about the user, any user preference to personalize future interactions. It must be short and concise"
      ),
    question: z.string().describe("question user asked"),
  });

  return new DynamicStructuredTool({
    name: "memory",
    description:
      "Useful when the user provides key information or preferences to personalize future interactions. The user may specifically ask to remember something.",
    schema: memorySchema,
    func: async ({ memory, question }, runManager) => {
      try {
        const existingMemories = preferences?.memories;
        const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY; // Use environment variable

        if (!apiKey) {
          throw new Error("Server misconfiguration: OpenAI API key not set.");
        }

        const model = new ChatOpenAI({
          model: "gpt-4o",
          apiKey, // Use env key
        });

        const chain = RunnableSequence.from([
          PromptTemplate.fromTemplate(
            `Here is new information: {new_memory} \n and update the following information if required otherwise add new information: """{existing_memory}""" \n{format_instructions} `
          ),
          new ChatOpenAI({
            model: "gpt-4o",
            apiKey, // Use env key
          }),
          memoryParser as any,
        ]);

        console.log("chain", chain);

        const response = await chain.invoke({
          new_memory: memory,
          existing_memory: existingMemories?.join("\n"),
          format_instructions: memoryParser.getFormatInstructions(),
        });

        console.log(`response`, response);
        if (!response) {
          runManager?.handleToolError("Error updating memory");
          return question;
        }

        updatePreferences({
          memories: response.memories,
        });

        console.log("Memory updated", response);
        sendToolResponse({
          toolName: "memory",
          toolArgs: { memory },
          toolResponse: response,
        });

        return question;
      } catch (error) {
        console.error(error);
        return "Error updating memory.";
      }
    },
  });
};

export { memoryTool };
