import { ApiError, GoogleGenAI } from "@google/genai";

export class EditorialError extends Error {
  constructor(message: string, public status = 500) {
    super(message);
  }
}

let client: GoogleGenAI | null = null;

export async function askJSON<T>(opts: { system: string; prompt: string; schema: object; temperature?: number }): Promise<T> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new EditorialError("GEMINI_API_KEY isn't set on the server. Add it to .env.local and restart.", 503);
  client ??= new GoogleGenAI({ apiKey: key, apiVersion: "v1beta" });

  let lastProblem = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await client.models.generateContent({
        model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
        contents: lastProblem
          ? `${opts.prompt}\n\nYour previous reply was not valid JSON (${lastProblem}). Reply with JSON only.`
          : opts.prompt,
        config: {
          systemInstruction: opts.system,
          responseMimeType: "application/json",
          responseJsonSchema: opts.schema,
          temperature: opts.temperature ?? 0.3,
        },
      });
      const text = res.text;
      if (!text) {
        lastProblem = "empty response";
        continue;
      }
      return JSON.parse(text) as T;
    } catch (err) {
      if (err instanceof SyntaxError) {
        lastProblem = err.message;
        continue;
      }
      if (err instanceof ApiError) {
        if (err.status === 429) throw new EditorialError("The model is rate-limited right now. Wait a minute and try again.", 429);
        if ((err.status === 503 || err.status >= 500) && attempt < 2) {
          await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
          continue;
        }
        if (err.status === 503) throw new EditorialError("Gemini is overloaded right now. Wait a few seconds and try again.", 503);
        if (err.status === 400 || err.status === 403) throw new EditorialError(`The model rejected the request: ${err.message.slice(0, 200)}`, 502);
      }
      const detail = err instanceof Error ? err.message.slice(0, 180) : "";
      throw new EditorialError(detail ? `Couldn't reach the model: ${detail}` : "Couldn't reach the model. Check your connection or API key.", 502);
    }
  }
  throw new EditorialError("The model kept returning malformed output. Try again, or with fewer sources.", 502);
}

export function normalise(s: string) {
  return s
    .toLowerCase()
    .replace(/[‘’`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}
