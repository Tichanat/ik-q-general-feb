import { useSettingsContext } from "@/context";
import { Input } from "../ui/input";
import { usePreferenceContext } from "@/context/preferences";
import { useSessionsContext } from "@/context/sessions";
import { TPreferences, defaultPreferences } from "@/hooks/use-preferences";
import { generateAndDownloadJson } from "@/lib/helper";
import { ChangeEvent } from "react";
import { z } from "zod";
import { Button } from "../ui/button";
import { Flex } from "../ui/flex";
import { Type } from "../ui/text";
import { PopOverConfirmProvider } from "../ui/use-confirm-popover";
import { useToast } from "../ui/use-toast";
import { SettingCard } from "./setting-card";
import { SettingsContainer } from "./settings-container";

const preferencesSchema = z.object({
  defaultAssistant: z.string(),
  systemPrompt: z.string().optional(),
  memories: z.array(z.string()).optional(),
  messageLimit: z.number().int().positive().optional(),
  temperature: z.number().optional(),
  defaultPlugins: z.array(z.string()).optional(),
  whisperSpeechToTextEnabled: z.boolean().optional(),
  maxTokens: z.number().int().positive().optional(),
  defaultWebSearchEngine: z
    .string()
    .refine((val) => ["google", "duckduckgo"].includes(val))
    .optional(),
  topP: z.number().optional(),
  topK: z.number().optional(),
  googleSearchEngineId: z.string().optional(),
  googleSearchApiKey: z.string().optional(),
  ollamaBaseUrl: z.string().optional(),
});

const sessionSchema = z.object({
  messages: z.array(
    z.object({
      id: z.string(),
      createdAt: z.string(),
    })
  ),
  title: z.string().optional(),
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});

const importSchema = z.object({
  preferences: preferencesSchema.optional(),
  sessions: sessionSchema.array().optional(),
  prompts: z.array(z.string()).optional(),
});

export const Data = () => {
  const { dismiss } = useSettingsContext();
  const { toast } = useToast();

  const {
    sessions,
    addSessionsMutation,
    clearSessionsMutation,
    createSession,
  } = useSessionsContext();

  const { preferences, updatePreferences } = usePreferenceContext();

  function handleFileSelect(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file) {
      const reader = new FileReader();
      reader.onload = async function (e) {
        const content = e.target?.result as string;

        try {
          const jsonData = JSON.parse(content);
          const parsedData = importSchema.parse(jsonData);

          if (parsedData.preferences) {
            updatePreferences(parsedData.preferences as TPreferences);
          }

          const incomingSessions = parsedData.sessions?.filter(
            (s) => !!s.messages.length
          );

          toast({
            title: "Data Imported",
            description: "The JSON file you uploaded has been imported",
            variant: "default",
          });
        } catch (e) {
          console.error(e);
          toast({
            title: "Invalid JSON",
            description: "The JSON file you uploaded is invalid",
            variant: "destructive",
          });
        }
      };
      reader.readAsText(file);
    }
  }

  return (
    <SettingsContainer title="Manage your Data">
      <Flex direction="col" gap="md" className="w-full">
        <SettingCard className="p-3">
          <Flex items="center" justify="between">
            <Type textColor="secondary">Clear all chat sessions</Type>
            <PopOverConfirmProvider
              title="Are you sure you want to clear all chat sessions? This action cannot be undone."
              confirmBtnText="Clear All"
              onConfirm={() => {
                clearSessionsMutation.mutate(undefined, {
                  onSuccess: () => {
                    toast({
                      title: "Data Cleared",
                      description: "All chat data has been cleared",
                      variant: "default",
                    });
                    createSession({
                      redirect: true,
                    });
                    dismiss();
                  },
                });
              }}
            >
              <Button variant="destructive" size="sm">
                Clear All
              </Button>
            </PopOverConfirmProvider>
          </Flex>

          <div className="my-3 h-[1px] bg-zinc-500/10 w-full" />
          <Flex items="center" justify="between">
            <Type textColor="secondary" className="w-full">
              Reset all preferences
            </Type>
            <PopOverConfirmProvider
              title="Are you sure you want to reset all preferences? This action cannot be undone."
              confirmBtnText="Reset All"
              onConfirm={() => {
                updatePreferences(defaultPreferences);
                toast({
                  title: "Reset successful",
                  description: "All preferences have been reset",
                  variant: "default",
                });
                dismiss();
              }}
            >
              <Button variant="destructive" size="sm">
                Reset All
              </Button>
            </PopOverConfirmProvider>
          </Flex>
        </SettingCard>

        <SettingCard className="p-3">
          <Flex items="center" justify="between">
            <Type textColor="secondary" className="w-full">
              Import Data
            </Type>
            <Input
              type="file"
              onChange={handleFileSelect}
              hidden
              className="invisible"
              id="import-config"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                document?.getElementById("import-config")?.click();
              }}
            >
              Import
            </Button>
          </Flex>

          <div className="my-3 h-[1px] bg-zinc-500/10 w-full" />
          <Flex items="center" justify="between" className="w-full">
            <Type textColor="secondary">Export Data</Type>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                generateAndDownloadJson(
                  {
                    sessions: sessions,
                    preferences: preferences,
                  },
                  "chats.so.json"
                );
              }}
            >
              Export
            </Button>
          </Flex>
        </SettingCard>
      </Flex>
    </SettingsContainer>
  );
};