import { usePreferenceContext } from "@/context";
import { OpenAISettings } from "./openai";
import { AnthropicSettings } from "./anthropic";
import { GeminiSettings } from "./gemini";
import { OllamaSettings } from "./ollama";
import { Flex } from "@/components/ui/flex";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ModelIcon, ModelIconType } from "@/components/model-icon";
import { CheckmarkCircle02Icon, AlertCircleIcon } from "hugeicons-react";
import { cn } from "@/lib/utils";

export const ModelSettings = () => {
  const { apiKeys } = usePreferenceContext();
  const modelSettingsData = [
    {
      label: "OpenAI",
      value: "openai",
      iconType: "openai",
      connected: !!process.env.NEXT_PUBLIC_OPENAI_API_KEY, // Use environment variable
      settingsComponent: OpenAISettings,
    },
    {
      label: "Anthropic",
      value: "anthropic",
      iconType: "anthropic",
      connected: !!apiKeys.anthropic, // Still allow user input
      settingsComponent: AnthropicSettings,
    },
    {
      label: "Gemini",
      value: "gemini",
      iconType: "gemini",
      connected: !!process.env.NEXT_PUBLIC_GEMINI_API_KEY, // Use environment variable
      settingsComponent: GeminiSettings,
    },
    {
      label: "Ollama",
      value: "ollama",
      iconType: "ollama",
      connected: !!apiKeys.ollama, // Still allow user input
      settingsComponent: OllamaSettings,
    },
  ];

  return (
    <Flex direction={"col"} gap={"lg"} className="p-2">
      <Accordion type="single" collapsible className="w-full">
        {modelSettingsData.map((model) => (
          <AccordionItem key={model.value} value={model.value}>
            <AccordionTrigger>
              <Flex gap={"sm"} items="center">
                <ModelIcon type={model.iconType as ModelIconType} size="sm" />
                {model.label}
              </Flex>
              <Flex className="flex-1" />
              <div
                className={cn(
                  "px-2 !rotate-0",
                  model.connected ? "text-emerald-600" : "text-zinc-500"
                )}
              >
                {model.connected ? (
                  <CheckmarkCircle02Icon
                    size={20}
                    strokeWidth={1.5}
                  />
                ) : (
                  <AlertCircleIcon
                    size={20}
                    strokeWidth={1.5}
                  />
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <model.settingsComponent />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </Flex>
  );
};
