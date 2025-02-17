import { NextResponse, type NextRequest } from "next/server";
import OpenAI, { toFile } from "openai";

export async function POST(req: NextRequest, resp: NextResponse) {
  // Use API key from environment variables
  const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "Server misconfiguration: No API key set" }, { status: 500 });
  }

  const openai = new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true,
  });

  const body = await req.json();
  const audiobase64 = body.base64;

  const audioBuffer = Buffer.from(audiobase64, "base64");
  const transcription = await openai.audio.transcriptions.create({
    file: await toFile(audioBuffer, "audio.wav", {
      type: "audio/wav",
    }),
    model: "whisper-1",
  });

  return NextResponse.json({ text: transcription?.text });
}
