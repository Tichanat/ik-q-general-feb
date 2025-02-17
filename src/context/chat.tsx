"use client";

import { useToast } from "@/components/ui/use-toast";
import { TToolResponse, defaultPreferences, useTools } from "@/hooks";
import {
  TAssistant,
  TChatMessage,
  TLLMInputProps,
} from "@/hooks/use-chat-session";
import { useModelList } from "@/hooks/use-model-list";
import { removeExtraSpaces, sortMessages } from "@/lib/helper";
import { DisableEnter, ShiftEnterToLineBreak } from "@/lib/tiptap-extension";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import {
  BaseMessagePromptTemplateLike,
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { useEditor } from "@tiptap/react";
import { Document } from "@tiptap/extension-document";
import { Paragraph } from "@tiptap/extension-paragraph";
import { Text } from "@tiptap/extension-text";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Highlight } from "@tiptap/extension-highlight";
import { HardBreak } from "@tiptap/extension-hard-break";
import moment from "moment";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { v4 as uuidV4 } from "uuid";
import { AgentExecutor, createToolCallingAgent } from "langchain/agents";
import { usePreferenceContext } from "./preferences";
import { useSessionsContext } from "./sessions";
import { useSettingsContext } from "./settings";

export type TChatContext = {
  editor: ReturnType<typeof useEditor>;
  sendMessage: () => void;
  handleRunModel: (props: TLLMInputProps, clear?: () => void) => void;
  openPromptsBotCombo: boolean;
  setOpenPromptsBotCombo: (value: boolean) => void;
  contextValue: string;
  isGenerating: boolean;
  setContextValue: (value: string) => void;
  stopGeneration: () => void;
};

export const ChatContext = createContext<undefined | TChatContext>(undefined);

export const useChatContext = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return ctx;
};

export type TChatProvider = {
  children: React.ReactNode;
};

/**
 * Helper: Retrieve API key.
 * For "openai" and "gemini", we use environment variables.
 * For others, we use keys provided by the user.
 */
const getAPIKey = (
  baseModel: string,
  userApiKeys: Record<string, string | undefined>
): string => {
  switch (baseModel) {
    case "openai":
      return process.env.NEXT_PUBLIC_OPENAI_API_KEY || "";
    case "gemini":
      return process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
    case "anthropic":
    case "ollama":
      return userApiKeys[baseModel] || "";
    default:
      return "";
  }
};

