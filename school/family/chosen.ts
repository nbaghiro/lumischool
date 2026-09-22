// The worlds a family chose for a child's terms, read from the log as they stood when each term's
// first work happened, so a change never moves a mark the child's work has made (.docs/story.md,
// "The refusals, kept").

import type { Envelope, WorldTweak } from "../../engine/answer";
import { dayIn } from "../record/record";
import { yearOf, type YearLesson } from "../year";

/** A child's worlds as their family chose them, read against the work done in each term. */
export interface ChosenWorlds {
    /**
     * By grade, the world of each term: as the choice stood when the term's first work happened, or
     * as it stands for a term with none. Null is the term's own world, and a grade no choice names is
     * left out.
     */
    terms: Record<string, (string | null)[]>;
    /** Each world's tweaks, as the latest choice has them. */
    tweaks: Record<string, WorldTweak>;
    /** Each term with work in it, as `grade.term`, and the day its first work happened. */
    begun: Record<string, string>;
    /**
     * Each term with work in it, as `grade.term`, and the tweaks of the choice that stood when its
     * first work happened, in the order those first works happened.
     */
    kept: { term: string; tweaks: Record<string, WorldTweak> }[];
}

type WorldChosen = Extract<Envelope, { kind: "world-chosen" }>;

const isChoice = (e: Envelope): e is WorldChosen => e.kind === "world-chosen";

/**
 * Each lesson's term as `grade.term`: a year's units three to a term in their order, and a lesson off
 * the maths path in the unit of the lesson it hangs off. In step with `termOf` in
 * school/worlds/roll.ts, which says which world a lesson's marks are drawn in.
 */
function termsOf(lessons: readonly YearLesson[]): Map<string, string> {
    const out = new Map<string, string>();
    for (const grade of new Set(lessons.map((l) => l.grade))) {
        const year = yearOf(lessons, grade, "", "");
        const units = year.units.map((u) => u.n);
        for (const l of year.lessons)
            out.set(l.id, `${grade}.${Math.floor(Math.max(0, units.indexOf(l.unit)) / 3) + 1}`);
    }
    return out;
}

/**
 * The worlds a child's terms are in, from their log. A term with work in it reads the latest choice
 * written at or before its first sitting began, since a mark comes only from a sitting and is drawn
 * in the world the work was done in; a term with none reads the latest choice. So a choice written
 * afterwards, from a device that had not yet seen the work, leaves that term as it was.
 */
export function chosenWorlds(
    events: readonly Envelope[],
    kid: string,
    lessons: readonly YearLesson[],
    timeZone: string,
): ChosenWorlds {
    const termOf = termsOf(lessons);
    const first = new Map<string, string>();
    for (const e of events) {
        if (e.kid_id !== kid || e.kind !== "sitting-began") continue;
        const term = termOf.get(e.data.lesson);
        const had = term === undefined ? undefined : first.get(term);
        if (term !== undefined && (had === undefined || e.at < had)) first.set(term, e.at);
    }
    const choices = events
        .filter(isChoice)
        .filter((e) => e.kid_id === kid)
        .sort(
            (a, b) => a.at.localeCompare(b.at) || a.device.localeCompare(b.device) || a.seq - b.seq,
        );
    const standing = (began: string | undefined): WorldChosen | undefined =>
        began === undefined ? choices.at(-1) : choices.filter((c) => c.at <= began).at(-1);

    const terms: Record<string, (string | null)[]> = {};
    for (const grade of new Set(choices.flatMap((c) => Object.keys(c.data.terms)))) {
        const count = Math.max(...choices.map((c) => c.data.terms[grade]?.length ?? 0));
        const list = Array.from(
            { length: count },
            (_, i) => standing(first.get(`${grade}.${i + 1}`))?.data.terms[grade]?.[i] ?? null,
        );
        if (list.some((w) => w !== null)) terms[grade] = list;
    }
    const worked = [...first].sort(([, a], [, b]) => a.localeCompare(b));
    return {
        terms,
        tweaks: choices.at(-1)?.data.tweaks ?? {},
        begun: Object.fromEntries(worked.map(([term, at]) => [term, dayIn(at, timeZone)])),
        kept: worked.map(([term, at]) => ({ term, tweaks: standing(at)?.data.tweaks ?? {} })),
    };
}

/**
 * The worlds as school/worlds/choice.ts reads a saved choice back (`readChoice`), with each term the
 * choice leaves to its own world given it from `own`, a grade's worlds before anything is changed.
 *
 * A world's tweaks are read as they stood too, since a tweak can take away a landmark the work lit:
 * a world standing in a term with work in it keeps the tweaks of the choice that stood at the first
 * work there, and one standing only in terms with none takes the latest. A world standing in no term
 * of `grades`, such as a place a track brings a child to, keeps the tweaks that stood at the child's
 * first work of all, the earliest its own work could have begun.
 */
export function savedChoice(
    w: ChosenWorlds,
    own: (grade: number) => readonly string[],
    grades: readonly number[],
): { terms: Record<string, string[]>; tweaks: Record<string, WorldTweak> } {
    const terms: Record<string, string[]> = {};
    for (const [grade, list] of Object.entries(w.terms))
        terms[grade] = own(Number(grade)).map((world, i) => list[i] ?? world);
    const yearIn = (grade: number): readonly string[] => terms[String(grade)] ?? own(grade);
    const worked = w.kept.map((k) => {
        const [grade = 0, n = 0] = k.term.split(".").map(Number);
        return { ...k, world: yearIn(grade)[n - 1] };
    });
    const inTerms = new Set(
        [...grades, ...Object.keys(terms).map(Number)].flatMap((g) => yearIn(g)),
    );
    const tweaks: Record<string, WorldTweak> = {};
    const named = new Set([
        ...Object.keys(w.tweaks),
        ...w.kept.flatMap((k) => Object.keys(k.tweaks)),
    ]);
    for (const world of named) {
        const since =
            worked.find((x) => x.world === world) ?? (inTerms.has(world) ? undefined : worked[0]);
        const t = since ? since.tweaks[world] : w.tweaks[world];
        if (t) tweaks[world] = t;
    }
    return { terms, tweaks };
}
