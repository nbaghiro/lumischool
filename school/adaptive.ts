// A tutor that chooses the next teaching move on one question rather than the wording of a move a
// script already chose (.docs/tutoring-implementation-plan.md, the adaptive slice). The model picks
// show, ask, step back or hand back, what to ring and what to say; this module builds the ground it
// works from, computes every number itself and refuses anything it cannot check.

import { breachesOf } from "./voice";
import type { PackQuestion } from "../engine/pack";
import {
    teachingObject,
    type AdaptiveHelp,
    type MoveKind,
    type TeachingView,
    type TutorMove,
} from "../engine/teaching";

export type { AdaptiveHelp, MoveKind, TutorMove };
export { nextHelp, startHelp, validHelp } from "../engine/teaching";

/** A number the tutor may name, with what it counts, computed here and never by the model. */
export interface Quantity {
    id: string;
    what: string;
    value: number;
    /** The question's own answer, which the tutor may build towards but never ask as its own check. */
    revealing?: boolean;
}
/** What the tutor may ring: a node the scene draws, or a run of anchors inside one. */
export interface Ringable {
    ref: string;
    what: string;
    /** The anchors the loop goes round, so a row rings its beads rather than its left end. */
    spans: string[];
}
export interface AdaptiveTry {
    answer: string;
    correct: boolean;
    /** The authored line the checker gave for this answer, where a rule knew it. */
    told: string | null;
}
export interface AdaptiveContext {
    lessonId: string;
    questionN: number;
    variant: string;
    ask: string;
    /** The right answer, from the compiled question, which the model is never asked to produce. */
    answer: string;
    hints: readonly string[];
    quantities: readonly Quantity[];
    ringable: readonly Ringable[];
    /** What the child has done on this question, newest last. */
    tries: readonly AdaptiveTry[];
    /** The moves already made in this help, so the tutor does not repeat itself. */
    made: readonly string[];
    /** What the child answered to the tutor's own checks, which is how repeated confusion shows. */
    checks: readonly { quantityId: string; answer: number; correct: boolean }[];
}

export interface Refusal {
    reason: string;
    detail: string;
}

const SAY_WORDS = 34;
const PROMPT_WORDS = 18;

/** Every number the tutor may say: what the question holds, and the counting steps between the two wires. */
export function groundedNumbers(context: AdaptiveContext): Set<number> {
    const out = new Set<number>([5, 10]);
    for (const q of context.quantities) out.add(q.value);
    const top = context.quantities.find((q) => q.id === "top")?.value;
    const bottom = context.quantities.find((q) => q.id === "bottom")?.value;
    if (typeof top === "number" && typeof bottom === "number")
        for (let n = Math.min(top, bottom); n <= Math.max(top, bottom); n++) out.add(n);
    for (const t of context.tries) {
        const n = Number(t.answer);
        if (Number.isInteger(n)) out.add(n);
    }
    return out;
}

/** Three choices for a check: the right one, and two the child could plausibly reach. */
export function choicesFor(value: number, numbers: Set<number>): number[] {
    const near = [...numbers].filter((n) => n !== value && n >= 0).sort((a, b) => a - b);
    const below = near.filter((n) => n < value).at(-1);
    const above = near.find((n) => n > value);
    const picked = [value, below, above].filter((n): n is number => typeof n === "number");
    while (picked.length < 3) {
        const extra = picked.length === 1 ? value + 1 : Math.max(0, value - 1);
        if (!picked.includes(extra)) picked.push(extra);
        else picked.push(value + picked.length);
    }
    return [...new Set(picked)].slice(0, 3).sort((a, b) => a - b);
}

const badText = (text: string, words: number): string | null => {
    const trimmed = text.trim();
    if (!trimmed) return "empty";
    if (trimmed.length > 300) return "too long";
    if (trimmed.split(/\s+/).length > words) return `over ${words} words`;
    if (/[<>]|https?:|www\./i.test(trimmed)) return "markup or a link";
    const breaches = breachesOf(trimmed, { words: true });
    if (breaches.length) return `the guide's voice: ${breaches.join(", ")}`;
    return null;
};

