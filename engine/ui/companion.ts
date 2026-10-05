// The companion on a lesson (.docs/companion.md): Charlie, who reads a lesson's explanation and walks
// a question's help one step at a time (.docs/hint-steps.md): its hints, its worked example and at
// last the way to its answer, each read aloud. What she says comes from the server; this page sends
// only where the child is. The sheets register what they can do (`Desk`), the dock
// (companion-dock.tsx) draws her, and both read the signals here.

import { createSignal } from "solid-js";
import type { Level } from "../pack";
import { hosted } from "./native";
import { obj, str, type Answer } from "./wire";
import { voice } from "./voice";

/**
 * An app's way to the server, handed in by the app that draws the dock, so a page that only reads
 * sheets (the site) carries none of it. The child's app reaches its own routes; a grown-up's, the family's.
 */
export interface Reach {
    on(owner: string): Promise<Answer>;
    /** A step's words, which the server builds from the pack, and the key of its voice. */
    step(owner: string, body: unknown): Promise<Answer>;
    /** A step's voice, as audio, or null where it could not be had. */
    voice(owner: string, key: string): Promise<Blob | null>;
}

/** Where the child is on a question: which one, and how far up its help they have climbed. */
export interface Where {
    lesson: string;
    level: Level;
    n: number | null;
    variant: string | null;
    hints: number;
    tries: number;
    said: string | null;
    worked: boolean;
    told: boolean;
}

/**
 * What a sheet lets the companion do on a question: say where it is, open its next hint, ring a part
 * of its picture, draw its worked example and record the walk to its answer, each recorded as a
 * press would be. A lesson with no question to do now has a desk that only says where it is.
 */
export interface Desk {
    where(): Where;
    /** The hint opened, or null when there is none to open, or the grown-up's setting holds it back. */
    hint(): string | null;
    /** How many hints the question has. */
    hints(): number;
    /** Whether it has a worked example to draw. */
    hasWorked(): boolean;
    /** The part it turns on, which a step rings, or null. */
    point(): string | null;
    ring(part: string): boolean;
    /** What the worked example shows, in words, or null for none. */
    worked(): string | null;
    /** The walk through to the answer, recorded as given. */
    told(): void;
}

/** What a step shows: its words, read aloud from `voice` once made, a reply line, and what Help does next. */
export interface Step {
    words: string;
    voice: string | null;
    note: string | null;
    next: Rung;
}

/** What Help does next on a question: a hint, the worked example, the walk to the answer, or nothing. */
export type Rung = "hint" | "worked" | "answer" | "done";

/** The ladder a question's help climbs: its hints in order, its worked example, the way to its answer. */
export const rungOf = (o: {
    opened: number;
    total: number;
    worked: boolean;
    hasWorked: boolean;
    told: boolean;
}): Rung =>
    o.opened < o.total ? "hint" : !o.worked && o.hasWorked ? "worked" : !o.told ? "answer" : "done";

export type Phase = { at: "off" } | { at: "step"; step: Step };

/** How long a ring the companion drew stays on the picture, in ms. */
export const RING_FOR = 12_000;

let reach: Reach | null = null;
const [owner, setOwner] = createSignal<string | null>(null);
const [phase, setPhase] = createSignal<Phase>({ at: "off" });
export { phase };

/** Whether a sheet offers the companion: a page whose family's server answers for it. */
export const offered = (): boolean => owner() !== null;

/** Who the companion is for once the server answers: a child's id, or "" for a grown-up. */
export async function offer(who: string, by: Reach): Promise<void> {
    // the companion is off in the mobile app (.docs/mobile.md)
    if (hosted()) return;
    reach = by;
    const on = await by.on(who);
    setOwner(on.ok && obj(on.body) && on.body.on === true ? who : null);
}

/**
 * Where the dock is drawn: the open dialog the asking button was in, since a modal dialog leaves
 * everything outside it untouchable, or null for the page. The dock goes when that dialog closes.
 */
const [host, setHost] = createSignal<Element | null>(null);
/** The button a step was asked from, which the dock first opens beside. */
const [anchor, setAnchor] = createSignal<Element | null>(null);
export { anchor, host };

/** The child left their page: nothing offers the companion until the next child's page does. */
export function withdraw(): void {
    close();
    setOwner(null);
}

