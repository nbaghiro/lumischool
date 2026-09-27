// The calendar as the place a child's curriculum is designed: four views over the family's log, with
// the lessons not yet placed on a shelf beside the week. A lesson is placed, moved and taken out by
// dragging or by the keyboard, and both go through the same `place`, so the two paths cannot drift.

import "./calendar.css";
import "./calendar-planner.css";
import {
    createEffect,
    createMemo,
    createResource,
    createSignal,
    For,
    on,
    onCleanup,
    Show,
    type JSX,
} from "solid-js";
import type { Draft, PlanOp, SessionOp } from "../../engine/answer";
import * as api from "../../engine/ui/api";
import { onThisComputer } from "../../engine/ui/device";
import { Dialog } from "../../engine/ui/dialog";
import { failureText } from "../../engine/ui/failure";
import { Button } from "../../engine/ui/form";
import { Portrait } from "../../engine/ui/kids";
import { useLook } from "../../engine/ui/page";
import { go, search } from "../../engine/ui/router";
import { announce, Say } from "../../engine/ui/say";
import { Near } from "../../engine/ui/viewport";
import { Waiting } from "../../engine/ui/waiting";
import { isParent } from "../../school/family/access";
import {
    catchUp,
    monthGrid,
    offOn,
    putBack,
    termOn,
    weekdayNumber,
    type Term,
} from "../../school/family/calendar";
import { laneOf, movesOf, sessionChanges } from "../../school/family/family";
import { addDays, mondayOf } from "../../school/record";
import { TRACK_IDS } from "../../school/tracks";
import type { Kid } from "../../server/db/schema";
import { familyChanged, openAdd } from "./bar";
import {
    Card,
    DayCard,
    drawFirst,
    factsOf,
    SchoolDaysCard,
    TermsCard,
    titleOf,
    WEEKDAY_NAMES,
    writing,
} from "./cards";
import { dayLong, dayMark, plural } from "./grown";
import { readFamilyLog, type Loaded } from "./log";
import { draft, editable, label, marker, minutes, slots, type Slot } from "./plan-ops";

/** The subjects in the order the curriculum names them, with anything unnamed after them. */
const trackRank = (track: string): number => {
    const at = (TRACK_IDS as readonly string[]).indexOf(track);
    return at < 0 ? TRACK_IDS.length : at;
};

/** The value `who` carries in the address when the calendar is showing the whole family. */
const EVERYONE = "everyone";

type View = "day" | "week" | "month" | "term";
const VIEWS: { value: View; label: string }[] = [
    { value: "day", label: "Day" },
    { value: "week", label: "Week" },
    { value: "month", label: "Month" },
    { value: "term", label: "Term" },
];

/** A lesson on the shelf: one of this child's lessons with no day, or a session set aside. */
interface Shelved {
    lesson: string;
    track: string;
    /** The session already written for it, when a parent set it aside rather than never placing it. */
    op?: SessionOp;
}

/** What a hand or the keyboard is carrying, and where it came from. */
type Carried = { kind: "slot"; slot: Slot } | { kind: "shelf"; item: Shelved; kid: Kid };

const carriedLesson = (c: Carried): string =>
    c.kind === "slot" ? c.slot.op.lesson : c.item.lesson;
const carriedKid = (c: Carried): Kid => (c.kind === "slot" ? c.slot.kid : c.kid);

/**
 * The same object while its value has not stirred, so a re-read after a change updates the rows it
 * touched instead of tearing every day and every shelf row down and drawing their pictures again.
 */
function steady<T>(kept: Map<string, T>, key: string, value: T): T {
    const was = kept.get(key);
    if (was !== undefined && JSON.stringify(was) === JSON.stringify(value)) return was;
    kept.set(key, value);
    return value;
}

