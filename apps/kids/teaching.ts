// What a grown-up set for a child's teaching, read off the kid's settings without trusting their
// shape: when the companion may open a question's hints.

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