let topic: Desk | null = null;

let leaveWith: (() => void) | null = null;
function hostAt(from: Element | undefined): void {
    leaveWith?.();
    leaveWith = null;
    setAnchor(from ?? null);
    const dialog = from?.closest("dialog[open]") ?? null;
    setHost(dialog);
    if (!dialog) return;
    const shut = (): void => close();
    dialog.addEventListener("close", shut);
    leaveWith = () => dialog.removeEventListener("close", shut);
}

/**
 * The child tapped Explain this lesson or Help with this one. Explain reads the lesson's explanation;
 * Help climbs the question's ladder, one rung a tap.
 */
export function ask(tap: "explain" | "help", desk: Desk, from?: Element): void {
    if (owner() === null) return;
    voice().stop();
    if (topic !== desk || phase().at === "off") hostAt(from);
    topic = desk;
    if (tap === "help") {
        void climb(desk);
        return;
    }
    const where = desk.where();
    void say(desk, { kind: "explain", ...where }, "done");
}

/** Next on a step, the same as Help again: the question's next rung. */
export function next(): void {
    if (topic) void climb(topic);
}

/** One rung of a question's help: the next hint and its part ringed, the worked example, the answer. */
async function climb(desk: Desk): Promise<void> {
    const where = desk.where();
    const ladder = (w: Where): Rung =>
        rungOf({
            opened: w.hints,
            total: desk.hints(),
            worked: w.worked,
            hasWorked: desk.hasWorked(),
            told: w.told,
        });
    const rung = ladder(where);
    if (rung === "hint") {
        const hint = desk.hint();
        if (hint === null) {
            void say(desk, { kind: "line", line: "step-first" }, "hint");
            return;
        }
        const part = desk.point();
        if (part) desk.ring(part);
        void say(
            desk,
            { kind: "hint", ...where, rung: where.hints },
            ladder({ ...where, hints: where.hints + 1 }),
            hint,
        );
        return;
    }
    if (rung === "worked") {
        desk.worked();
        void say(desk, { kind: "line", line: "step-worked" }, ladder({ ...where, worked: true }));
        return;
    }
    if (rung === "answer") {
        desk.told();
        void say(desk, { kind: "answer", ...where }, "done");
        return;
    }
    void say(desk, { kind: "line", line: "step-done" }, "done");
}

/** A step said: its words at once where the page has them, its voice once the server has made it. */
async function say(desk: Desk, body: Record<string, unknown>, following: Rung, known?: string) {
    const kid = owner();
    const by = reach;
    if (kid === null || !by) return;
    const shown: Step = { words: known ?? "", voice: null, note: null, next: following };
    if (known) setPhase({ at: "step", step: shown });
    const got = await by.step(kid, body);
    if (topic !== desk) return;
    const words = got.ok && obj(got.body) && str(got.body.words) ? got.body.words : known;
    if (!words) return;
    const now = phase();
    // a tap that came since has its own step
    if (now.at === "step" && known !== undefined && now.step.words !== known) return;
    setPhase({ at: "step", step: { ...shown, words } });
    const key = got.ok && obj(got.body) && str(got.body.voice) ? got.body.voice : null;
    const audio = key ? await by.voice(kid, key) : null;
    const then = phase();
    if (!audio || then.at !== "step" || then.step.words !== words) return;
    forget();
    spoken = URL.createObjectURL(audio);
    setPhase({ at: "step", step: { ...then.step, voice: spoken } });
}

/** The voice of the step showing, as a blob's address, let go when the step changes. */
let spoken: string | null = null;
const forget = (): void => {
    if (spoken) URL.revokeObjectURL(spoken);
    spoken = null;
};

/** The child checked an answer: on a step of that question, a wrong try's reply shows under it. */
export function checked(desk: Desk, right: boolean, said: string): void {
    const now = phase();
    if (now.at === "step" && topic === desk)
        setPhase({ at: "step", step: { ...now.step, note: right ? null : said } });
}

/** The sheet moved on to another question: a step left open there stays on the question it was for. */
export function follow(desk: Desk): void {
    if (phase().at === "off" && topic && topic.where().lesson === desk.where().lesson) topic = desk;
}

/** Closes the dock. */
export function close(): void {
    forget();
    setPhase({ at: "off" });
}
