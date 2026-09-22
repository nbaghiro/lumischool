/**
 * The only shape an authoring model may receive. It has catalogue content and verifier output, never
 * a request, answer, record or other family data.
 */
export interface AuthoringEnvelope {
    operation: "improve-feedback";
    content: { path: string; source: string };
    problems: string[];
}

const FIELDS = new Set(["operation", "content", "problems", "path", "source"]);
const WITHHELD = new Set([
    "answer",
    "answers",
    "audio",
    "child",
    "device",
    "email",
    "event",
    "family",
    "id",
    "kid",
    "name",
    "record",
    "request",
    "session",
    "voice",
]);

/** Builds the content-only input for a feedback-rule revision. */
export function improveFeedback(
    path: string,
    source: string,
    problems: readonly string[],
): AuthoringEnvelope {
    return { operation: "improve-feedback", content: { path, source }, problems: [...problems] };
}

/** Returns an explanation for every field a model input must not carry. */
export function auditEnvelope(value: unknown): string[] {
    const problems: string[] = [];
    const walk = (part: unknown, path: string): void => {
        if (part === null || typeof part !== "object") return;
        if (Array.isArray(part)) {
            part.forEach((entry, i) => walk(entry, `${path}[${i}]`));
            return;
        }
        for (const [key, entry] of Object.entries(part)) {
            const here = path ? `${path}.${key}` : key;
            if (!FIELDS.has(key)) problems.push(`${here} is not a declared field`);
            if (WITHHELD.has(key.toLowerCase())) problems.push(`${here} is withheld`);
            walk(entry, here);
        }
    };
    walk(value, "");
    return problems;
}
