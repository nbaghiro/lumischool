import "./calendar.css";
import { createResource, For, Show, type JSX } from "solid-js";
import { Button } from "../../engine/ui/form";
import { grownRecord } from "../../engine/ui/grown";
import { Near } from "../../engine/ui/viewport";
import {
    catchUp,
    saidOf,
    weekDays,
    type CalCell,
    type Change,
    type Term,
} from "../../school/family/calendar";
import * as acts from "../../school/family/calendar";
import { addDays, mondayOf } from "../../school/record/record";
import { termsFor } from "../../school/worlds/choice";
import { worldById } from "../../school/worlds/worlds";
import type { GrownRecord } from "../../server/api";
import type { Kid } from "../../server/db/schema";
import { calOf, TermsCard, titleOf, trackTitle, writing, type Write } from "./cards";
import type { Loaded } from "./log";
import { dayLong, dayMark, plural } from "./grown";
import { choiceFor, worldAs } from "./worlds";

type Open = (card: JSX.Element | null) => void;
const WORLD_W = 96;
function WorldPicture(props: { kid: Kid; record: GrownRecord; world: string }): JSX.Element {
    const draw = async (host: HTMLElement): Promise<void> => {
        const { paintWorld } = await import("./where");
        await paintWorld(worldAs(props.kid, props.record, props.world), host, WORLD_W);
    };
    return <Near class="gc-world" draw={draw} />;
}

export function Year(props: {
    loaded: Loaded;
    kids: readonly Kid[];
    onWeek: (at: string, kid: string) => void;
    onCard: Open;
    onWrite: Write;
}): JSX.Element {
    const l = (): Loaded => props.loaded;
    const kids = (): readonly Kid[] => props.kids;
    const lessonsIn = (kid: Kid, term: Term, track: string): string[] => {
        const k = calOf(l(), kid);
        if (!k) return [];
        const days = (k.lanes.get(track) ?? []).filter((d) => d.on >= term.from && d.on <= term.to);
        return [...new Set(days.flatMap((d) => (d.lesson ? [d.lesson] : [])))];
    };
    /** A track's days inside a term, and how many of them are done or were done later. */
    const daysIn = (kid: Kid, term: Term, track: string): { planned: number; done: number } => {
        const k = calOf(l(), kid);
        if (!k) return { planned: 0, done: 0 };
        let planned = 0;
        let done = 0;
        for (const [on, cells] of k.cells)
            if (on >= term.from && on <= term.to)
                for (const c of cells)
                    if (c.track === track) {
                        planned++;
                        if (c.state === "done" || c.state === "late") done++;
                    }
        return { planned, done };
    };
    // each child's record, for the worlds their terms are in as their own map folds them
    const [records] = createResource(
        () => kids().map((k) => k.id),
        async (ids) =>
            new Map(await Promise.all(ids.map(async (id) => [id, await grownRecord(id)] as const))),
    );
    const worldOf = (
        kid: Kid,
        term: Term,
    ): { id: string; name: string; record: GrownRecord } | null => {
        const record = records.latest?.get(kid.id);
        if (!record || "error" in record) return null;
        const ids = termsFor(choiceFor(kid, record), kid.grade);
        const id = ids[term.n - 1] ?? ids[0] ?? "meadow";
        return { id, name: worldById(id).name, record };
    };
    const weeksOf = (term: Term): string[] => {
        const out: string[] = [];
        for (let d = mondayOf(term.from); d <= term.to; d = addDays(d, 7)) out.push(d);
        return out;
    };
    return (
        <section class="gc-sheet" aria-label="The year">
            <header class="gc-head">
                <div>
                    <p class="kicker">The year, term by term</p>
                    <h2 class="gc-title">The school year</h2>
                </div>
                <div class="gc-tools">
                    <Button
                        second
                        onClick={() =>
                            props.onCard(
                                <TermsCard
                                    loaded={l()}
                                    onClose={() => props.onCard(null)}
                                    onWrite={props.onWrite}
                                />,
                            )
                        }
                    >
                        When the terms fall
                    </Button>
                </div>
            </header>
            <div class="gc-terms">
                <For each={l().cal.terms}>
                    {(term) => (
                        <article class="gc-term">
                            <p class="kicker">{`Term ${term.n}`}</p>
                            <h3>{`${dayMark(term.from)} to ${dayMark(term.to)}`}</h3>
                            <For each={kids()}>
                                {(kid) => (
                                    <div class="gc-term-kid">
                                        <div class="gc-term-head">
                                            <Show
                                                when={worldOf(kid, term)}
                                                keyed
                                                fallback={
                                                    <div class="gc-world" aria-hidden="true" />
                                                }
                                            >
                                                {(w) => (
                                                    <WorldPicture
                                                        kid={kid}
                                                        record={w.record}
                                                        world={w.id}
                                                    />
                                                )}
                                            </Show>
                                            <p class="gc-term-name">
                                                {kid.name}
                                                <span>{worldOf(kid, term)?.name ?? ""}</span>
                                            </p>
                                        </div>
                                        <ul class="gc-tracks">
                                            <For each={calOf(l(), kid)?.tracks ?? []}>
                                                {(t) => {
                                                    const lessons = (): string[] =>
                                                        lessonsIn(kid, term, t.track);
                                                    const days = (): {
                                                        planned: number;
                                                        done: number;
                                                    } => daysIn(kid, term, t.track);
                                                    const started = (): boolean =>
                                                        term.from <= l().cal.today;
                                                    const up = (): ReturnType<typeof catchUp> =>
                                                        catchUp(
                                                            l().cal,
                                                            calOf(l(), kid) ?? {
                                                                id: kid.id,
                                                                start: l().cal.today,
                                                                schoolDays: [],
                                                                tracks: [],
                                                                lanes: new Map(),
                                                                cells: new Map(),
                                                            },
                                                            term,
                                                            t.track,
                                                            lessons(),
                                                            t.perWeek,
                                                        );
                                                    return (
                                                        <li>
                                                            <b>{trackTitle(t.track)}</b>
                                                            <span>
                                                                {days().planned
                                                                    ? `${days().done} of ${plural(days().planned, "day")} done, ${plural(lessons().length, "lesson")}, ${plural(t.perWeek, "day")} a week`
                                                                    : `Nothing planned this term, ${plural(t.perWeek, "day")} a week`}
                                                            </span>
                                                            <Show when={started() && up().over}>
                                                                <span class="gc-catch">
                                                                    {`The plan runs ${plural(up().over, "day")} past the term's end. ${
                                                                        up().perWeek
                                                                            ? `${plural(up().perWeek ?? 0, "day")} a week would fit the rest in by then.`
                                                                            : "Every school day is already used."
                                                                    }`}
                                                                </span>
                                                            </Show>
                                                        </li>
                                                    );
                                                }}
                                            </For>
                                        </ul>
                                        <ol class="gc-weeks" aria-label={`${kid.name}'s weeks`}>
                                            <For each={weeksOf(term)}>
                                                {(w) => {
                                                    const cells = (): CalCell[] =>
                                                        weekDays(w, false).flatMap(
                                                            (d) =>
                                                                calOf(l(), kid)?.cells.get(d) ?? [],
                                                        );
                                                    const done = (): number =>
                                                        cells().filter(
                                                            (c) =>
                                                                c.state === "done" ||
                                                                c.state === "late",
                                                        ).length;
                                                    const mark = (): string =>
                                                        !cells().length
                                                            ? "none"
                                                            : done() === cells().length
                                                              ? "done"
                                                              : done()
                                                                ? "part"
                                                                : w <= l().cal.today
                                                                  ? "missed"
                                                                  : "ahead";
                                                    return (
                                                        <li>
                                                            <button
                                                                type="button"
                                                                class={`gc-week ${mark()}`}
                                                                classList={{
                                                                    now:
                                                                        w ===
                                                                        mondayOf(l().cal.today),
                                                                }}
                                                                aria-label={`${kid.name}, week of ${dayLong(w)}: ${done()} of ${cells().length} done. Opens that week.`}
                                                                onClick={() =>
                                                                    props.onWeek(w, kid.id)
                                                                }
                                                            />
                                                        </li>
                                                    );
                                                }}
                                            </For>
                                        </ol>
                                    </div>
                                )}
                            </For>
                        </article>
                    )}
                </For>
            </div>
        </section>
    );
}

