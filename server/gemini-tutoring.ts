import {
    teachingObject,
    type TeachingMaterial,
    type TeachingState,
    type TeachingPreferences,
    type TeachingStep,
} from "../engine/teaching";
import { acceptTutorProposal, teachingCandidates } from "../school/tutoring";
import { TUTOR_INSTRUCTION, TUTOR_SCHEMA, tutoringEnvelope } from "../school/assistant/tutoring";
export interface TutorConfig {
    key: string;
    model: string;
    ttsModel: string;
    enabled: boolean;
    childEnabled: boolean;
}
export function tutorConfig(env: Readonly<Record<string, string | undefined>>): TutorConfig {
    return {
        key: env.GEMINI_API_KEY || env.GOOGLE_API_KEY || "",
        model: env.GEMINI_TUTOR_MODEL || "gemini-3.8-flash",
        ttsModel: env.GEMINI_TTS_MODEL || "gemini-3.8-flash-tts",
        enabled: env.TUTORING_ENABLED === "1",
        childEnabled: env.TUTORING_CHILD_ENABLED === "1",
    };
}
interface Interaction {
    output: unknown;
    problem: string | null;
    inputTokens: number;
    outputTokens: number;
    model: string;
}
export async function geminiInteraction(
    config: TutorConfig,
    input: unknown,
    instruction: string,
    schema: unknown,
    fetcher: typeof fetch = fetch,
    signal: AbortSignal = AbortSignal.timeout(8000),
): Promise<Interaction> {
    const fail = (problem: string): Interaction => ({
        output: null,
        problem,
        inputTokens: 0,
        outputTokens: 0,
        model: config.model,
    });
    if (!config.key) return fail("missing-key");
    if (JSON.stringify(input).length > 24576) return fail("context-too-large");
    try {
        const response = await fetcher(
            "https://generativelanguage.googleapis.com/v1beta/interactions",
            {
                method: "POST",
                signal,
                headers: { "content-type": "application/json", "x-goog-api-key": config.key },
                body: JSON.stringify({
                    model: config.model,
                    store: false,
                    input: JSON.stringify(input),
                    system_instruction: instruction,
                    response_format: { type: "text", mime_type: "application/json", schema },
                    generation_config: { max_output_tokens: 1024, thinking_level: "low" },
                }),
            },
        );
        if (!response.ok) return fail(`http-${response.status}`);
        const text = await response.text();
        if (text.length > 65536) return fail("response-too-large");
        const body: unknown = JSON.parse(text);
        if (!teachingObject(body)) return fail("invalid-response");
        if (body.status !== "completed" && body.status !== undefined)
            return fail("incomplete-response");
        const outputs: unknown[] = Array.isArray(body.outputs)
            ? body.outputs
            : Array.isArray(body.steps)
              ? body.steps
              : [];
        const texts: string[] = [];
        for (const out of outputs) {
            if (!teachingObject(out)) continue;
            if (out.type === "text" && typeof out.text === "string") texts.push(out.text);
            if (out.type === "model_output" && Array.isArray(out.content))
                for (const c of out.content) {
                    if (teachingObject(c) && c.type === "text" && typeof c.text === "string")
                        texts.push(c.text);
                }
        }
        if (!texts.length) return fail("no-text");
        const output: unknown = JSON.parse(texts.join(""));
        const usage = teachingObject(body.usage) ? body.usage : {};
        return {
            output,
            problem: null,
            inputTokens:
                typeof usage.total_input_tokens === "number" ? usage.total_input_tokens : 0,
            outputTokens:
                typeof usage.total_output_tokens === "number" ? usage.total_output_tokens : 0,
            model: typeof body.model === "string" ? body.model : config.model,
        };
    } catch {
        return fail(signal.aborted ? "timeout" : "invalid-response");
    }
}
export async function tutorStep(
    config: TutorConfig,
    material: TeachingMaterial,
    state: TeachingState,
    prefs: TeachingPreferences,
    fetcher: typeof fetch = fetch,
): Promise<Interaction & { step: TeachingStep }> {
    const deadline = AbortSignal.timeout(3500);
    const envelope = tutoringEnvelope(material, state, prefs);
    let result = await geminiInteraction(
        config,
        envelope,
        TUTOR_INSTRUCTION,
        TUTOR_SCHEMA,
        fetcher,
        deadline,
    );
    let step = acceptTutorProposal(
        result.output,
        material,
        teachingCandidates(material, state),
        prefs.delivery === "steps" ? 70 : 40,
    );
    if (
        !step &&
        !deadline.aborted &&
        (result.problem === null || result.problem === "http-503" || result.problem === "http-429")
    ) {
        const retry = await geminiInteraction(
            config,
            {
                ...envelope,
                correction: "Return only a valid allowed frame and grounded short text.",
            },
            TUTOR_INSTRUCTION,
            TUTOR_SCHEMA,
            fetcher,
            deadline,
        );
        result = {
            ...retry,
            inputTokens: result.inputTokens + retry.inputTokens,
            outputTokens: result.outputTokens + retry.outputTokens,
        };
        step = acceptTutorProposal(
            result.output,
            material,
            teachingCandidates(material, state),
            prefs.delivery === "steps" ? 70 : 40,
        );
    }
    return {
        ...result,
        step: step ?? { ...state.step, reason: result.problem ?? "proposal-rejected" },
    };
}
export async function tutorAudio(
    config: TutorConfig,
    text: string,
    guide: TeachingPreferences["guide"],
    fetcher: typeof fetch = fetch,
): Promise<Uint8Array<ArrayBuffer> | null> {
    if (!config.key || text.length > 700) return null;
    try {
        const response = await fetcher(
            `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.ttsModel)}:generateContent`,
            {
                method: "POST",
                signal: AbortSignal.timeout(8000),
                headers: { "content-type": "application/json", "x-goog-api-key": config.key },
                body: JSON.stringify({
                    contents: [{ parts: [{ text }] }],
                    generationConfig: {
                        responseModalities: ["AUDIO"],
                        speechConfig: {
                            voiceConfig: {
                                prebuiltVoiceConfig: {
                                    voiceName: guide === "snail" ? "Puck" : "Kore",
                                },
                            },
                        },
                    },
                }),
            },
        );
        if (!response.ok) return null;
        const raw = await response.text();
        if (raw.length > 4_000_000) return null;
        const body: unknown = JSON.parse(raw);
        if (!teachingObject(body) || !Array.isArray(body.candidates)) return null;
        const candidate: unknown = body.candidates[0];
        if (
            !teachingObject(candidate) ||
            !teachingObject(candidate.content) ||
            !Array.isArray(candidate.content.parts)
        )
            return null;
        for (const part of candidate.content.parts as unknown[]) {
            if (!teachingObject(part) || !teachingObject(part.inlineData)) continue;
            const data = part.inlineData;
            if (
                typeof data.data !== "string" ||
                typeof data.mimeType !== "string" ||
                !data.mimeType.startsWith("audio/L16")
            )
                continue;
            const rate = Number(/rate=(\d+)/.exec(data.mimeType)?.[1] ?? "24000");
            if (![16000, 22050, 24000, 44100, 48000].includes(rate)) return null;
            const pcm = Buffer.from(data.data, "base64");
            if (!pcm.length || pcm.length % 2 || pcm.length > rate * 2 * 45) return null;
            const wav = Buffer.alloc(44 + pcm.length);
            wav.write("RIFF", 0);
            wav.writeUInt32LE(36 + pcm.length, 4);
            wav.write("WAVEfmt ", 8);
            wav.writeUInt32LE(16, 16);
            wav.writeUInt16LE(1, 20);
            wav.writeUInt16LE(1, 22);
            wav.writeUInt32LE(rate, 24);
            wav.writeUInt32LE(rate * 2, 28);
            wav.writeUInt16LE(2, 32);
            wav.writeUInt16LE(16, 34);
            wav.write("data", 36);
            wav.writeUInt32LE(pcm.length, 40);
            pcm.copy(wav, 44);
            return Uint8Array.from(wav);
        }
    } catch {
        return null;
    }
    return null;
}