/**
 * A proposal the tutor may render, or why it may not. Numbers are checked against the ground, the
 * ring against what the scene draws, and a check's answer is computed here from the quantity the
 * model named, so a wrong proposal cannot mark a child.
 */
export function acceptMove(
    value: unknown,
    context: AdaptiveContext,
): { move: TutorMove } | { refused: Refusal } {
    const refused = (reason: string, detail: string): { refused: Refusal } => ({
        refused: { reason, detail },
    });
    if (!teachingObject(value)) return refused("shape", "not an object");
    const kind = String(value.kind);
    if (!["show", "ask", "step-back", "hand-back"].includes(kind))
        return refused("kind", `unknown move ${kind}`);
    const say = typeof value.say === "string" ? value.say.trim() : "";
    const sayProblem = badText(say, SAY_WORDS);
    if (sayProblem) return refused("say", sayProblem);
    const numbers = groundedNumbers(context);
    const ungrounded = (text: string): string | null =>
        (text.match(/\b\d+\b/g) ?? []).find((n) => !numbers.has(Number(n))) ?? null;
    const strayInSay = ungrounded(say);
    if (strayInSay) return refused("number", `${strayInSay} is not in this question`);
    let ring: string | null = null;
    if (value.ring !== null && value.ring !== undefined) {
        if (typeof value.ring !== "string") return refused("ring", "not a reference");
        if (!context.ringable.some((r) => r.ref === value.ring))
            return refused("ring", `${value.ring} is not drawn here`);
        ring = value.ring;
    }
    if (kind === "hand-back")
        return { move: { kind, say, ring, check: null, origin: "gemini", repaired: null } };
    if (kind === "show")
        return { move: { kind, say, ring, check: null, origin: "gemini", repaired: null } };
    const quantityId = typeof value.quantityId === "string" ? value.quantityId : "";
    const quantity = context.quantities.find((q) => q.id === quantityId);
    if (!quantity) return refused("quantity", `${quantityId || "none"} is not a quantity here`);
    if (quantity.revealing)
        return refused("quantity", `${quantity.id} is the question's own answer`);
    const prompt = typeof value.prompt === "string" ? value.prompt.trim() : "";
    const promptProblem = badText(prompt, PROMPT_WORDS);
    if (promptProblem) return refused("prompt", promptProblem);
    const strayInPrompt = ungrounded(prompt);
    if (strayInPrompt) return refused("number", `${strayInPrompt} is not in this question`);
    const proposed = Array.isArray(value.choices)
        ? value.choices.map((c) => Number(c)).filter((n) => Number.isInteger(n))
        : [];
    const ours = choicesFor(quantity.value, numbers);
    const usable =
        proposed.length >= 2 &&
        proposed.length <= 4 &&
        new Set(proposed).size === proposed.length &&
        proposed.includes(quantity.value) &&
        proposed.every((n) => numbers.has(n));
    const choices = usable ? proposed : ours;
    return {
        move: {
            kind: kind === "ask" ? "ask" : "step-back",
            say,
            ring,
            check: {
                quantityId: quantity.id,
                prompt,
                choices: [...choices].sort((a, b) => a - b),
                correct: quantity.value,
            },
            origin: "gemini",
            repaired: usable ? null : "choices came from the question rather than the proposal",
        },
    };
}

/** What the child sees when a proposal is refused or the model is away: the next authored hint. */
export function authoredMove(context: AdaptiveContext): TutorMove {
    const used = context.made.filter((m) => m.startsWith("authored:")).length;
    const hint = context.hints[Math.min(used, context.hints.length - 1)] ?? context.ask;
    return {
        kind: "show",
        say: hint,
        ring: context.ringable[0]?.ref ?? null,
        check: null,
        origin: "authored",
        repaired: null,
    };
}

/** Whether a child's answer to a tutor's own check is right, which only this module decides. */
export const checkAnswer = (move: TutorMove, answer: number): boolean =>
    move.check !== null && move.check.correct === answer;

