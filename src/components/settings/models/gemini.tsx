import { Info, Warning } from "@phosphor-icons/react";
import { Button } from "../../ui/button";
import { Flex } from "@/components/ui/flex";

export const GeminiSettings = () => {
  const apiKeyExists = !!process.env.NEXT_PUBLIC_GEMINI_API_KEY;  // Check .env

  return (
    <Flex direction={"col"} gap="sm">
      <div className="flex flex-row items-end justify-between">
        <p className="text-xs md:text-sm text-zinc-500">Gemini API Key</p>
      </div>

      {/* {apiKeyExists ? (
        <p className="text-sm text-emerald-600">
          ✅ Using environment variable for API key.
        </p>
      ) : (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <Warning size={16} weight="bold" /> No API key set in environment variables!
        </p>
      )} */}

      {/* <Button
        size="sm"
        variant="secondary"
        onClick={() => {
          window.open("https://aistudio.google.com/app/apikey", "_blank");
        }}
      >
        Get your API key here
      </Button> */}

      <div className="flex flex-row items-center gap-1 py-2 text-zinc-500">
        <Info size={16} weight="bold" />
        <p className="text-xs">
          Your API Key is managed by the system and cannot be changed manually.
        </p>
      </div>
    </Flex>
  );
};
