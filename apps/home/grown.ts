// What the grown-ups' home says about each child, worked out from the child's record as the server
// folds it for a parent (`GET /api/kids/:kid/record`) and the pack's index: today's lessons, the
// week, where they are on their map, and the words the cards are written in.

import type { LessonFacts } from "../../engine/pack";
import type { DayKind } from "../../school/family/family";
import {
    dayItems,
    schoolWeek,
    type DayItemState,
    type SheetBack,
} from "../../school/family/sheets";
import type { World } from "../../school/worlds/types";
import { type Marker } from "../../school/year";
import { subjectFacts, TRACK_IDS } from "../../school/tracks";
import type { GrownRecord } from "../../server/api";

const at = (iso: string): Date => new Date(`${iso}T00:00:00Z`);

/**
 * The minute of the day a moment falls on where the family is, which is what says when a morning
 * began. A zone the browser does not know falls back to the moment's own hours.
 */
export function minuteOfDay(when: string, timeZone: string): number {
    const time = new Date(when);
    try {
        const parts = new Intl.DateTimeFormat("en-GB", {
            timeZone,
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        }).formatToParts(time);
        const part = (t: string): number => Number(parts.find((p) => p.type === t)?.value ?? "0");
        return part("hour") * 60 + part("minute");
    } catch {
        return time.getUTCHours() * 60 + time.getUTCMinutes();
    }
}

/** "Thursday, September 17". */
export const dayLong = (iso: string): string =>
    at(iso).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
    });

/** "Thu, Sep 17". */
export const dayShort = (iso: string): string =>
    at(iso).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
    });

/** "17 Sep", as a postmark prints it. */
export const dayMark = (iso: string): string =>
    `${Number(iso.slice(8))} ${at(iso).toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })}`;

/** "Thu", for a column of a week. */
export const weekdayShort = (iso: string): string =>
    at(iso).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });

export const plural = (n: number, one: string, many = `${one}s`): string =>
    `${n} ${n === 1 ? one : many}`;

/** "Rosie, Leo and Ivy". */
export const names = (xs: readonly string[]): string =>
    xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1) ?? ""}`;

/** "the harbour", as a sentence says a world. */
export const placeName = (w: Pick<World, "name">): string => w.name.replace(/^The /, "the ");

const orderOf = (track: string): number => {
    const i = TRACK_IDS.findIndex((t) => t === track);
    return i < 0 ? TRACK_IDS.length : i;
};

/** A lesson as a card shows it: its facts, its track's name and marker, and what kind of day it is. */
export interface Planned {
    lesson: LessonFacts;
    track: string;
    title: string;
    marker: Marker;
    kind: DayKind;
}

type Facts = (id: string) => LessonFacts | undefined;

/** What the plan has for a child on a day, across the tracks they do, in the tracks' order. */
export function plannedOn(r: GrownRecord, on: string, facts: Facts): Planned[] {
    return [...r.plan]
        .sort((a, b) => orderOf(a.track) - orderOf(b.track))
        .flatMap((p) => {
            const d = p.days.find((x) => x.on === on && x.kind !== "off" && x.lesson);
            const lesson = d?.lesson ? facts(d.lesson) : undefined;
            if (!d || !lesson) return [];
            const s = subjectFacts(p.track);
            return [{ lesson, track: p.track, title: s.title, marker: s.marker, kind: d.kind }];
        });
}

/** How a lesson stands on a day of the week, for a dot and the words a screen reader hears. */
export type DotState = "done" | "part" | "missed" | "today" | "planned";

export const DOT_WORDS: Record<DotState, string> = {
    done: "done",
    part: "part done",
    missed: "not done",
    today: "today",
    planned: "planned",
};

export interface WeekDay {
    on: string;
    today: boolean;
    dots: { title: string; marker: Marker; state: DotState }[];
}

const dotOf = (state: DayItemState, sheet: SheetBack | undefined, today: boolean): DotState =>
    state === "extra"
        ? sheet?.finished
            ? "done"
            : "part"
        : state === "planned"
          ? today
              ? "today"
              : "planned"
          : state;

/** A child's school week round today, Monday to Friday: each day's lessons as dots. */
export function weekOf(r: GrownRecord, facts: Facts): WeekDay[] {
    return schoolWeek(r.today).map((on) => {
        const planned = plannedOn(r, on, facts);
        const today = on === r.today;
        const items = dayItems(
            planned.map((p) => p.lesson.id),
            r.back,
            on,
            r.today,
        );
        return {
            on,
            today,
            dots: items.map((item) => {
                const l = facts(item.lesson);
                const s = subjectFacts(l?.subject ?? item.sheet?.subject ?? "maths");
                return {
                    title: l?.title ?? item.lesson,
                    marker: s.marker,
                    state: dotOf(item.state, item.sheet, today),
                };
            }),
        };
    });
}

/** Paper that came back and waits to be marked, oldest first. */
export const waitingIn = (r: GrownRecord): SheetBack[] =>
    r.back.filter((s) => s.mode === "paper" && !s.marked);

/**
 * The paper a family prints on: Letter in the Americas, where the family's time zone says they are,
 * and A4 everywhere else. A family setting will replace this guess.
 */
export const paperFor = (timeZone: string): "A4" | "Letter" =>
    timeZone.startsWith("America/") ? "Letter" : "A4";

/** The hello card's line: today's lessons for everyone, and what waits to be marked. */
export function helloLine(kids: readonly string[], lessons: number, waiting: number): string {
    const today = !kids.length
        ? "No children yet. Add the first one, then open their view on the device they use."
        : lessons
          ? `${plural(lessons, "lesson")} today for ${names(kids)}.`
          : `Nothing is planned today for ${names(kids)}.`;
    if (!kids.length) return today;
    return `${today} ${
        waiting
            ? `${plural(waiting, "sheet")} came back on paper and ${waiting === 1 ? "waits" : "wait"} to be marked.`
            : "Nothing is waiting to be marked."
    }`;
}
