import type { AuthoringEnvelope } from "../school/assistant/envelope";

export interface GeminiConfig {
    key: string;
    model: string;
}

export type GeminiConfigResult = GeminiConfig | { problem: string };

/** Reads the server-only Gemini configuration without giving a default credential. */
export function geminiConfigFrom(
    env: Readonly<Record<string, string | undefined>>,
): GeminiConfigResult {
    const key = env.GEMINI_API_KEY || env.GOOGLE_API_KEY;
    if (!key) return { problem: "GEMINI_API_KEY is required for Gemini authoring" };
    return { key, model: env.GEMINI_AUTHOR_MODEL || env.GEMINI_MODEL || "gemini-2.5-flash" };
}

const instruction =
    "Revise only the supplied Lumischool notation. Return JSON with a single string field, source. " +
    "Do not add prose outside that JSON. The result remains untrusted and must pass the notation verifier and human review.";

const isRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null && !Array.isArray(v);

const objectOf = (value: unknown): Record<string, unknown> | null =>
    isRecord(value) ? value : null;

/** Calls Gemini for a closed authoring request. Its response cannot become content without later gates. */
export async function improveWithGemini(
    config: GeminiConfig,
    envelope: AuthoringEnvelope,
    fetcher: typeof fetch = fetch,
): Promise<{ source: string } | { problem: string }> {
    const response = await fetcher(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent`,
        {
            method: "POST",
            headers: { "content-type": "application/json", "x-goog-api-key": config.key },
            body: JSON.stringify({
                system_instruction: { parts: [{ text: instruction }] },
                contents: [{ role: "user", parts: [{ text: JSON.stringify(envelope) }] }],
                generationConfig: { responseMimeType: "application/json" },
            }),
        },
    );
    if (!response.ok) return { problem: `Gemini returned ${response.status}` };
    const body: unknown = await response.json();
    const responseBody = objectOf(body);
    const candidates =
        responseBody && Array.isArray(responseBody.candidates) ? responseBody.candidates : [];
    const candidate = objectOf(candidates[0]);
    const content = candidate ? objectOf(candidate.content) : null;
    const parts = content && Array.isArray(content.parts) ? content.parts : [];
    const text = objectOf(parts[0])?.text;
    if (typeof text !== "string") return { problem: "Gemini returned no text" };
    try {
        const proposed: unknown = JSON.parse(text);
        const source = objectOf(proposed)?.source;
        return typeof source === "string" ? { source } : { problem: "Gemini returned no source" };
    } catch {
        return { problem: "Gemini returned invalid JSON" };
    }
}
