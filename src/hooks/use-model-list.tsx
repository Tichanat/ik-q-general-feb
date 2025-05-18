import { ModelIcon } from "@/components/model-icon";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";
import { defaultPreferences } from "./use-preferences";
import { TToolKey } from "./use-tools";
import { usePreferenceContext } from "@/context";
import { useQuery } from "@tanstack/react-query";
import { ChatOllama } from "@langchain/community/chat_models/ollama";
import { useMemo } from "react";
import { TAssistant } from "./use-chat-session";
import { useAssistants } from "./use-bots";

/**
 * The base model type informs which underlying Chat* class we should use.
 */
export type TBaseModel = "openai" | "anthropic" | "gemini" | "ollama";

/**
 * Pre-defined list of recognized model keys.
 */
export const models = [
  "gpt-4o",
  "o3",
  "o3-mini",
  "gpt-4o-mini",
  "chatgpt-4o-latest",
  // "gpt-4",
  // "gpt-4-turbo",
  // "gpt-3.5-turbo",
  // "gpt-3.5-turbo-0125",
  // "gpt-3.5-turbo-instruct",
  // "claude-3-opus-20240229",
  // "claude-3-sonnet-20240229",
  // "claude-3-haiku-20240307",
  "gemini-pro",
  "gemini-1.5-flash-latest",
  "gemini-1.5-pro-latest",
  "gemini-2.5-pro-preview-05-06",
] as const;

/**
 * A single recognized model entry.
 */
export type TModelKey = (typeof models)[number] | string;

export type TModel = {
  name: string;
  key: TModelKey;
  isNew?: boolean;
  icon: (size: "sm" | "md" | "lg") => JSX.Element;
  inputPrice?: number;
  outputPrice?: number;
  tokens: number;
  plugins: TToolKey[];
  baseModel: TBaseModel;
  maxOutputTokens: number;
};

