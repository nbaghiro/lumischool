// Where a child stands today: the lessons their plan has for them now. The child's map and roll read
// this and nothing else of the plan, so it is its own module and takes the plan's shapes as types
// only, which keeps the fold out of the child's screens (tools/__tests__/first-view.test.ts).

import type { ChildRecord, PlannedDay } from "./family";

/**
 * The lessons a child is on: what the plan has for today in every track that works today, or, on a
 * day with none (a weekend, a day off, a track parked), the next planned day's. A track whose lesson
 * for the day is already finished stands on its next lesson not done, so a child who finishes early
 * goes on. Every lesson of a track that is on comes round in its turn, whatever the other tracks are
 * doing, so the roll and the map can stand a child on any of them. Empty only for a plan with nothing
 * ahead.
 */
export function nowIn(r: Pick<ChildRecord, "today" | "plan" | "years">): string[] {
    const done = new Set(r.years.flatMap((y) => Object.keys(y.progress.done)));
    const works = (d: PlannedDay): d is PlannedDay & { lesson: string } =>
        d.kind !== "off" && d.lesson !== undefined;
    const on = (day: string): string[] =>
        r.plan.flatMap(({ days }) => {
            const d = days.find((x) => x.on === day && works(x));
            if (!d || !works(d)) return [];
            if (!done.has(d.lesson)) return [d.lesson];
            const later = days.find((x) => x.on > day && works(x) && !done.has(x.lesson ?? ""));
            return later?.lesson === undefined ? [] : [later.lesson];
        });
    const today = on(r.today);
    if (today.length) return [...new Set(today)];
    const next = r.plan
        .flatMap(({ days }) => days.filter((d) => d.on > r.today && works(d)))
        .map((d) => d.on)
        .sort()[0];
    return next === undefined ? [] : [...new Set(on(next))];
}
