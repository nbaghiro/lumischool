// What a grown-up set for a child's teaching, read off the kid's settings without trusting their
// shape: when hints come, and whether the world's guide helps and reads aloud (.docs/ai.md, "The
// guide"). Its own small module, since the map screen and the sheets both read it.

import type { HintPolicy } from "../../school/lessons";
import type { Kid } from "../../server/db/schema";

/** One teaching setting by its name, or undefined when the grown-up set nothing. */
function teachingOf(kid: Kid, name: string): unknown {
    const s: unknown = kid.settings;
    const teaching =
        typeof s === "object" && s !== null && "teaching" in s ? s.teaching : undefined;
    return typeof teaching === "object" && teaching !== null && name in teaching
        ? Reflect.get(teaching, name)
        : undefined;
}

/** When a hint is offered; on request when they set nothing. */
export function policyOf(kid: Kid): HintPolicy {
    return teachingOf(kid, "hints") === "after-one-try" ? "after-one-try" : "on-request";
}

/**
 * The guide's help on the child's screens, unless a grown-up turned it off, when "A hint" stands as
 * it always did; and whether it reads aloud, which a grown-up sets, and is on at grades one and two
 * until they do.
 */
export function helpOf(kid: Kid): { on: boolean; voice: boolean } {
    const read = teachingOf(kid, "readAloud");
    return {
        on: teachingOf(kid, "help") !== false,
        voice: typeof read === "boolean" ? read : kid.grade <= 2,
    };
}