export const useModelList = () => {
  const { preferences } = usePreferenceContext();
  const assistantsProps = useAssistants();

  // Example: we may fetch dynamic Ollama models from an API
  const ollamaModelsQuery = useQuery({
    queryKey: ["ollama-models"],
    queryFn: () =>
      fetch(`${preferences.ollamaBaseUrl}/api/tags`).then((res) => res.json()),
    enabled: false, // Only fetch if baseUrl is set
  });

  /**
   * createInstance:
   * Dynamically creates a chat model instance depending on the baseModel (openai, gemini, etc.).
   * Includes logs so you can confirm if this function is called.
   */
  const createInstance = async (model: TModel, apiKey: string) => {
    console.log(
      "🔹 [createInstance] Creating instance for model:",
      model.key,
      "| Base model:",
      model.baseModel
    );

    const temperature = preferences.temperature || defaultPreferences.temperature;
    const topP = preferences.topP || defaultPreferences.topP;
    const topK = preferences.topK || defaultPreferences.topK;
    const maxTokens = preferences.maxTokens || model.tokens;

    switch (model.baseModel) {
      case "openai":
        // console.log("✅ Using OpenAI API key:", process.env.NEXT_PUBLIC_OPENAI_API_KEY);
        return new ChatOpenAI({
          model: model.key,
          streaming: true,
          apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
          temperature,
          maxTokens,
          topP,
          maxRetries: 2,
        });

      case "anthropic":
        console.log("✅ Using Anthropic API key:", apiKey);
        return new ChatAnthropic({
          model: model.key,
          streaming: true,
          anthropicApiUrl: `${window.location.origin}/api/anthropic/`,
          apiKey,
          maxTokens,
          temperature,
          topP,
          topK,
          maxRetries: 2,
        });

      case "gemini":
        console.log("🚀 Using Gemini API key:", process.env.NEXT_PUBLIC_GEMINI_API_KEY);
        return new ChatGoogleGenerativeAI({
          model: model.key,
          apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY,
          maxOutputTokens: maxTokens,
          streaming: true,
          temperature,
          maxRetries: 1,
          onFailedAttempt: (error) => {
            console.error("❌ Gemini request failed attempt:", error);
          },
          topP,
        });

      case "ollama":
        console.log("✅ Using Ollama baseURL:", preferences.ollamaBaseUrl);
        return new ChatOllama({
          model: model.key,
          baseUrl: preferences.ollamaBaseUrl,
          topK,
          numPredict: maxTokens,
          topP,
          maxRetries: 2,
          temperature,
        });

      default:
        console.error("❌ Invalid model base:", model.baseModel);
        throw new Error(`Invalid model base: ${model.baseModel}`);
    }
  };

  /**
   * Hard-coded list of known models.
   * You can add your own pricing, tokens, plugin references, etc.
   */
  const staticModels: TModel[] = [
    {
      name: "GPT 4o",
      key: "gpt-4o",
      tokens: 128000,
      isNew: false,
      inputPrice: 5,
      outputPrice: 15,
      plugins: ["web_search", "image_generation", "memory"],
      icon: (size) => <ModelIcon size={size} type="gpt4" />,
      baseModel: "openai",
      maxOutputTokens: 2048,
    },
    {
      name: "o3",
      key: "o3",
      tokens: 128000,
      isNew: true,
      inputPrice: 5,
      outputPrice: 15,
      plugins: ["web_search", "image_generation", "memory"],
      icon: (size) => <ModelIcon size={size} type="gpt4" />,
      baseModel: "openai",
      maxOutputTokens: 2048,
    },
    {
      name: "o3-mini",
      key: "o3-mini",
      tokens: 128000,
      isNew: false,
      inputPrice: 5,
      outputPrice: 15,
      plugins: ["web_search", "image_generation", "memory"],
      icon: (size) => <ModelIcon size={size} type="gpt4" />,
      baseModel: "openai",
      maxOutputTokens: 2048,
    },
    {
      name: "gpt-4o-Mini",
      key: "gpt-4o-mini",
      tokens: 128000,
      isNew: false,
      inputPrice: 5,
      outputPrice: 15,
      plugins: ["web_search", "image_generation", "memory"],
      icon: (size) => <ModelIcon size={size} type="gpt4" />,
      baseModel: "openai",
      maxOutputTokens: 2048,
    },
    {
      name: "chatgpt-4o-latest",
      key: "chatgpt-4o-latest",
      tokens: 128000,
      isNew: false,
      inputPrice: 5,
      outputPrice: 15,
      plugins: ["web_search", "image_generation", "memory"],
      icon: (size) => <ModelIcon size={size} type="gpt4" />,
      baseModel: "openai",
      maxOutputTokens: 2048,
    },
    // {
    //   name: "GPT4 Turbo",
    //   key: "gpt-4-turbo",
    //   tokens: 128000,
    //   isNew: false,
    //   plugins: ["web_search", "image_generation", "memory"],
    //   inputPrice: 10,
    //   outputPrice: 30,
    //   icon: (size) => <ModelIcon size={size} type="gpt4" />,
    //   baseModel: "openai",
    //   maxOutputTokens: 4095,
    // },
    // {
    //   name: "GPT4",
    //   key: "gpt-4",
    //   tokens: 128000,
    //   isNew: false,
    //   plugins: ["web_search", "image_generation", "memory"],
    //   inputPrice: 30,
    //   outputPrice: 60,
    //   icon: (size) => <ModelIcon size={size} type="gpt4" />,
    //   baseModel: "openai",
    //   maxOutputTokens: 4095,
    // },
    // {
    //   name: "GPT3.5 Turbo",
    //   key: "gpt-3.5-turbo",
    //   isNew: false,
    //   inputPrice: 0.5,
    //   outputPrice: 1.5,
    //   plugins: ["web_search", "image_generation", "memory"],
    //   tokens: 16385,
    //   icon: (size) => <ModelIcon size={size} type="gpt3" />,
    //   baseModel: "openai",
    //   maxOutputTokens: 4095,
    // },
    // {
    //   name: "GPT3.5 Turbo 0125",
    //   key: "gpt-3.5-turbo-0125",
    //   isNew: false,
    //   tokens: 16385,
    //   plugins: ["web_search", "image_generation", "memory"],
    //   icon: (size) => <ModelIcon size={size} type="gpt3" />,
    //   baseModel: "openai",
    //   maxOutputTokens: 4095,
    // },
    // {
    //   name: "GPT3.5 Turbo Instruct",
    //   key: "gpt-3.5-turbo-instruct",
    //   isNew: false,
    //   tokens: 4000,
    //   inputPrice: 1.5,
    //   outputPrice: 2,
    //   plugins: ["web_search"],
    //   icon: (size) => <ModelIcon size={size} type="gpt3" />,
    //   baseModel: "openai",
    //   maxOutputTokens: 4095,
    // },
    // {
    //   name: "Claude 3 Opus",
    //   key: "claude-3-opus-20240229",
    //   isNew: false,
    //   inputPrice: 15,
    //   outputPrice: 75,
    //   tokens: 200000,
    //   plugins: [],
    //   icon: (size) => <ModelIcon size={size} type="anthropic" />,
    //   baseModel: "anthropic",
    //   maxOutputTokens: 4095,
    // },
    // {
    //   name: "Claude 3 Sonnet",
    //   key: "claude-3-sonnet-20240229",
    //   isNew: false,
    //   maxOutputTokens: 4095,
    //   tokens: 200000,
    //   inputPrice: 3,
    //   outputPrice: 15,
    //   plugins: [],
    //   icon: (size) => <ModelIcon size={size} type="anthropic" />,
    //   baseModel: "anthropic",
    // },
    // {
    //   name: "Claude 3 Haiku",
    //   key: "claude-3-haiku-20240307",
    //   isNew: false,
    //   inputPrice: 0.25,
    //   outputPrice: 1.5,
    //   tokens: 200000,
    //   plugins: [],
    //   maxOutputTokens: 4095,
    //   icon: (size) => <ModelIcon size={size} type="anthropic" />,
    //   baseModel: "anthropic",
    // },
    {
      name: "Gemini Pro 1.5",
      key: "gemini-1.5-pro-latest",
      isNew: false,
      inputPrice: 3.5,
      outputPrice: 10.5,
      plugins: [],
      tokens: 200000,
      icon: (size) => <ModelIcon size={size} type="gemini" />,
      baseModel: "gemini",
      maxOutputTokens: 8190,
    },
    {
      name: "Gemini Flash 1.5",
      key: "gemini-1.5-flash-latest",
      isNew: false,
      inputPrice: 0.35,
      outputPrice: 1.05,
      plugins: [],
      tokens: 200000,
      icon: (size) => <ModelIcon size={size} type="gemini" />,
      baseModel: "gemini",
      maxOutputTokens: 8190,
    },
    {
      name: "Gemini Pro 2.5",
      key: "gemini-2.5-pro-preview-05-06",
      isNew: true,
      inputPrice: 3.5,
      outputPrice: 10.5,
      plugins: [],
      tokens: 200000,
      icon: (size) => <ModelIcon size={size} type="gemini" />,
      baseModel: "gemini",
      maxOutputTokens: 8190,
    },
    {
      name: "Gemini Pro",
      key: "gemini-pro",
      isNew: false,
      inputPrice: 0.5,
      outputPrice: 1.5,
      plugins: [],
      tokens: 200000,
      icon: (size) => <ModelIcon size={size} type="gemini" />,
      baseModel: "gemini",
      maxOutputTokens: 4095,
    },
  ];

  /**
   * Combine static model list with any dynamically fetched models (e.g., Ollama).
   */
  const allModels: TModel[] = useMemo(() => {
    const dynamicOllama =
      ollamaModelsQuery.data?.models?.map((model: any): TModel => ({
        name: model.name,
        key: model.name,
        tokens: 128000,
        inputPrice: 0,
        outputPrice: 0,
        plugins: [],
        icon: (size) => <ModelIcon size={size} type="ollama" />,
        baseModel: "ollama",
        maxOutputTokens: 2048,
      })) || [];

    return [...staticModels, ...dynamicOllama];
  }, [ollamaModelsQuery.data?.models]);

  /**
   * Return a model object by its key (e.g., 'gpt-4', 'gemini-1.5-pro-latest').
   */
  const getModelByKey = (key: TModelKey) => {
    return allModels.find((model) => model.key === key);
  };

  /**
   * Example: if you want a quick way to pick a "test" model for each base.
   */
  const getTestModelKey = (base: TBaseModel): TModelKey => {
    switch (base) {
      case "openai":
        return "gpt-4o";
      // case "anthropic":
      //   return "claude-3-haiku-20240307";
      case "gemini":
        return "gemini-pro";
      case "ollama":
        return "phi3:latest";
      default:
        return "gpt-4o"; // fallback
    }
  };

  /**
   * Build an array of "assistants" for your UI. Each is a TAssistant with a model and name.
   */
  const assistants: TAssistant[] = [
    // Turn each model into a TAssistant entry
    ...allModels.map((model): TAssistant => ({
      name: model.name,
      key: model.key,
      baseModel: model.key,
      type: "base",
      systemPrompt: preferences.systemPrompt || defaultPreferences.systemPrompt,
    })),
    // Merge any custom user-defined assistants from your database or config
    ...(assistantsProps.assistantsQuery.data || []),
  ];

  /**
   * Retrieve an assistant+model by key. If not found, returns undefined.
   */
  const getAssistantByKey = (key: string): { assistant: TAssistant; model: TModel } | undefined => {
    const assistant = assistants.find((a) => a.key === key);
    if (!assistant) return undefined;
    const model = getModelByKey(assistant.baseModel);
    if (!model) return undefined;
    return { assistant, model };
  };

  /**
   * Get the icon for a given assistant, defaulting to 'custom' if not found.
   */
  const getAssistantIcon = (assistantKey: string) => {
    const found = getAssistantByKey(assistantKey);
    if (!found) return <ModelIcon type="custom" size="sm" />;
    return found.assistant.type === "base"
      ? found.model.icon("sm")
      : <ModelIcon type="custom" size="sm" />;
  };

  /**
   * (Optional) Force-call createInstance to confirm logs appear in the console.
   * Uncomment to test if Gemini or any model is working.
   */
  /*
  useEffect(() => {
    async function testGemini() {
      const geminiModel = getModelByKey("gemini-1.5-pro-latest");
      if (geminiModel) {
        console.log("⚡ Manually calling createInstance for Gemini to test logs");
        await createInstance(geminiModel, process.env.NEXT_PUBLIC_GEMINI_API_KEY || "");
      } else {
        console.log("❌ Gemini model not found in allModels!");
      }
    }
    testGemini();
  }, []);
  */

  // Return all your exposed functionalities
  return {
    models: allModels,
    createInstance,
    getModelByKey,
    getTestModelKey,
    getAssistantIcon,
    assistants,
    getAssistantByKey,
    ...assistantsProps,
  };
};
