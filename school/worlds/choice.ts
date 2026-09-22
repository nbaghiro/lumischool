// What a grown-up may change about a child's worlds, what they may not, and how a saved choice is
// read back.
//
// A choice is a small overlay on the worlds: which world each term is in, and per world a handful of
// picks from what that world offers. It is read tolerantly, because it outlives the worlds it names.
// A world can be retired, a drawing renamed, a guide dropped, and a family's saved choice must still
// open to a journal rather than to a blank ground, so anything that no longer resolves falls back to
// the world's own choice and says so in a sentence the parent sees.
import { at, type Weather } from "../../engine/space";
import { MARKERS, type Marker } from "../../engine/paper";
import { problems, WEATHER } from "./check";
import type { Applied, Tweak, World, WorldChoice } from "./types";
import { isWorld, mayStand, worldById, yearOf } from "./worlds";

/** What a grown-up may change, in the words the panel uses. */
export const MAY: string[] = [
    "Which world each term is in, and so the order the child travels through them.",
    "For some terms, a world made to be chosen instead of the term's own: the winter fair for the winter term of the first three years, and the farm for the first term of year one or the last of year two.",
    "The guide who lives in each world, from the ones that world offers.",
    "The colour of the ground, from the markers that world offers.",
    "The weather.",
    "What stands beside the path, and who lives there.",
    "Whether the creatures move.",
    "The name written on the journal, which is the child's display name and nothing new.",
];

/** What stays the same whatever is set. The panel shows this list beside the choices. */
export const MAY_NOT: string[] = [
    "The paper. Every question is on white squared paper in full colour, in every world, because that is what prints.",
    "The questions, the answers and what the guide says. A world changes where the guide stands, not its words.",
    "The size of the writing and how much there is to read.",
    "The order of the lessons, which is the plan and is changed from the plan.",
    "Anything that opens, locks or rewards a lesson. A world is scenery, and nothing is earned by reaching one.",
    "Colours outside the palette, and a dark ground. The palette is tuned once, against paper.",
];

const MAX_NAME = 24;

export const defaultChoice = (child: string): WorldChoice => ({
    v: 1,
    child,
    terms: {},
    tweaks: {},
});

/** The worlds of one grade's year for this family: their own order where they changed it, the year's otherwise. */
export const termsFor = (c: WorldChoice, grade: number): string[] =>
    c.terms[String(grade)] ?? yearOf(grade);

/** Where the prototype keeps a child's choice. The real home is the household's settings; see the journal document. */
export const choiceKey = (child: string): string =>
    `lumischool.journal.worlds.${child.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "child"}.v1`;

const isWeather = (x: unknown): x is Weather => WEATHER.some((w) => w === x);
const isMarker = (x: unknown): x is Marker => MARKERS.some((m) => m === x);
const isPlain = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null && !Array.isArray(v);
const strings = (x: unknown): string[] | undefined =>
    Array.isArray(x) && x.every((s) => typeof s === "string") ? x : undefined;

/**
 * A saved choice, read without trusting it. Whatever does not resolve is dropped with a sentence,
 * and what is left is always a choice the journal can draw.
 */
export function readChoice(raw: unknown, child: string): { choice: WorldChoice; notes: string[] } {
    const notes: string[] = [];
    const out = defaultChoice(child);
    if (!isPlain(raw)) return { choice: out, notes };
    const r = raw;
    if (typeof r.child === "string" && r.child.trim())
        out.child = r.child.trim().slice(0, MAX_NAME);
    // the first shape kept one list of terms for the child's year; it is read as grade one's
    const years: Record<string, unknown> = Array.isArray(r.terms)
        ? { 1: r.terms }
        : isPlain(r.terms)
          ? r.terms
          : {};
    for (const [grade, list] of Object.entries(years)) {
        const terms = strings(list);
        const g = Number(grade);
        if (!terms || !Number.isInteger(g) || g < 1 || g > 12) continue;
        const own = yearOf(g);
        out.terms[String(g)] = own.map((d, i) => {
            const t = terms[i];
            if (t === undefined) return d;
            if (mayStand(t, g, i + 1)) return t;
            notes.push(
                isWorld(t)
                    ? `Term ${i + 1} of grade ${g} was in ${worldById(t).name.toLowerCase()}, which is not a world that term can be in, so it is back in ${worldById(d).name.toLowerCase()}.`
                    : `Term ${i + 1} of grade ${g} was in "${t}", which is not a world any more, so it is back in ${worldById(d).name.toLowerCase()}.`,
            );
            return d;
        });
    }
    if (isPlain(r.tweaks)) {
        for (const [id, x] of Object.entries(r.tweaks)) {
            if (!isWorld(id)) {
                notes.push(`There were changes saved for "${id}", which is not a world any more.`);
                continue;
            }
            if (!isPlain(x)) continue;
            const tw: Tweak = {};
            if (typeof x.guide === "string") tw.guide = x.guide;
            if (isMarker(x.ground)) tw.ground = x.ground;
            if (isWeather(x.weather)) tw.weather = x.weather;
            const lm = strings(x.landmarks),
                cr = strings(x.creatures);
            if (lm) tw.landmarks = lm;
            if (cr) tw.creatures = cr;
            if (typeof x.motion === "boolean") tw.motion = x.motion;
            out.tweaks[id] = tw;
        }
    }
    return { choice: out, notes };
}

