import { usePreferenceContext } from "@/context/preferences";
import { SettingsContainer } from "./settings-container";
import { SettingCard } from "./setting-card";
import { Flex } from "../ui/flex";
import { Type } from "../ui/text";
import { Switch } from "../ui/switch";

export const VoiceInput = () => {
  const { updatePreferences, preferences } = usePreferenceContext();
  return (
    <SettingsContainer title="Speech-to-Text Settings">
      <SettingCard className="justify-center flex flex-col p-3">
        <Flex justify={"between"} items={"center"}>
          <Flex direction={"col"} items={"start"}>
            <Type textColor={"primary"} weight={"medium"}>
              Enable Whisper Speech-to-Text
            </Type>
            <Type size={"xs"} textColor={"tertiary"}>
              Uses OpenAI Whisper model.
            </Type>
          </Flex>
          <Switch
            checked={preferences?.whisperSpeechToTextEnabled}
            onCheckedChange={(checked) => {
              updatePreferences({
                whisperSpeechToTextEnabled: checked,
              });
            }}
          />
        </Flex>
      </SettingCard>
    </SettingsContainer>
  );
};