/** What the board draws for a move: the question's own picture, with a loop round what is named. */
export function viewOfMove(
    o: { title: string; sceneId: string },
    context: AdaptiveContext,
    move: TutorMove,
    ended: boolean,
): TeachingView {
    const ring = move.ring ? (context.ringable.find((r) => r.ref === move.ring)?.spans ?? []) : [];
    return {
        title: o.title,
        place: null,
        sight: { kind: "question", sceneId: o.sceneId, ring },
        caption: ended ? "Now try the question yourself." : move.say,
        spoken: move.say,
        check:
            move.check && !ended
                ? { prompt: move.check.prompt, choices: move.check.choices.map(String) }
                : null,
        phase: null,
        origin: move.origin,
    };
}

/** A question's own value by name, as a whole number, or null where it holds none. */
export function wholeIn(q: PackQuestion, name: string): number | null {
    const value = q.env[name];
    if (value?.k !== "num") return null;
    return value.v.d === 1 && Number.isSafeInteger(value.v.n) ? value.v.n : null;
}

const nodeOf = (q: PackQuestion, type: string): string | null =>
    (q.scene?.nodes ?? []).find((n) => n.type === type)?.id ?? null;

/** Every anchor a drawing gives for a row of things, which ring the row itself rather than its end. */
const rowAnchors = (id: string, row: number, count: number): string[] =>
    Array.from({ length: count }, (_, i) => `${id}.bead(${row},${i})`);

export interface SkillGround {
    /** Whether this skill's ground can be built from the question in front of it. */
    fits(q: PackQuestion): boolean;
    quantities(q: PackQuestion): Quantity[];
    ringable(q: PackQuestion): Ringable[];
}

/** Two wires of beads compared: the rekenrek items of counting and comparing. */
const beadWires: SkillGround = {
    fits: (q) =>
        nodeOf(q, "rekenrek") !== null && wholeIn(q, "t") !== null && wholeIn(q, "b") !== null,
    quantities(q) {
        const top = wholeIn(q, "t") ?? 0;
        const bottom = wholeIn(q, "b") ?? 0;
        const asked = Object.values(q.answers)[0] ?? "";
        const quantities: Quantity[] = [
            { id: "top", what: "beads pushed across on the top wire", value: top },
            { id: "bottom", what: "beads pushed across on the bottom wire", value: bottom },
            {
                id: "top-past-five",
                what: "beads past the first five on the top wire",
                value: Math.max(0, top - 5),
            },
            {
                id: "bottom-past-five",
                what: "beads past the first five on the bottom wire",
                value: Math.max(0, bottom - 5),
            },
        ];
        // Whatever this question asks for is the tutor's destination, never its own check.
        for (const q2 of [
            { id: "difference", what: "how many more the top wire has", value: top - bottom },
            { id: "total", what: "the beads pushed across on both wires", value: top + bottom },
        ])
            quantities.push({ ...q2, revealing: String(q2.value) === asked });
        return quantities;
    },
    ringable(q) {
        const id = nodeOf(q, "rekenrek");
        if (!id) return [];
        const top = wholeIn(q, "t") ?? 0;
        const bottom = wholeIn(q, "b") ?? 0;
        return [
            { ref: `${id}`, what: "the whole bead frame", spans: [id] },
            {
                ref: `${id}.row(0)`,
                what: "the beads pushed across on the top wire",
                spans: rowAnchors(id, 0, Math.max(1, top)),
            },
            {
                ref: `${id}.row(1)`,
                what: "the beads pushed across on the bottom wire",
                spans: rowAnchors(id, 1, Math.max(1, bottom)),
            },
            {
                ref: `${id}.first-five`,
                what: "the first five beads of the top wire",
                spans: rowAnchors(id, 0, Math.min(5, Math.max(1, top))),
            },
        ];
    },
};