export function Calendar(): JSX.Element {
    const look = useLook();
    createEffect(() => look({ place: "meadow", wide: true }));
    const [loaded, { refetch }] = createResource(readFamilyLog);
    createEffect(on(familyChanged, () => void refetch(), { defer: true }));
    const got = (): Loaded | undefined => {
        const l = loaded.latest;
        return l && !("error" in l) ? l : undefined;
    };
    const now = (): Loaded => {
        const value = got();
        if (!value) throw new Error("The calendar has not loaded yet.");
        return value;
    };
    const [card, setCard] = createSignal<JSX.Element>();
    const [busy, setBusy] = createSignal(false),
        [error, setError] = createSignal("");
    const [last, setLast] = createSignal<Draft[]>([]);
    const [carried, setCarried] = createSignal<Carried | null>(null);
    const query = (): URLSearchParams => new URLSearchParams(search());
    const view = (): View => VIEWS.find((x) => x.value === query().get("view"))?.value ?? "week";
    const keptKids = new Map<string, Kid>(),
        keptSlots = new Map<string, Slot>(),
        keptItems = new Map<string, Shelved>(),
        keptGroups = new Map<string, { track: string; items: Shelved[] }>();
    const kids = (): Kid[] => (got()?.view.kids ?? []).map((k) => steady(keptKids, k.id, k));
    /** One child's lessons on one day, each the same object while that lesson has not changed. */
    const lessonsOn = (who: Kid, d: string): Slot[] =>
        slots(now(), who, d).map((s) => steady(keptSlots, `${who.id}|${d}|${s.op.id}`, s));
    /** This child's shelf, each row and each group the same object while nothing in it changed. */
    const shelfOf = (who: Kid): { track: string; items: Shelved[] }[] =>
        shelf(who).map((g) =>
            steady(keptGroups, `${who.id}|${g.track}`, {
                track: g.track,
                items: g.items.map((i) => steady(keptItems, `${who.id}|${i.lesson}`, i)),
            }),
        );
    /** The chips choose the whole family or one child; a family of several opens on everyone. */
    const whose = (): string => {
        const asked = query().get("who");
        if (asked === EVERYONE) return EVERYONE;
        const one = kids().find((k) => k.id === asked);
        return one ? one.id : kids().length > 1 ? EVERYONE : (kids()[0]?.id ?? "");
    };
    /** The one child in view, or undefined when the calendar is showing everyone. */
    const kid = (): Kid | undefined => kids().find((k) => k.id === whose());
    const day = (): string => {
        const raw = query().get("at");
        if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) && !Number.isNaN(Date.parse(raw))) return raw;
        const today = got()?.cal.today ?? "";
        // On a Saturday or a Sunday the week worth planning is the one ahead, not the one ending.
        return today && weekdayNumber(today) > 5 ? addDays(mondayOf(today), 7) : today;
    };
    const parent = (): boolean => !!got() && isParent(now().me.members);
    /** Whose lessons every view draws: one child, or all of them when everyone is chosen. */
    const shown = (): Kid[] => {
        const one = kid();
        return one ? [one] : kids();
    };
    const move = (next: { view?: View; at?: string; who?: string }): void => {
        const q = new URLSearchParams({
            view: next.view ?? view(),
            at: next.at ?? day(),
            who: next.who ?? whose(),
        });
        go(`/calendar?${q}`);
    };
    const close = (): void => {
        if (!busy()) {
            setCard(undefined);
            setError("");
        }
    };
    const open = (content: JSX.Element): void => {
        setError("");
        setCard(content);
    };
    const save = async (drafts: Draft[], line: string, shut = true): Promise<boolean> => {
        if (busy() || !parent() || !drafts.length) return false;
        setBusy(true);
        setError("");
        const at = api.nowAt();
        drafts = drafts.map((d) => ({ ...d, at }));
        try {
            const result = await api.append(drafts);
            if ("error" in result) {
                setError(
                    `The change was not saved. ${failureText(result, onThisComputer(location.hostname))}`,
                );
                return false;
            }
            setLast(drafts);
            // what changed is visible on the day itself, so the line is said to a screen reader only
            announce(line);
            if (shut) setCard(undefined);
            await refetch();
            return true;
        } catch {
            setError("The connection stopped before we could confirm the change. Try again.");
            return false;
        } finally {
            setBusy(false);
        }
    };
    const write = async (drafts: Draft[], line: string): Promise<void> => {
        await save(drafts, line);
    };
    const undo = async (): Promise<void> => {
        const old = last();
        if (!old.length) return;
        const back = putBack(
            writing(),
            old.map((d) => ({ id: d.id, kid: d.kid_id })),
        );
        if (await save(back, "Put the last change back.")) setLast([]);
    };
    const onDay = (d = day(), who = shown()): Slot[] =>
        got() ? who.flatMap((k) => lessonsOn(k, d)) : [];
    const checkDate = (who: string, date: string): string =>
        !date || date < now().cal.today
            ? "Choose today or a later day. Finished work stays in the record."
            : offOn(now().cal.off, who, date)
              ? "This day is marked off. Choose another day, or take the day off back first."
              : "";

    /** Placing, moving and taking out, which the mouse and the keyboard both come through. */
    const place = async (c: Carried, date: string | null): Promise<void> => {
        const who = carriedKid(c);
        if (c.kind === "slot" && !editable(c.slot.cell)) {
            setError("Finished or started work stays in the record.");
            return;
        }
        const problem = date ? checkDate(who.id, date) : "";
        if (problem) {
            setError(problem);
            return;
        }
        const title = titleOf(now(), carriedLesson(c));
        const order = 1000 + onDay(date ?? day(), [who]).length;
        if (c.kind === "slot")
            await save(
                [draft(who.id, { ...c.slot.op, onDay: date, order })],
                date
                    ? `Moved ${title} to ${dayMark(date)}.`
                    : `Took ${title} out of ${who.name}'s plan.`,
            );
        else if (date) {
            const facts = factsOf(now(), c.item.lesson);
            const op: SessionOp = c.item.op
                ? { ...c.item.op, onDay: date, order, removed: false }
                : {
                      op: "session",
                      id: api.newId(),
                      source: null,
                      track: c.item.track,
                      lesson: c.item.lesson,
                      onDay: date,
                      kind: "lesson",
                      minutes: minutes(facts?.subject ?? c.item.track),
                      order,
                      note: "",
                      removed: false,
                  };
            await save([draft(who.id, op)], `Put ${title} on ${dayMark(date)}.`);
        }
        setCarried(null);
    };
    const pickUp = (c: Carried): void => {
        setError("");
        setCarried(c);
        announce(
            `${titleOf(now(), carriedLesson(c))} is in your hand. Choose a day, or press Escape to put it down.`,
        );
    };
    const putDown = (): void => {
        if (carried()) setCarried(null);
    };
    // Escape puts a carried lesson down wherever the keyboard is: Safari gives a clicked button no
    // focus, so a handler on the control that picked the lesson up would never hear the key.
    createEffect(() => {
        if (!carried()) return;
        const key = (e: KeyboardEvent): void => {
            if (e.key === "Escape") putDown();
        };
        addEventListener("keydown", key);
        onCleanup(() => removeEventListener("keydown", key));
    });
    /** A day takes what is carried when it is this child's and not already gone. */
    const canDrop = (d: string, who?: Kid): boolean => {
        const c = carried();
        return (
            !!c &&
            d >= now().cal.today &&
            (!who || carriedKid(c).id === who.id) &&
            !offOn(now().cal.off, carriedKid(c).id, d)
        );
    };
    const drop = (d: string, who?: Kid): void => {
        const c = carried();
        if (c && canDrop(d, who)) void place(c, d);
    };

    /** This child's lessons with no day: never placed, or set aside by a parent. */
    const shelf = (who: Kid): { track: string; items: Shelved[] }[] => {
        const l = now();
        const moves = movesOf(l.events, who.id, l.me.family.time_zone);
        const set = sessionChanges(moves).filter((s) => !s.onDay && !s.removed);
        const planned = new Set<string>();
        for (const [, cells] of l.cal.kids.get(who.id)?.cells ?? [])
            for (const c of cells) if (c.lesson) planned.add(c.lesson);
        const finished = new Set(
            l.sittings.filter((s) => s.child === who.id && s.finished).map((s) => s.lesson),
        );
        const tracks = [...new Set(l.pack.index.lessons.map((x) => x.subject))].sort(
            (a, b) => trackRank(a) - trackRank(b),
        );
        return tracks
            .map((track) => {
                const lane = laneOf(l.pack.index.lessons, track, who.grade);
                const aside = set
                    .filter((s) => s.track === track)
                    .map((op): Shelved => ({ lesson: op.lesson, track, op }));
                const free = lane
                    .filter(
                        (id) =>
                            !planned.has(id) &&
                            !finished.has(id) &&
                            !aside.some((a) => a.lesson === id),
                    )
                    .map((id): Shelved => ({ lesson: id, track }));
                return { track, items: [...aside, ...free] };
            })
            .filter((g) => g.items.length);
    };

    const openLesson = (s: Slot): void => open(<EditSession slot={s} />);
    /** School days belong to a child, so showing everyone asks whose before it opens the card. */
    const openDays = (one: Kid | undefined): void =>
        open(
            one ? (
                <SchoolDaysCard loaded={now()} kid={one} onClose={close} onWrite={write} />
            ) : (
                <WhoseDays />
            ),
        );
    const openDayCard = (d: string, who: Kid | null): void =>
        open(<DayCard loaded={now()} on={d} kid={who} onClose={close} onWrite={write} />);

    function Sticker(props: { slot: Slot; compact?: boolean }): JSX.Element {
        const s = (): Slot => props.slot;
        const held = (): boolean => {
            const c = carried();
            return c?.kind === "slot" && c.slot.op.id === s().op.id;
        };
        const movable = (): boolean => parent() && editable(s().cell);
        return (
            <div
                class={`gc-sticker cal-sticker ${s().cell.state}`}
                classList={{ held: held(), compact: props.compact }}
            >
                <button
                    type="button"
                    class="gc-sticker-in"
                    style={{ "--m": marker(s().op.track) }}
                    draggable={movable()}
                    onDragStart={(e) => {
                        setCarried({ kind: "slot", slot: s() });
                        e.dataTransfer?.setData("text/plain", s().op.id);
                    }}
                    onDragEnd={() => setCarried(null)}
                    aria-label={`${titleOf(now(), s().op.lesson)}, ${label(s().op.track)}, ${stateWord(s())}`}
                    onClick={() => openLesson(s())}
                >
                    <span class="gc-tape" aria-hidden="true" />
                    <Near
                        class="gc-pic on-paper"
                        draw={(host) => drawFirst(now(), factsOf(now(), s().op.lesson), host)}
                    />
                    <span class="gc-sticker-title">{titleOf(now(), s().op.lesson)}</span>
                    <span class="cal-mark" aria-hidden="true" data-state={s().cell.state} />
                </button>
                <Show when={movable()}>
                    <button
                        type="button"
                        class="cal-lift"
                        draggable={movable()}
                        onDragStart={(e) => {
                            setCarried({ kind: "slot", slot: s() });
                            e.dataTransfer?.setData("text/plain", s().op.id);
                        }}
                        onDragEnd={() => setCarried(null)}
                        aria-pressed={held()}
                        aria-label={
                            held()
                                ? `Put ${titleOf(now(), s().op.lesson)} down`
                                : `Pick up ${titleOf(now(), s().op.lesson)} to move it`
                        }
                        onClick={() => (held() ? putDown() : pickUp({ kind: "slot", slot: s() }))}
                    >
                        <span aria-hidden="true">{held() ? "in hand" : "move"}</span>
                    </button>
                </Show>
            </div>
        );
    }

    const stateWord = (s: Slot): string =>
        s.cell.state === "done"
            ? "done"
            : s.cell.state === "late"
              ? "done later"
              : s.cell.state === "part"
                ? "begun, not finished"
                : s.cell.state === "missed"
                  ? "not done"
                  : "planned";

    function DayCell(props: { on: string; who: Kid; compact?: boolean }): JSX.Element {
        const list = (): Slot[] => lessonsOn(props.who, props.on);
        const off = () => offOn(now().cal.off, props.who.id, props.on);
        const taking = (): boolean => canDrop(props.on, props.who);
        return (
            <div
                class="gc-cell cal-cell"
                data-kid={props.who.id}
                classList={{ off: !!off(), taking: taking() }}
                onDragOver={(e) => {
                    if (taking()) e.preventDefault();
                }}
                onDrop={(e) => {
                    e.preventDefault();
                    drop(props.on, props.who);
                }}
            >
                <Show when={shown().length > 1}>
                    <h3 class="cal-who">{props.who.name}</h3>
                </Show>
                <Show when={off()}>
                    <p class="cal-off">{off()?.note || "A day away from lessons"}</p>
                </Show>
                <For each={list()}>{(s) => <Sticker slot={s} compact={props.compact} />}</For>
                <Show when={taking()}>
                    <button
                        type="button"
                        class="cal-drop"
                        onClick={() => drop(props.on, props.who)}
                    >
                        Put it here
                    </button>
                </Show>
                <Show when={!taking() && parent() && props.on >= now().cal.today && !off()}>
                    <button
                        type="button"
                        class="cal-add"
                        aria-label={`Add a lesson for ${props.who.name} on ${dayLong(props.on)}`}
                        onClick={() => {
                            move({ view: "day", at: props.on, who: props.who.id });
                        }}
                    >
                        Add
                    </button>
                </Show>
            </div>
        );
    }

    function Week(): JSX.Element {
        const days = (): string[] =>
            Array.from({ length: 7 }, (_, i) => addDays(mondayOf(day()), i)).filter(
                (d) =>
                    weekdayNumber(d) <= 5 ||
                    onDay(d).length ||
                    shown().some((k) =>
                        now().cal.kids.get(k.id)?.schoolDays.includes(weekdayNumber(d)),
                    ),
            );
        return (
            <div class="cal-week" style={{ "--days": String(days().length) }}>
                <For each={days()}>
                    {(d) => (
                        <section
                            class="cal-day"
                            classList={{
                                past: d < now().cal.today,
                                today: d === now().cal.today,
                            }}
                            data-date={d}
                        >
                            <button
                                type="button"
                                class="cal-dayhead"
                                aria-label={`Open ${dayLong(d)}`}
                                onClick={() => move({ view: "day", at: d })}
                            >
                                <b>{WEEKDAY_NAMES[weekdayNumber(d) - 1]?.slice(0, 3)}</b>
                                <span>{dayMark(d)}</span>
                            </button>
                            <For each={shown()}>
                                {(k) => <DayCell on={d} who={k} compact={shown().length > 1} />}
                            </For>
                        </section>
                    )}
                </For>
            </div>
        );
    }

    function Shelf(): JSX.Element {
        const carrying = (): boolean => carried()?.kind === "slot";
        const total = (): number =>
            shown().reduce((n, k) => n + shelfOf(k).reduce((m, g) => m + g.items.length, 0), 0);
        return (
            <aside class="cal-shelf" aria-labelledby="cal-shelf-title">
                <h2 id="cal-shelf-title" class="cal-shelf-title">
                    {kid()?.name ?? "Everyone"}
                    <span>{plural(total(), "lesson")} to place</span>
                </h2>
                <Show when={carrying()}>
                    <button
                        type="button"
                        class="cal-drop"
                        onClick={() => {
                            const c = carried();
                            if (c?.kind === "slot") void place(c, null);
                        }}
                    >
                        Take it out of the plan
                    </button>
                </Show>
                <div
                    class="cal-shelf-in"
                    classList={{ taking: carrying() }}
                    onDragOver={(e) => {
                        if (carrying()) e.preventDefault();
                    }}
                    onDrop={(e) => {
                        e.preventDefault();
                        const c = carried();
                        if (c?.kind === "slot") void place(c, null);
                    }}
                >
                    <For each={shown()}>{(k) => <ShelfFor who={k} />}</For>
                </div>
            </aside>
        );
    }

    /** One child's part of the shelf: what is not placed, and the control that starts them again. */
    function ShelfFor(props: { who: Kid }): JSX.Element {
        const groups = (): { track: string; items: Shelved[] }[] => shelfOf(props.who);
        /** The subjects the shelf holds, and each subject's rows, so placing one leaves the rest. */
        const tracks = (): string[] => groups().map((g) => g.track);
        const itemsIn = (track: string): Shelved[] =>
            groups().find((g) => g.track === track)?.items ?? [];
        const settled = (): string[] => {
            const here = new Set(groups().map((g) => g.track));
            return [...new Set(now().pack.index.lessons.map((x) => x.subject))]
                .filter(
                    (s) =>
                        !here.has(s) &&
                        laneOf(now().pack.index.lessons, s, props.who.grade).length > 0,
                )
                .sort((a, b) => trackRank(a) - trackRank(b))
                .map(label);
        };
        return (
            <section class="cal-shelf-kid" data-kid={props.who.id}>
                <Show when={shown().length > 1}>
                    <h3 class="cal-shelf-name">
                        <Portrait kid={props.who} kids={now().view.kids} />
                        {props.who.name}
                        <span class="cal-shelf-count">
                            {plural(
                                groups().reduce((n, g) => n + g.items.length, 0),
                                "lesson",
                            )}
                        </span>
                    </h3>
                </Show>
                <Show when={settled().length}>
                    <p class="cal-settled">
                        Nothing left to place in{" "}
                        {new Intl.ListFormat("en-GB", { type: "conjunction" }).format(settled())}.
                    </p>
                </Show>
                <For each={tracks()}>
                    {(track) => (
                        <section class="cal-shelf-group" style={{ "--m": marker(track) }}>
                            <h4>{label(track)}</h4>
                            <ul>
                                <For each={itemsIn(track).slice(0, 12)}>
                                    {(item) => {
                                        const held = (): boolean => {
                                            const c = carried();
                                            return (
                                                c?.kind === "shelf" &&
                                                c.item.lesson === item.lesson &&
                                                c.kid.id === props.who.id
                                            );
                                        };
                                        return (
                                            <li classList={{ held: held(), aside: !!item.op }}>
                                                <button
                                                    type="button"
                                                    data-lesson={item.lesson}
                                                    data-track={item.track}
                                                    draggable={parent()}
                                                    onDragStart={(e) => {
                                                        setCarried({
                                                            kind: "shelf",
                                                            item,
                                                            kid: props.who,
                                                        });
                                                        e.dataTransfer?.setData(
                                                            "text/plain",
                                                            item.lesson,
                                                        );
                                                    }}
                                                    onDragEnd={() => setCarried(null)}
                                                    aria-pressed={held()}
                                                    aria-label={
                                                        held()
                                                            ? `Put ${titleOf(now(), item.lesson)} down`
                                                            : `Pick up ${titleOf(now(), item.lesson)} to place it for ${props.who.name}`
                                                    }
                                                    disabled={!parent()}
                                                    onClick={() => {
                                                        if (held()) putDown();
                                                        else
                                                            pickUp({
                                                                kind: "shelf",
                                                                item,
                                                                kid: props.who,
                                                            });
                                                    }}
                                                >
                                                    <Near
                                                        class="gc-pic cal-rowpic on-paper"
                                                        draw={(host) =>
                                                            drawFirst(
                                                                now(),
                                                                factsOf(now(), item.lesson),
                                                                host,
                                                            )
                                                        }
                                                    />
                                                    <span class="cal-rowtitle">
                                                        {titleOf(now(), item.lesson)}
                                                    </span>
                                                    <Show when={item.op}>
                                                        <span class="cal-aside">set aside</span>
                                                    </Show>
                                                </button>
                                            </li>
                                        );
                                    }}
                                </For>
                                <Show when={itemsIn(track).length > 12}>
                                    <li class="cal-shelf-more">
                                        {plural(itemsIn(track).length - 12, "more lesson")}
                                    </li>
                                </Show>
                            </ul>
                        </section>
                    )}
                </For>
                <Show when={!groups().length}>
                    <p class="note">Every lesson of this grade is on the calendar.</p>
                </Show>
                <Show when={parent()}>
                    <button
                        type="button"
                        class="cal-again"
                        onClick={() => open(<StartAgain kid={props.who} />)}
                    >
                        Start {props.who.name}'s plan again
                    </button>
                </Show>
            </section>
        );
    }

    function Day(): JSX.Element {
        const before = (): string => addDays(day(), -1);
        const past = (): Slot[] => onDay(before());
        return (
            <div class="cal-dayview">
                <div class="cal-agendas">
                    <For each={shown()}>{(k) => <Agenda who={k} />}</For>
                </div>
                <section class="cal-yesterday">
                    <p class="kicker">The day before</p>
                    <h3 class="gc-title">{dayLong(before())}</h3>
                    <ol class="cal-list">
                        <For each={past()}>
                            {(s) => (
                                <li>
                                    <p class="cal-when">
                                        <Show when={shown().length > 1}>{s.kid.name} · </Show>
                                        {stateWord(s)}
                                    </p>
                                    <span class="cal-what">{titleOf(now(), s.op.lesson)}</span>
                                    <p class="note">{label(s.op.track)}</p>
                                </li>
                            )}
                        </For>
                    </ol>
                    <Show when={!past().length}>
                        <p class="cal-empty">Nothing on that day.</p>
                    </Show>
                </section>
            </div>
        );
    }

    /** One child's day, as the evening before reads it and as it prints. */
    function Agenda(props: { who: Kid }): JSX.Element {
        const list = (): Slot[] => lessonsOn(props.who, day());
        return (
            <section class="cal-agenda" data-kid={props.who.id}>
                <header>
                    <p class="kicker">
                        {props.who.name} · {WEEKDAY_NAMES[weekdayNumber(day()) - 1]}
                    </p>
                    <p class="note">
                        {plural(list().length, "lesson")} ·{" "}
                        {list().reduce((n, s) => n + s.op.minutes, 0)} minutes planned
                    </p>
                </header>
                <ol class="cal-list">
                    <For each={list()}>
                        {(s, i) => (
                            <li>
                                <Near
                                    class="gc-pic cal-pic on-paper"
                                    draw={(host) =>
                                        drawFirst(now(), factsOf(now(), s.op.lesson), host)
                                    }
                                />
                                <div class="cal-item">
                                    <p class="cal-when">
                                        {i() === 0 ? "First" : "Then"} · {s.op.minutes} min
                                        <Show when={day() < now().cal.today}>
                                            {" "}
                                            · {stateWord(s)}
                                        </Show>
                                    </p>
                                    <button
                                        type="button"
                                        class="cal-what"
                                        onClick={() => openLesson(s)}
                                    >
                                        {titleOf(now(), s.op.lesson)}
                                    </button>
                                    <p class="note">
                                        {label(s.op.track)}
                                        {s.op.note ? ` · ${s.op.note}` : ""}
                                    </p>
                                </div>
                            </li>
                        )}
                    </For>
                </ol>
                <Show when={!list().length}>
                    <p class="cal-empty">
                        {day() < now().cal.today
                            ? "Nothing was recorded on this day."
                            : "An open day. Put a lesson here from the shelf."}
                    </p>
                </Show>
                <Show when={parent() && day() >= now().cal.today}>
                    <div class="acts">
                        <button
                            type="button"
                            class="link"
                            onClick={() => openDayCard(day(), props.who)}
                        >
                            A day off or a family day
                        </button>
                    </div>
                </Show>
            </section>
        );
    }

    function Month(): JSX.Element {
        const grid = (): string[] => monthGrid(day().slice(0, 7));
        /** The weeks of the grid, so each row can say how that week went. */
        const weeks = (): string[][] => {
            const all = grid();
            return Array.from({ length: Math.ceil(all.length / 7) }, (_, i) =>
                all.slice(i * 7, i * 7 + 7),
            );
        };
        const done = (s: Slot): boolean => s.cell.state === "done" || s.cell.state === "late";
        return (
            <div class="cal-month">
                <div class="cal-month-row cal-month-names">
                    <For each={WEEKDAY_NAMES}>
                        {(name) => <div class="cal-month-name">{name.slice(0, 3)}</div>}
                    </For>
                    <div class="cal-month-name">Week</div>
                </div>
                <For each={weeks()}>
                    {(week) => {
                        const all = (): Slot[] => week.flatMap((d) => onDay(d));
                        return (
                            <div class="cal-month-row">
                                <For each={week}>{(d) => <MonthDay on={d} />}</For>
                                <div class="cal-month-sum">
                                    <Show
                                        when={all().length}
                                        fallback={<span class="cal-month-quiet">no lessons</span>}
                                    >
                                        <b>{all().filter(done).length}</b>
                                        <span>of {all().length} done</span>
                                    </Show>
                                </div>
                            </div>
                        );
                    }}
                </For>
            </div>
        );
    }

    /** A day of the month: a mark a lesson, grouped by child, with the day's own state on it. */
    function MonthDay(props: { on: string }): JSX.Element {
        const d = (): string => props.on;
        const off = (who: Kid) => offOn(now().cal.off, who.id, d());
        const everyOff = (): boolean => shown().length > 0 && shown().every((k) => !!off(k));
        const holiday = (): string =>
            shown()
                .map((k) => off(k)?.note)
                .find((note) => !!note) ?? "";
        const lessons = (): { who: Kid; list: Slot[] }[] =>
            shown()
                .map((k) => ({ who: k, list: lessonsOn(k, d()) }))
                .filter((row) => row.list.length);
        const count = (): number => lessons().reduce((n, row) => n + row.list.length, 0);
        const taking = (): boolean => shown().some((k) => canDrop(d(), k));
        const target = (): Kid | undefined => shown().find((k) => canDrop(d(), k));
        return (
            <div
                class="cal-month-day"
                classList={{
                    out: d().slice(0, 7) !== day().slice(0, 7),
                    today: d() === now().cal.today,
                    past: d() < now().cal.today,
                    off: everyOff(),
                    taking: taking(),
                }}
                data-date={d()}
                onDragOver={(e) => {
                    if (taking()) e.preventDefault();
                }}
                onDrop={(e) => {
                    e.preventDefault();
                    const k = target();
                    if (k) drop(d(), k);
                }}
            >
                <button
                    type="button"
                    class="cal-month-in"
                    aria-label={`${dayLong(d())}, ${plural(count(), "lesson")}`}
                    onClick={() => {
                        const k = target();
                        if (carried() && k) drop(d(), k);
                        else move({ view: "day", at: d() });
                    }}
                >
                    <b>{Number(d().slice(8))}</b>
                    <Show when={everyOff()}>
                        <span class="cal-month-off">{holiday() || "A day away"}</span>
                    </Show>
                    <For each={lessons()}>
                        {(row) => (
                            <span class="cal-month-kid">
                                <Show when={shown().length > 1}>
                                    <Portrait kid={row.who} kids={now().view.kids} />
                                </Show>
                                <span class="cal-month-marks">
                                    <For each={row.list}>
                                        {(s) => (
                                            <i
                                                class={`cal-mark ${s.cell.state}`}
                                                data-state={s.cell.state}
                                                style={{ "--m": marker(s.op.track) }}
                                            />
                                        )}
                                    </For>
                                </span>
                            </span>
                        )}
                    </For>
                </button>
            </div>
        );
    }

    function TermView(): JSX.Element {
        const term = (): Term | undefined => termOn(now().cal, day()) ?? now().cal.terms[0];
        const weeksOf = (t: Term): string[] => {
            const out: string[] = [];
            for (let d = mondayOf(t.from); d <= t.to; d = addDays(d, 7)) out.push(d);
            return out;
        };
        return (
            <Show when={term()} fallback={<p class="note">This year has no terms set yet.</p>}>
                {(t) => (
                    <div class="cal-term">
                        <p class="kicker">
                            Term {t().n} · {dayMark(t().from)} to {dayMark(t().to)}
                        </p>
                        <h3 class="gc-title">{plural(weeksOf(t()).length, "week")}</h3>
                        <For each={shown()}>
                            {(k) => <TermFor who={k} term={t()} weeks={weeksOf(t())} />}
                        </For>
                    </div>
                )}
            </Show>
        );
    }

    /** One child's term: a ribbon a subject over the term's weeks, and where a subject runs past it. */
    function TermFor(props: { who: Kid; term: Term; weeks: string[] }): JSX.Element {
        const waiting = createMemo(
            () => new Map(shelfOf(props.who).map((g) => [g.track, g.items.length])),
        );
        const tracks = (): string[] =>
            [...new Set(now().pack.index.lessons.map((x) => x.subject))]
                .filter((s) => laneOf(now().pack.index.lessons, s, props.who.grade).length)
                .sort((a, b) => trackRank(a) - trackRank(b));
        /** How many of this subject's sessions fall in each week of the term. */
        const counts = (track: string): number[] =>
            props.weeks.map((monday) =>
                Array.from({ length: 7 }, (_, i) => addDays(monday, i)).reduce(
                    (n, d) =>
                        n + lessonsOn(props.who, d).filter((s) => s.op.track === track).length,
                    0,
                ),
            );
        const behind = (track: string) => {
            const kc = now().cal.kids.get(props.who.id);
            if (!kc) return null;
            const lane = laneOf(now().pack.index.lessons, track, props.who.grade);
            const perWeek = kc.tracks.find((x) => x.track === track)?.perWeek ?? 0;
            const up = catchUp(now().cal, kc, props.term, track, lane, perWeek);
            return up.over ? up : null;
        };
        return (
            <section class="cal-term-kid" data-kid={props.who.id}>
                <Show when={shown().length > 1}>
                    <h4 class="cal-shelf-name">
                        <Portrait kid={props.who} kids={now().view.kids} />
                        {props.who.name}
                    </h4>
                </Show>
                <div class="cal-ribbons">
                    <For each={tracks()}>
                        {(track) => (
                            <>
                                <b class="cal-ribbon-name">{label(track)}</b>
                                <div class="cal-weeks" style={{ "--m": marker(track) }}>
                                    <span class="sr">
                                        {`${label(track)}, ${plural(
                                            counts(track).reduce((a, b) => a + b, 0),
                                            "session",
                                        )} this term`}
                                    </span>
                                    <For each={counts(track)}>
                                        {(n, i) => (
                                            <i
                                                classList={{
                                                    full: n >= 3,
                                                    some: n > 0 && n < 3,
                                                }}
                                                title={`Week of ${dayMark(props.weeks[i()] ?? props.term.from)}: ${plural(n, "session")}`}
                                            />
                                        )}
                                    </For>
                                </div>
                                <Show when={!counts(track).some((n) => n > 0)}>
                                    <p class="cal-over quiet">
                                        {`Nothing planned this term. ${plural(
                                            waiting().get(track) ?? 0,
                                            "lesson",
                                        )} on the shelf.`}
                                    </p>
                                </Show>
                                <Show when={behind(track)}>
                                    {(up) => (
                                        <p class="cal-over">
                                            {`${label(track)} runs ${plural(up().over, "day")} past the end of term. ${
                                                up().perWeek
                                                    ? `${plural(up().perWeek ?? 0, "day")} a week would fit the rest in by then.`
                                                    : "Every school day is already used."
                                            }`}
                                        </p>
                                    )}
                                </Show>
                            </>
                        )}
                    </For>
                </div>
            </section>
        );
    }

    function EditSession(props: { slot: Slot }): JSX.Element {
        const s = props.slot;
        const [date, setDate] = createSignal(
                s.cell.on < now().cal.today ? now().cal.today : s.cell.on,
            ),
            [duration, setDuration] = createSignal(s.op.minutes),
            [note, setNote] = createSignal(s.op.note);
        const submit = async (): Promise<void> => {
            const problem = checkDate(s.kid.id, date());
            if (problem) {
                setError(problem);
                return;
            }
            if (!Number.isInteger(duration()) || duration() < 5 || duration() > 240) {
                setError("Choose 5 to 240 whole minutes.");
                return;
            }
            await save(
                [draft(s.kid.id, { ...s.op, onDay: date(), minutes: duration(), note: note() })],
                `Updated ${titleOf(now(), s.op.lesson)}.`,
            );
        };
        return (
            <Card
                kicker={`${s.kid.name} · ${label(s.op.track)}`}
                title={titleOf(now(), s.op.lesson)}
                onClose={close}
            >
                <p class="note">
                    {editable(s.cell)
                        ? "Move it to another day, or change how long it is planned for."
                        : "Work already begun stays in the record."}
                </p>
                <Show when={parent() && editable(s.cell)}>
                    <div class="cal-fields">
                        <label class="field">
                            <span>Day</span>
                            <input
                                type="date"
                                value={date()}
                                min={now().cal.today}
                                onInput={(e) => setDate(e.currentTarget.value)}
                            />
                        </label>
                        <label class="field">
                            <span>Minutes planned</span>
                            <input
                                type="number"
                                value={duration()}
                                min="5"
                                max="240"
                                onInput={(e) => setDuration(e.currentTarget.valueAsNumber)}
                            />
                        </label>
                    </div>
                    <label class="field">
                        <span>A note for yourself</span>
                        <textarea
                            value={note()}
                            maxlength="2000"
                            onInput={(e) => setNote(e.currentTarget.value)}
                        />
                    </label>
                    <div class="acts">
                        <Button busy={busy()} onClick={() => void submit()}>
                            Keep this
                        </Button>
                        <button
                            type="button"
                            class="link"
                            disabled={busy()}
                            onClick={() => void place({ kind: "slot", slot: s }, null)}
                        >
                            Take it out
                        </button>
                    </div>
                </Show>
            </Card>
        );
    }

    function WhoseDays(): JSX.Element {
        return (
            <Card kicker="School days" title="Whose school days?" onClose={close}>
                <div class="cal-whose">
                    <For each={kids()}>
                        {(k) => (
                            <button type="button" class="cal-whochip" onClick={() => openDays(k)}>
                                <Portrait kid={k} kids={now().view.kids} />
                                {k.name}
                            </button>
                        )}
                    </For>
                </div>
            </Card>
        );
    }

    function StartAgain(props: { kid: Kid }): JSX.Element {
        const from = (): string => addDays(now().cal.today, 1);
        const drafts = (): Draft[] => {
            const l = now();
            const tracks = [...new Set(l.pack.index.lessons.map((x) => x.subject))].filter(
                (s) => laneOf(l.pack.index.lessons, s, props.kid.grade).length,
            );
            const pauses = tracks.map((track) =>
                draft(props.kid.id, {
                    op: "routine",
                    track,
                    from: from(),
                    weekdays: [],
                    sessions: 1,
                } satisfies PlanOp),
            );
            const placed = sessionChanges(
                movesOf(l.events, props.kid.id, l.me.family.time_zone),
            ).filter((s) => !s.removed && s.onDay && s.onDay >= from());
            return [
                ...pauses,
                ...placed.map((op) => draft(props.kid.id, { ...op, removed: true })),
            ];
        };
        return (
            <Card
                kicker={props.kid.name}
                title={`Start ${props.kid.name}'s plan again`}
                onClose={close}
            >
                <p>
                    This clears what is planned from tomorrow and leaves the shelf full, so you can
                    build the weeks yourself. Finished work stays in {props.kid.name}'s record, and
                    you can put this back.
                </p>
                <div class="acts">
                    <Button
                        busy={busy()}
                        onClick={() =>
                            void save(
                                drafts(),
                                `Cleared ${props.kid.name}'s plan from ${dayMark(from())}.`,
                            )
                        }
                    >
                        Clear the plan ahead
                    </Button>
                    <Button second disabled={busy()} onClick={close}>
                        Keep it as it is
                    </Button>
                </div>
            </Card>
        );
    }

    const step = (n: number): void => {
        if (view() === "month") {
            const d = new Date(`${day().slice(0, 7)}-01T12:00:00Z`);
            d.setUTCMonth(d.getUTCMonth() + n);
            move({ at: d.toISOString().slice(0, 10) });
        } else if (view() === "day") move({ at: addDays(day(), n) });
        else if (view() === "term") {
            const terms = now().cal.terms;
            const at = terms.findIndex((t) => t.from <= day() && day() <= t.to);
            const next = terms[Math.min(terms.length - 1, Math.max(0, (at < 0 ? 0 : at) + n))];
            if (next) move({ at: next.from });
        } else move({ at: addDays(day(), n * 7) });
    };
    /** What today holds for whoever is chosen, and what the page is for. */
    const todayLine = (): string => {
        const today = now().cal.today;
        return `${plural(onDay(today).length, "lesson")} today, ${dayMark(today)}. Plan the days and shape the weeks ahead.`;
    };
    const heading = (): string => {
        if (view() === "day") return dayLong(day());
        if (view() === "month")
            return new Date(`${day()}T12:00:00Z`).toLocaleDateString("en-GB", {
                month: "long",
                year: "numeric",
                timeZone: "UTC",
            });
        if (view() === "term") return `Term ${termOn(now().cal, day())?.n ?? 1}`;
        return `Week of ${dayMark(mondayOf(day()))}`;
    };

    return (
        <Show when={loaded.latest} fallback={<Waiting title="Opening the calendar" />}>
            <Show
                when={got()}
                fallback={
                    <Waiting
                        title="The calendar did not load"
                        pending={false}
                        retry={() => void refetch()}
                    />
                }
            >
                {(l) => (
                    <div class="gc cal" classList={{ carrying: !!carried() }}>
                        <Show
                            when={kids().length}
                            fallback={
                                <section class="cal-card cal-plain">
                                    <h2 class="gc-title">Room for their first week</h2>
                                    <p class="note">
                                        Add a child to choose subjects and plan their lessons.
                                    </p>
                                    <Show when={parent()}>
                                        <Button onClick={openAdd}>Add a child</Button>
                                    </Show>
                                </section>
                            }
                        >
                            <header class="cal-card cal-head">
                                <div class="cal-headline">
                                    <p class="kicker">Your family's learning plan</p>
                                    <h1 class="cal-name">Calendar</h1>
                                    <p class="note">{todayLine()}</p>
                                </div>
                                <p class="kicker cal-chips">
                                    <Show when={kids().length > 1} fallback={kid()?.name}>
                                        <button
                                            type="button"
                                            class="cal-whochip plain"
                                            aria-pressed={whose() === EVERYONE}
                                            onClick={() => move({ who: EVERYONE })}
                                        >
                                            Everyone
                                        </button>
                                        <For each={kids()}>
                                            {(k) => (
                                                <button
                                                    type="button"
                                                    class="cal-whochip"
                                                    aria-pressed={k.id === kid()?.id}
                                                    onClick={() => move({ who: k.id })}
                                                >
                                                    <Portrait kid={k} kids={l().view.kids} />
                                                    {k.name}
                                                </button>
                                            )}
                                        </For>
                                    </Show>
                                </p>
                                <fieldset class="cal-views">
                                    <legend class="sr">Which view</legend>
                                    <For each={VIEWS}>
                                        {(v) => (
                                            <button
                                                type="button"
                                                aria-pressed={view() === v.value}
                                                onClick={() => move({ view: v.value })}
                                            >
                                                {v.label}
                                            </button>
                                        )}
                                    </For>
                                </fieldset>
                                <div class="cal-quiet">
                                    <Show when={last().length && !carried()}>
                                        <button
                                            type="button"
                                            class="link"
                                            onClick={() => {
                                                if (!busy()) void undo();
                                            }}
                                        >
                                            Put it back
                                        </button>
                                    </Show>
                                    <Show when={parent()}>
                                        <button
                                            type="button"
                                            class="link"
                                            onClick={() => openDays(kid())}
                                        >
                                            School days
                                        </button>
                                    </Show>
                                    <Show when={parent()}>
                                        <button
                                            type="button"
                                            class="link"
                                            onClick={() =>
                                                open(
                                                    <TermsCard
                                                        loaded={l()}
                                                        onClose={close}
                                                        onWrite={write}
                                                    />,
                                                )
                                            }
                                        >
                                            Term dates
                                        </button>
                                    </Show>
                                </div>
                            </header>
                            <Show when={error() && !card()}>
                                <div class="cal-said">
                                    <Say text={error()} />
                                </div>
                            </Show>
                            <div class="cal-body" classList={{ withshelf: view() === "week" }}>
                                <section class="cal-main">
                                    <div class="cal-mainhead">
                                        <h2 class="gc-title">{heading()}</h2>
                                        <div class="cal-steps">
                                            <button
                                                type="button"
                                                aria-label="Go back"
                                                onClick={() => step(-1)}
                                            >
                                                ‹
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => move({ at: l().cal.today })}
                                            >
                                                Today
                                            </button>
                                            <button
                                                type="button"
                                                aria-label="Go forward"
                                                onClick={() => step(1)}
                                            >
                                                ›
                                            </button>
                                        </div>
                                    </div>
                                    <div class="cal-view">
                                        <Show when={view() === "day"}>
                                            <Day />
                                        </Show>
                                        <Show when={view() === "week"}>
                                            <Week />
                                        </Show>
                                        <Show when={view() === "month"}>
                                            <Month />
                                        </Show>
                                        <Show when={view() === "term"}>
                                            <TermView />
                                        </Show>
                                    </div>
                                </section>
                                <Show when={view() === "week"}>
                                    <Shelf />
                                </Show>
                            </div>
                        </Show>
                        <Show when={card()}>
                            {(c) => (
                                <Dialog two onClose={close}>
                                    <div class="cal-editor">
                                        <Show when={error()}>
                                            <Say text={error()} />
                                        </Show>
                                        <fieldset disabled={busy()}>{c()}</fieldset>
                                    </div>
                                </Dialog>
                            )}
                        </Show>
                    </div>
                )}
            </Show>
        </Show>
    );
}
