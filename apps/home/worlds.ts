// A child's worlds as the grown-ups' pages read and change them: the family's choice as the server
// folds it (school/family/chosen.ts), the terms that may be in a world made for them instead of their
// own, and the event a change writes. It reads the worlds, so a page loads it once it needs it.

import type { Draft } from "../../engine/answer";
import { savedChoice } from "../../school/family/chosen";
import type { Writing } from "../../school/family/calendar";
import { apply, readChoice, termsFor, trimmed } from "../../school/worlds/choice";
import type { Applied, WorldChoice } from "../../school/worlds/types";
import { choicesFor, DEFAULT_YEARS, worldById, yearOf } from "../../school/worlds/worlds";
import type { GrownRecord } from "../../server/api";
import type { Kid } from "../../server/db/schema";

type Read = Pick<GrownRecord, "worlds" | "years">;

/** The family's choice for a child, each term's world and each world's tweaks as they stood. */
export const choiceFor = (kid: Pick<Kid, "name">, r: Read): WorldChoice =>
    readChoice(
        savedChoice(r.worlds, yearOf, [
            ...Object.keys(DEFAULT_YEARS).map(Number),
            ...r.years.map((y) => y.grade),
        ]),
        kid.name,
    ).choice;

/**
 * A world as this family has it, with their own tweaks in it, which is what the child sees and what a
 * grown-up's page draws. Nothing in a small picture moves, so it is built still.
 */
export const worldAs = (kid: Pick<Kid, "name">, r: Read, world: string): Applied =>
    apply(worldById(world), choiceFor(kid, r).tweaks[world], true).world;

/** A term that may be in a world made for it, as Change the plan offers it. */
export interface TermToChoose {
    grade: number;
    term: number;
    /** The world the term is in now. */
    now: string;
    /** The worlds it may be in: its own first, then the ones made for it. */
    options: { id: string; name: string; own: boolean }[];
    /** The day its first work happened, from which it keeps its world; null before any. */
    since: string | null;
}

export const termKey = (t: Pick<TermToChoose, "grade" | "term">): string => `${t.grade}.${t.term}`;

/**
 * The terms of a child's own year and the years after it that a world was made for (the farm, the
 * winter fair), each with its own world and those. A year before the child's is not offered, since
 * they will not walk it.
 */
export function termsToChoose(kid: Pick<Kid, "name" | "grade">, r: Read): TermToChoose[] {
    const choice = choiceFor(kid, r);
    const out: TermToChoose[] = [];
    for (const grade of Object.keys(DEFAULT_YEARS)
        .map(Number)
        .filter((g) => g >= kid.grade)
        .sort((a, b) => a - b)) {
        const worlds = termsFor(choice, grade);
        yearOf(grade).forEach((own, i) => {
            const term = i + 1;
            const made = choicesFor(grade, term);
            if (!made.length) return;
            const now = worlds[i] ?? own;
            const ids = [...new Set([own, ...made.map((w) => w.id), now])];
            out.push({
                grade,
                term,
                now,
                options: ids.map((id) => ({ id, name: worldById(id).name, own: id === own })),
                since: r.worlds.begun[termKey({ grade, term })] ?? null,
            });
        });
    }
    return out;
}

/**
 * The terms Change the plan lists for a choice: those with a world made for them and no work in them
 * yet, in the child's own grade and the next, since a term already worked in keeps its world and a
 * year further off can be chosen when it comes.
 */
export const openChoices = (kid: Pick<Kid, "name" | "grade">, r: Read): TermToChoose[] =>
    termsToChoose(kid, r).filter((t) => t.since === null && t.grade <= kid.grade + 1);

/**
 * The event that puts each picked term, `grade.term`, in its picked world: the family's whole choice
 * again, trimmed to what differs from the worlds' own, with each world's tweaks as the latest choice
 * left them. A pick for a term with work in it is left out, since the fold would keep that term's
 * world whatever it said. Null when nothing would change.
 */
export function chooseWorlds(
    w: Writing,
    kid: Pick<Kid, "id" | "name" | "grade">,
    r: Read,
    picks: ReadonlyMap<string, string>,
): Draft | null {
    const choice = choiceFor(kid, r);
    const terms: Record<string, string[]> = { ...choice.terms };
    let changed = false;
    for (const t of termsToChoose(kid, r)) {
        const to = picks.get(termKey(t));
        if (to === undefined || to === t.now || t.since !== null) continue;
        const list = [...termsFor({ ...choice, terms }, t.grade)];
        list[t.term - 1] = to;
        terms[String(t.grade)] = list;
        changed = true;
    }
    if (!changed) return null;
    return {
        id: w.newId(),
        kid_id: kid.id,
        kind: "world-chosen",
        at: w.at,
        data: { terms: trimmed({ ...choice, terms, tweaks: {} }).terms, tweaks: r.worlds.tweaks },
    };
}