/** A string of beads with an arrow at one bead: the counting items that read a number line of beads. */
const beadString: SkillGround = {
    fits: (q) => nodeOf(q, "beadstring") !== null && wholeIn(q, "n") !== null,
    quantities(q) {
        const n = wholeIn(q, "n") ?? 0;
        const asked = Object.values(q.answers)[0] ?? "";
        return [
            {
                id: "arrow",
                what: "the bead the arrow points at",
                value: n,
                revealing: String(n) === asked,
            },
            { id: "past-ten", what: "beads past the first ten", value: Math.max(0, n - 10) },
            { id: "fives", what: "whole fives before that bead", value: Math.floor(n / 5) },
        ];
    },
    ringable(q) {
        const id = nodeOf(q, "beadstring");
        if (!id) return [];
        const n = wholeIn(q, "n") ?? 0;
        return [
            { ref: id, what: "the whole bead string", spans: [id] },
            { ref: `${id}.cut`, what: "the arrow under the string", spans: [`${id}.cut`] },
            {
                ref: `${id}.counted`,
                what: "the beads up to the arrow",
                spans: Array.from({ length: Math.max(1, n) }, (_, i) => `${id}.bead(${i})`),
            },
        ];
    },
};

/** Adding across ten on a ten frame: the bridging items of addition. */
const tenFrame: SkillGround = {
    fits: (q) =>
        nodeOf(q, "tenframe") !== null && wholeIn(q, "a") !== null && wholeIn(q, "b") !== null,
    quantities(q) {
        const a = wholeIn(q, "a") ?? 0;
        const b = wholeIn(q, "b") ?? 0;
        const asked = Object.values(q.answers)[0] ?? "";
        return [
            { id: "first", what: "counters already in the frame", value: a },
            { id: "joining", what: "counters joining them", value: b },
            { id: "room", what: "empty spaces left in the ten frame", value: Math.max(0, 10 - a) },
            {
                id: "past-ten",
                what: "counters left over once the frame is full",
                value: Math.max(0, a + b - 10),
            },
            {
                id: "total",
                what: "counters in all",
                value: a + b,
                revealing: String(a + b) === asked,
            },
        ];
    },
    ringable(q) {
        const id = nodeOf(q, "tenframe");
        if (!id) return [];
        const a = wholeIn(q, "a") ?? 0;
        return [
            { ref: id, what: "the whole ten frame", spans: [id] },
            {
                ref: `${id}.filled`,
                what: "the spaces already filled",
                spans: Array.from({ length: Math.max(1, a) }, (_, i) => `${id}.cell(${i})`),
            },
            {
                ref: `${id}.empty`,
                what: "the empty spaces",
                spans: Array.from(
                    { length: Math.max(1, 10 - a) },
                    (_, i) => `${id}.cell(${a + i})`,
                ),
            },
        ];
    },
};

/** Which ground a skill works from. A skill with none is taught by the guide, as it was. */
const GROUND: Record<string, SkillGround> = {
    "counting.to-twenty": beadWires,
    "subtraction.compare": beadWires,
    "addition.cross-ten": tenFrame,
};

/** The ground for a question, by the skills its item declares, or null where no skill here fits it. */
export function groundFor(skills: readonly string[], q: PackQuestion): SkillGround | null {
    for (const skill of skills) {
        const ground = GROUND[skill];
        if (ground?.fits(q)) return ground;
    }
    // A bead string stands in every counting lesson, whatever skill the item names.
    return beadString.fits(q) ? beadString : null;
}

export const GROUND_SKILLS: readonly string[] = Object.keys(GROUND);

export function adaptiveContext(o: {
    lessonId: string;
    skills: readonly string[];
    question: PackQuestion;
    tries: readonly AdaptiveTry[];
    made: readonly string[];
    checks?: readonly { quantityId: string; answer: number; correct: boolean }[];
}): AdaptiveContext | null {
    const ground = groundFor(o.skills, o.question);
    if (!ground) return null;
    const q = o.question;
    const quantities = ground.quantities(q);
    const ringable = ground.ringable(q);
    if (quantities.every((v) => v.revealing) || ringable.length === 0) return null;
    return {
        lessonId: o.lessonId,
        questionN: q.n,
        variant: q.variant,
        ask: q.ask,
        answer: Object.values(q.answers)[0] ?? "",
        hints: q.hints,
        quantities,
        ringable,
        tries: o.tries,
        made: o.made,
        checks: o.checks ?? [],
    };
}

/** Whether the tutor can teach this question, which is what the help button asks before it opens. */
export const adaptiveTeachable = (skills: readonly string[], q: PackQuestion): boolean =>
    adaptiveContext({ lessonId: "", skills, question: q, tries: [], made: [] }) !== null;
