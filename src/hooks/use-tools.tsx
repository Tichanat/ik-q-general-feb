import { TavilySearchResults } from "@langchain/community/tools/tavily_search";

import { FC, ReactNode, RefAttributes } from "react";
import { ModelIcon } from "@/components/model-icon";
import { Browser, Calculator, Globe } from "@phosphor-icons/react";
import { TApiKeys, TPreferences, usePreferences } from "./use-preferences";
import axios from "axios";
import { usePreferenceContext } from "@/context/preferences";
import { googleSearchTool } from "@/tools/google";
import { duckduckGoTool } from "@/tools/duckduckgo";
import { dalleTool } from "@/tools/dalle";
import { useSettingsContext } from "@/context";
import {
  GlobalSearchIcon,
  HugeiconsProps,
  Image01Icon,
  BrainIcon,
} from "hugeicons-react";
import { TToolResponse } from ".";
import { memoryTool } from "@/tools/memory";

export const toolKeys = ["calculator", "web_search"];
export type TToolKey = (typeof toolKeys)[number];
export type IconSize = "sm" | "md" | "lg";

export type TToolArg = {
  updatePreferences: ReturnType<
    typeof usePreferenceContext
  >["updatePreferences"];
  preferences: TPreferences;
  apiKeys: TApiKeys;
  sendToolResponse: (response: TToolResponse) => void;
};

export type TTool = {
  key: TToolKey;
  description: string;
  renderUI?: (args: any) => ReactNode;
  name: string;
  loadingMessage?: string;
  resultMessage?: string;
  tool: (args: TToolArg) => any;
  icon: FC<Omit<HugeiconsProps, "ref"> & RefAttributes<SVGSVGElement>>;
  smallIcon: FC<Omit<HugeiconsProps, "ref"> & RefAttributes<SVGSVGElement>>;
  validate?: () => Promise<boolean>;
  validationFailedAction?: () => void;
  showInMenu?: boolean;
};

export const useTools = () => {
  const { preferences, updatePreferences, apiKeys } = usePreferenceContext();
  const { open } = useSettingsContext();
  const tools: TTool[] = [
    {
      key: "web_search",
      description: "Search on web",
      tool:
        preferences?.defaultWebSearchEngine === "google"
          ? googleSearchTool
          : duckduckGoTool,
      name: "Web Search",
      showInMenu: true,
      loadingMessage:
        preferences?.defaultWebSearchEngine === "google"
          ? "Searching on Google..."
          : "Searching on DuckDuckGo...",
      resultMessage:
        preferences?.defaultWebSearchEngine === "google"
          ? "Results from Google Search"
          : "Result from DuckDuckGo Search",
      icon: GlobalSearchIcon,
      smallIcon: GlobalSearchIcon,
      validate: async () => {
        if (
          preferences?.defaultWebSearchEngine === "google" &&
          (!preferences?.googleSearchApiKey ||
            !preferences?.googleSearchEngineId)
        ) {
          return false;
        }
        return true;
      },
      validationFailedAction: () => {
        open("web-search");
      },
    },
    {
      key: "image_generation",
      description: "Generating images",
      tool: dalleTool,
      showInMenu: true,
      name: "Image Generation",
      loadingMessage: "Generating Image",
      resultMessage: "Generated Image",
      icon: Image01Icon,
      smallIcon: Image01Icon,
      validationFailedAction: () => {
        open("web-search");
      },
      renderUI: ({ image }) => {
        return (
          <img
            src={image}
            alt=""
            className="w-[400px] h-[400px] rounded-2xl border"
          />
        );
      },
      validate: async () => {
        return true;
      },
    },
    {
      key: "memory",
      description: "AI will remeber things about you",
      tool: memoryTool,
      name: "Memory",
      showInMenu: true,
      validate: async () => {
        return true;
      },
      validationFailedAction: () => {
        open("web-search");
      },
      renderUI: ({ image }) => {
        return (
          <img
            src={image}
            alt=""
            className="w-[400px] h-[400px] rounded-2xl border"
          />
        );
      },
      loadingMessage: "Saving to the memory...",
      resultMessage: "Updated memory",
      icon: BrainIcon,
      smallIcon: BrainIcon,
    },
  ];

  const searchTool = new TavilySearchResults({
    maxResults: 5,
    apiKey: "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",
  });

  const getToolByKey = (key: TToolKey) => {
    return tools.find((tool) => tool.key.includes(key));
  };

  const getToolInfoByKey = (key: TToolKey) => {
    return tools.find((tool) => tool.key.includes(key));
  };

  return {
    tools,
    getToolByKey,
    getToolInfoByKey,
  };
};
