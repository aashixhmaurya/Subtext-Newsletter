import { ApiError, GoogleGenAI } from "@google/genai";

export class EditorialError extends Error {
  constructor(message: string, public status = 500) {
    super(message);
  }
}

let client: GoogleGenAI | null = null;

const CALL_TIMEOUT = 50_000;
const RETRY_WINDOW = 55_000;

export async function askJSON<T>(opts: { system: string; prompt: string; schema: object; temperature?: number }): Promise<T> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new EditorialError("GEMINI_API_KEY isn't set on the server. Add it to .env.local and restart.", 503);
  client ??= new GoogleGenAI({ apiKey: key, apiVersion: "v1beta", httpOptions: { timeout: CALL_TIMEOUT } });

  const started = Date.now();
  const canRetry = (attempt: number) => attempt < 2 && Date.now() - started < RETRY_WINDOW;
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
        if (canRetry(attempt)) continue;
        break;
      }
      return JSON.parse(text) as T;
    } catch (err) {
      if (err instanceof SyntaxError) {
        lastProblem = err.message;
        if (canRetry(attempt)) continue;
        break;
      }
      if (err instanceof ApiError) {
        if (err.status === 429) throw new EditorialError("The model is rate-limited right now. Wait a minute and try again.", 429);
        if (err.status >= 500 && canRetry(attempt)) {
          await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
          continue;
        }
        if (err.status === 503) throw new EditorialError("Gemini is overloaded right now. Wait a few seconds and try again.", 503);
        if (err.status >= 500) throw new EditorialError("Gemini had a problem answering. Try again in a moment.", 502);
        if (/api key|permission|unauthori[sz]ed/i.test(err.message)) throw new EditorialError("The Gemini API key was rejected. Check GEMINI_API_KEY on the server.", 502);
        if (err.status === 400 || err.status === 403 || err.status === 404) throw new EditorialError("The model rejected the request. Check GEMINI_MODEL, or try with less text.", 502);
      }
      if (err instanceof Error && /abort|timed? ?out/i.test(`${err.name} ${err.message}`)) {
        throw new EditorialError("The model took too long to answer. Try again, or use fewer sources.", 504);
      }
      throw new EditorialError("Couldn't reach the model. Check the connection or the API key.", 502);
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