export const ChatProvider = ({ children }: TChatProvider) => {
  // External context and hooks
  const {
    currentSession,
    setCurrentSession,
    refetchSessions,
    addMessageToSession,
    getSessionById,
  } = useSessionsContext();
  const { preferences, apiKeys, updatePreferences } = usePreferenceContext();
  const { toast } = useToast();
  const { open: openSettings } = useSettingsContext();
  const { createInstance, getModelByKey, getAssistantByKey } = useModelList();
  const { getToolByKey } = useTools();

  // Local state
  const [openPromptsBotCombo, setOpenPromptsBotCombo] = useState(false);
  const [contextValue, setContextValue] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentMessage, setCurrentMessage] = useState<TChatMessage>();
  const [currentTools, setCurrentTools] = useState<TToolResponse[]>([]);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const lastCommittedMessage = useRef<TChatMessage | undefined>(undefined);
  const isImageGenEnabled = preferences.defaultPlugins?.includes("image_generation");
  const updateCurrentMessage = (update: Partial<TChatMessage>) => {
    setCurrentMessage((prev) => (prev ? { ...prev, ...update } : prev));
  };

  useEffect(() => {
    if (!currentMessage) return;
    // Prevent redundant updates
    if (
      lastCommittedMessage.current &&
      JSON.stringify(lastCommittedMessage.current) === JSON.stringify(currentMessage)
    ) {
      return;
    }
    setCurrentSession?.((session) => {
      if (!session) return undefined;
      const existingMsg = session.messages.find((msg) => msg.id === currentMessage.id);
      if (existingMsg) {
        return {
          ...session,
          messages: session.messages.map((msg) =>
            msg.id === currentMessage.id ? { ...currentMessage, tools: currentTools } : msg
          ),
        };
      }
      return {
        ...session,
        messages: [...session.messages, { ...currentMessage, tools: currentTools }],
      };
    });
    if (currentMessage.stop && currentMessage.sessionId) {
      addMessageToSession(currentMessage.sessionId, {
        ...currentMessage,
        isLoading: false,
        tools: currentTools.map((t) => ({ ...t, toolLoading: false })),
      });
      setIsGenerating(false);
    }
    lastCommittedMessage.current = currentMessage;
  }, [currentMessage, currentTools, setCurrentSession, addMessageToSession]);

  const stopGeneration = () => {
    abortController?.abort();
  };

  const preparePrompt = async ({
    context,
    image,
    history,
    assistant,
  }: {
    context?: string;
    image?: string;
    history: TChatMessage[];
    assistant: TAssistant;
  }) => {
    const hasHistory = history.length > 0;
    const baseSystemPrompt = assistant.systemPrompt;
    const memoryList = preferences.memories.join("\n");
    // If the input or context suggests image generation, add extra instructions.
    const lowerContext = context ? context.toLowerCase() : "";
    const extraInstruction =
      lowerContext.includes("generate image") || lowerContext.includes("create image")
        ? "\nIf the request asks for an image, use the image_generation tool and return its output."
        : "";
    const system: BaseMessagePromptTemplateLike = [
      "system",
      `${baseSystemPrompt}\nThings to remember:\n${memoryList}\n${
        hasHistory ? "You can also refer to previous conversations." : ""
      }${extraInstruction}`,
    ];
    const messageHolders = new MessagesPlaceholder("chat_history");
    const userContent = `{input}\n\n${
      context ? `Answer user's question based on this context: """{context}"""` : ""
    }`;
    return ChatPromptTemplate.fromMessages([
      system,
      messageHolders,
      ["user", image ? [{ type: "text", content: userContent }, { type: "image_url", image_url: image }] : userContent],
      ["placeholder", "{agent_scratchpad}"],
    ]);
  };

  const runModel = async (props: TLLMInputProps) => {
    setIsGenerating(true);
    setCurrentMessage(undefined);
    setCurrentTools([]);

    const { sessionId, messageId, input, context, image, assistant } = props;
    if (!input) return;

    const newAbortController = new AbortController();
    setAbortController(newAbortController);

    const sessionData = await getSessionById(sessionId);
    const history = sessionData?.messages?.filter((m) => m.id !== messageId) || [];
    const sortedHistory = sortMessages(history, "createdAt");

    const newMsgId = messageId || uuidV4();
    setCurrentMessage({
      inputProps: props,
      id: newMsgId,
      sessionId,
      rawHuman: input,
      createdAt: moment().toISOString(),
      isLoading: true,
    });

    const modelEntry = getModelByKey(assistant.baseModel);
    if (!modelEntry) {
      toast({ title: "Error", description: "Model not found", variant: "destructive" });
      return;
    }

    const theApiKey = getAPIKey(modelEntry.baseModel, apiKeys);
    if (!theApiKey) {
      updateCurrentMessage({ isLoading: false, stop: true, stopReason: "apikey" });
      return;
    }

    const prompt = await preparePrompt({ context, image, history, assistant });

    // Determine available tools based on model's plugins and forced-add by keywords.
    const plugins = preferences.defaultPlugins || [];
    let availableTools =
      modelEntry.plugins
        ?.filter((p) => plugins.includes(p))
        ?.map((pluginKey) =>
          getToolByKey(pluginKey)?.tool({
            updatePreferences, // REQUIRED!
            preferences,
            apiKeys,
            sendToolResponse: (toolResponse: TToolResponse) => {
              setCurrentTools((prev) =>
                prev.map((t) =>
                  t.toolName === toolResponse.toolName
                    ? { ...toolResponse, toolLoading: false }
                    : t
                )
              );
            },
          })
        )
        ?.filter(Boolean) || [];

    // Force-add image generation tool if input implies it.
    const lowerInput = input.toLowerCase();
    if (image || lowerInput.includes("generate image") || lowerInput.includes("create image")) {
      const imageTool = getToolByKey("image_generation")?.tool({
        updatePreferences, // REQUIRED!
        preferences,
        apiKeys,
        sendToolResponse: (toolResponse: TToolResponse) => {
          setCurrentTools((prev) =>
            prev.map((t) =>
              t.toolName === toolResponse.toolName
                ? { ...toolResponse, toolLoading: false }
                : t
            )
          );
        },
      });
      if (imageTool && !availableTools.some((t) => t.name === "Image Generation")) {
        availableTools.push(imageTool);
      }
    }
    // (You can add forced web_search similarly if needed.)

    // console.log("Available Tools =>", availableTools);

    const modelInstance = await createInstance(modelEntry, theApiKey);

    const messageLimit = preferences.messageLimit || defaultPreferences.messageLimit;
    const truncatedHistory = sortedHistory.slice(0, messageLimit).reduce(
      (acc: (HumanMessage | AIMessage)[], msg) => {
        if (msg.rawAI && msg.rawHuman) {
          return [...acc, new HumanMessage(msg.rawHuman), new AIMessage(msg.rawAI)];
        }
        return acc;
      },
      []
    );

    let agentExecutor: AgentExecutor | undefined;
    // Clone the model to override bindTools.
    const clonedModel = Object.create(Object.getPrototypeOf(modelInstance));
    Object.assign(clonedModel, modelInstance);
    clonedModel.bindTools = (tools: any[], options: any) => {
      return modelInstance.bindTools?.(tools, { ...options, signal: newAbortController.signal });
    };

    if (availableTools.length > 0) {
      const agentWithTool = await createToolCallingAgent({
        llm: clonedModel,
        tools: availableTools,
        prompt,
        streamRunnable: true,
      });
      // console.log("Agent with tool =>", agentWithTool);
      agentExecutor = new AgentExecutor({
        agent: agentWithTool,
        tools: availableTools,
      });
    }

    const chainWithoutTools = prompt.pipe(
      modelInstance.bind({ signal: newAbortController.signal }) as any
    );

    const executorInstance = availableTools.length > 0 && agentExecutor ? agentExecutor : chainWithoutTools;

    let finalMessage = "";
    try {
      const stream: any = await executorInstance.invoke(
        {
          chat_history: truncatedHistory,
          context,
          input,
        },
        {
          callbacks: [
            {
              handleLLMNewToken: async (token: string) => {
                finalMessage += token;
                updateCurrentMessage({
                  isLoading: true,
                  rawAI: finalMessage,
                  stop: false,
                  stopReason: undefined,
                });
              },
              handleToolEnd(output, runId, parentRunId, tags) {
                  // console.log("🛠️ Tool Execution Completed. Output:", output);
                  if (output && typeof output === "string" && output.includes("http")) {
                      // console.log("🖼️ Image URL Detected:", output);
                  } else {
                      console.log("⚠️ No Image URL Found in Output");
                  }
              },
              handleLLMError: async (err: Error) => {
                console.error("handleLLMError =>", err);
                if (!newAbortController.signal.aborted) {
                  toast({
                    title: "Error",
                    description: "Something went wrong",
                    variant: "destructive",
                  });
                }
                
                updateCurrentMessage({
                  isLoading: false,
                  rawHuman: input,
                  rawAI: finalMessage,
                  stop: true,
                  stopReason: newAbortController.signal.aborted ? "cancel" : "error",
                });
              },
            },
          ],
        }
      );
      updateCurrentMessage({
        rawHuman: input,
        rawAI: stream?.content || stream?.output || finalMessage,
        isLoading: false,
        stop: true,
        stopReason: "finish",
      });
    } catch (err) {
      console.error("runModel =>", err);
      updateCurrentMessage({
        isLoading: false,
        stop: true,
        stopReason: "error",
      });
    }
  };

  const handleRunModel = async (props: TLLMInputProps, clear?: () => void) => {
    if (!props?.input) return;
    const assistantProps = getAssistantByKey(props.assistant.key);
    if (!assistantProps) return;
    const usedApiKey = getAPIKey(assistantProps.model.baseModel, apiKeys);
    if (!usedApiKey && assistantProps.model.baseModel !== "ollama") {
      toast({
        title: "API Key Missing",
        description: `${assistantProps.model.baseModel} API key is missing. Check .env or settings`,
        variant: "destructive",
      });
      if (assistantProps.model.baseModel === "anthropic" || assistantProps.model.baseModel === "ollama") {
        openSettings(assistantProps.model.baseModel);
      }
      return;
    }
    setContextValue("");
    clear?.();
    await runModel({
      sessionId: props.sessionId?.toString(),
      input: removeExtraSpaces(props.input),
      context: removeExtraSpaces(props.context),
      image: props.image,
      assistant: assistantProps.assistant,
      messageId: props.messageId,
    });
    refetchSessions?.();
  };

  const editor = useEditor({
    extensions: [
      Document,
      Paragraph,
      Text,
      Placeholder.configure({ placeholder: "Type / or ask anything..." }),
      ShiftEnterToLineBreak,
      Highlight.configure({ HTMLAttributes: { class: "prompt-highlight" } }),
      HardBreak,
      DisableEnter,
    ],
    content: "",
    autofocus: true,
    parseOptions: { preserveWhitespace: "full" },
    onTransaction({ editor }) {
      const text = editor.getText();
      const html = editor.getHTML();
      if (text === "/") {
        setOpenPromptsBotCombo(true);
      } else {
        const newHTML = html.replace(/{{{{(.*?)}}}}/g, ` <mark class="prompt-highlight">$1</mark> `);
        if (newHTML !== html) {
          editor.commands.setContent(newHTML, true, { preserveWhitespace: true });
        }
        setOpenPromptsBotCombo(false);
      }
    },
  });

  const sendMessage = async () => {
    if (!editor || !currentSession?.id) return;
    const assistantProps = getAssistantByKey(preferences.defaultAssistant);
    if (!assistantProps) return;
    await handleRunModel(
      {
        input: editor.getText(),
        context: contextValue,
        sessionId: currentSession.id.toString(),
        assistant: assistantProps.assistant,
      },
      () => {
        editor.commands.clearContent();
        editor.commands.insertContent("");
        editor.commands.focus("end");
      }
    );
  };

  return (
    <ChatContext.Provider
      value={{
        editor,
        sendMessage,
        handleRunModel,
        openPromptsBotCombo,
        setOpenPromptsBotCombo,
        contextValue,
        isGenerating,
        setContextValue,
        stopGeneration,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