/**
 * A world with a family's changes applied. A pick the world does not offer is dropped rather than
 * drawn, and the result is checked with the same rules as the world itself, so a changed world can
 * never be less legible than the rules allow. `reduced` is the browser's reduced-motion preference,
 * which wins over the family's setting.
 */
export function apply(
    w: World,
    t: Tweak | undefined,
    reduced: boolean,
): { world: Applied; notes: string[] } {
    const notes: string[] = [];
    const keep = <T>(what: string, picked: T[] | undefined, offered: T[], fallback: T[]): T[] => {
        if (!picked) return fallback;
        const ok = picked.filter((p) => offered.includes(p));
        for (const p of picked)
            if (!offered.includes(p))
                notes.push(
                    `${String(p)} is not in ${w.name.toLowerCase()}, so it was left out of the ${what}.`,
                );
        return ok;
    };
    const guide = t?.guide && w.offers.guides.includes(t.guide) ? t.guide : w.guide;
    if (t?.guide && guide !== t.guide)
        notes.push(
            `The ${t.guide} guide does not live in ${w.name.toLowerCase()}, so the ${w.guide} does.`,
        );
    const ground = t?.ground && w.offers.grounds.includes(t.ground) ? t.ground : w.light.ground;
    const weather = t?.weather && w.offers.weather.includes(t.weather) ? t.weather : w.weather;
    const world: Applied = {
        ...w,
        light: { ...w.light, ground },
        guide,
        weather,
        landmarks: keep("landmarks", t?.landmarks, w.offers.landmarks, w.landmarks),
        creatures: keep("creatures", t?.creatures, w.offers.creatures, w.creatures),
        motion: !reduced && (t?.motion ?? true),
    };
    const wrong = problems(world);
    if (wrong.length)
        return {
            world: { ...w, motion: !reduced },
            notes: [
                ...notes,
                ...wrong,
                "These changes would break a rule, so the world is drawn as it comes.",
            ],
        };
    return { world, notes };
}

/** A sentence about the order of worlds, when it takes away an arrival. */
export function repeats(c: WorldChoice, grade: number): string | null {
    const terms = termsFor(c, grade);
    for (let i = 1; i < terms.length; i++) {
        if (terms[i] === terms[i - 1]) {
            return `Terms ${i} and ${i + 1} are both in ${worldById(at(terms, i)).name.toLowerCase()}, so there is no arrival between them.`;
        }
    }
    return null;
}

/** Only what differs from the worlds' own choices, so a family that changed nothing stores nothing. */
export function trimmed(c: WorldChoice): WorldChoice {
    const tweaks: Record<string, Tweak> = {};
    for (const [id, t] of Object.entries(c.tweaks)) {
        const w = worldById(id),
            out: Tweak = {};
        if (t.guide && t.guide !== w.guide) out.guide = t.guide;
        if (t.ground && t.ground !== w.light.ground) out.ground = t.ground;
        if (t.weather && t.weather !== w.weather) out.weather = t.weather;
        if (t.landmarks && t.landmarks.join() !== w.landmarks.join()) out.landmarks = t.landmarks;
        if (t.creatures && t.creatures.join() !== w.creatures.join()) out.creatures = t.creatures;
        if (t.motion === false) out.motion = false;
        if (Object.keys(out).length) tweaks[id] = out;
    }
    const terms: Record<string, string[]> = {};
    for (const [g, list] of Object.entries(c.terms))
        if (list.join() !== yearOf(Number(g)).join()) terms[g] = [...list];
    return { v: 1, child: c.child, terms, tweaks };
}