export function Changes(props: { loaded: Loaded; onWrite: Write }): JSX.Element {
    const l = (): Loaded => props.loaded;
    const names = {
        kid: (id: string | null): string =>
            id ? (l().view.kids.find((k) => k.id === id)?.name ?? "a child") : "everyone",
        lesson: (id: string): string => titleOf(l(), id),
        track: trackTitle,
        day: dayMark,
    };
    const latest = (): Change[] => [...l().cal.changes].reverse().slice(0, 8);
    const last = (): Change | undefined =>
        [...l().cal.changes].reverse().find((c) => c.op.op !== "track");
    /**
     * Every event one change was written as: a family day is a day off for everyone and a day added
     * for each child, so putting it back puts all of them back.
     */
    const group = (c: Change): { id: string; kid: string | null }[] => [
        ...l()
            .cal.changes.filter((x) => x.at === c.at && x.actor === c.actor)
            .map((x) => ({ id: x.id, kid: x.kid })),
        ...l()
            .cal.added.filter((a) => a.at === c.at)
            .map((a) => ({ id: a.id, kid: a.kid })),
    ];
    return (
        <section class="gc-log" aria-labelledby="gc-log-title">
            <p class="kicker">{`${plural(l().cal.changes.length, "change")} in the plan`}</p>
            <h2 id="gc-log-title" class="gc-title">
                What the calendar has recorded
            </h2>
            <p class="note">
                Your recent changes stay here. Put a change back to restore the plan before it.
                Finished work stays in your child’s record.
            </p>
            <Show when={last()}>
                {(c) => (
                    <div class="acts">
                        <Button
                            second
                            onClick={() =>
                                void props.onWrite(
                                    acts.putBack(writing(), group(c())),
                                    `Put back: ${saidOf(c(), names)}`,
                                )
                            }
                        >
                            Put the last change back
                        </Button>
                    </div>
                )}
            </Show>
            <ol class="gc-log-list">
                <For each={latest()}>
                    {(c) => (
                        <li>
                            <span class="gc-log-when">{dayMark(c.on)}</span>
                            <span>{saidOf(c, names)}</span>
                        </li>
                    )}
                </For>
            </ol>
        </section>
    );
}
