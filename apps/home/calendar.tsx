// The family's calendar, in the grown-ups' frame: the week, the month and the year over one fold of
// the family's log (school/family/calendar.ts). The week is what it opens on, since the week is what a
// grown-up does something to: a lesson is a sticker on its day, dragged to another day or opened for
// its card; a day opens what can be done with it, a day off, a holiday, a family day, or the plan
// moved on. Every change is an event appended to the log and the calendar is folded again, and a
// change put back is one more event. See .docs/parents.md, "Shift the plan", and .docs/parent-app.md.

import "./calendar.css";
import {
    createEffect,
    createMemo,
    createResource,
    createSignal,
    For,
    on,
    onCleanup,
    Show,
    untrack,
    type JSX,
} from "solid-js";
import type { Draft } from "../../engine/answer";
import type { LessonFacts } from "../../engine/pack";
import * as api from "../../engine/ui/api";
import { Drawing } from "../../engine/ui/art";
import { onThisComputer } from "../../engine/ui/device";
import { failureText } from "../../engine/ui/failure";
import { Button } from "../../engine/ui/form";
import { grownRecord } from "../../engine/ui/grown";
import { Dialog } from "../../engine/ui/dialog";
import { useLook, Waiting } from "../../engine/ui/page";
import { Postcard } from "../../engine/ui/postcard";
import { go, search } from "../../engine/ui/router";
import { Say } from "../../engine/ui/say";
import { matches, Near } from "../../engine/ui/viewport";
import type { Failure } from "../../engine/ui/wire";
import {
    catchUp,
    dayState,
    monthGrid,
    offOn,
    saidOf,
    termOn,
    weekdayNumber,
    weekDays,
    type CalCell,
    type Calendar,
    type Change,
    type KidCalendar,
    type Term,
} from "../../school/family/calendar";
import * as acts from "../../school/family/calendar";
import { CELL_LABEL } from "../../school/family/family";
import { familyName, gradeName } from "../../school/family/names";
import { addDays, dayOf, mondayOf } from "../../school/record/record";
import { termsFor } from "../../school/worlds/choice";
import { worldById } from "../../school/worlds/worlds";
import { subjectFacts } from "../../school/tracks";
import type { GrownRecord } from "../../server/api";
import type { Kid } from "../../server/db/schema";
import { familyChanged } from "./bar";
import {
    calOf,
    DayCard,
    drawFirst,
    factsOf,
    LessonCard,
    Note,
    SchoolDaysCard,
    Seg,
    TermsCard,
    titleOf,
    trackTitle,
    WEEKDAY_NAMES,
    writing,
    type Write,
} from "./cards";
import { readFamilyLog, type Loaded } from "./log";
import { dayLong, dayMark, dayShort, names, plural, weekdayShort } from "./grown";
import { choiceFor, worldAs } from "./worlds";

const local = onThisComputer(location.hostname);

type View = "week" | "month" | "year";
const VIEWS: readonly View[] = ["week", "month", "year"];

interface Where {
    view: View;
    /** A day in the week or the month shown; the year reads the terms. */
    at: string;
    /** "all", or one child's id. */
    who: string;
    /** Days across, or the children across. */
    lay: "days" | "kids";
}

const isDay = (v: string): boolean =>
    /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));

export function whereOf(query: string, today: string, kids: readonly Kid[]): Where {
    const q = new URLSearchParams(query);
    const view = VIEWS.find((v) => v === q.get("view")) ?? "week";
    const at = q.get("at") ?? "";
    const who = q.get("who") ?? "all";
    return {
        view,
        at: isDay(at) ? at : /^\d{4}-\d{2}$/.test(at) ? `${at}-01` : today,
        who: kids.some((k) => k.id === who) ? who : "all",
        lay: q.get("lay") === "kids" ? "kids" : "days",
    };
}

export function addressOf(w: Where): string {
    const q = new URLSearchParams();
    if (w.view !== "week") q.set("view", w.view);
    if (w.view !== "year") q.set("at", w.view === "month" ? w.at.slice(0, 7) : w.at);
    if (w.who !== "all") q.set("who", w.who);
    if (w.lay !== "days") q.set("lay", w.lay);
    const s = q.toString();
    return s ? `/calendar?${s}` : "/calendar";
}

export function Calendar(): JSX.Element {
    const look = useLook();
    createEffect(() =>
        look({
            place: "railway",
            wide: true,
        }),
    );
    const [loaded, { refetch }] = createResource(readFamilyLog);
    createEffect(on(familyChanged, () => void refetch(), { defer: true }));
    const [said, setSaid] = createSignal("");
    const [busy, setBusy] = createSignal(false);
    const [card, setCard] = createSignal<JSX.Element | null>(null);
    const got = (): Loaded | null => {
        const l = loaded.latest;
        return l && !("error" in l) ? l : null;
    };
    const failed = (): Failure | null => {
        const l = loaded.latest;
        return l && "error" in l ? l : null;
    };
    const where = createMemo(() =>
        whereOf(search(), got()?.cal.today ?? "", got()?.view.kids ?? []),
    );
    const move = (next: Partial<Where>): void => go(addressOf({ ...untrack(where), ...next }));
    /** Appends what a change writes, then reads the log again so every view is folded from it. */
    const write = async (drafts: Draft[], line: string): Promise<void> => {
        if (busy() || !drafts.length) return;
        setBusy(true);
        const r = await api.append(drafts);
        setBusy(false);
        setCard(null);
        if ("error" in r) {
            setSaid(`The change was not kept. ${failureText(r, local)}`);
            return;
        }
        setSaid(line);
        void refetch();
    };
    return (
        <Show
            when={loaded.latest}
            fallback={<Waiting kicker="For grown-ups" title="Opening the calendar" />}
        >
            <Show when={failed()}>
                {(f) => (
                    <Postcard note kicker="The calendar" title="The calendar did not load">
                        <Say
                            text={failureText(f(), local)}
                            action={{ label: "Try again", run: () => void refetch() }}
                        />
                    </Postcard>
                )}
            </Show>
            <Show when={got()}>
                {(l) => (
                    <div class="gc">
                        <Head
                            loaded={l()}
                            where={where()}
                            said={said()}
                            onMove={move}
                            onCard={setCard}
                            onWrite={write}
                        />
                        <Show when={where().view === "week"}>
                            <Week
                                loaded={l()}
                                where={where()}
                                onMove={move}
                                onCard={setCard}
                                onWrite={write}
                            />
                        </Show>
                        <Show when={where().view === "month"}>
                            <Month loaded={l()} where={where()} onMove={move} />
                        </Show>
                        <Show when={where().view === "year"}>
                            <Year
                                loaded={l()}
                                where={where()}
                                onMove={move}
                                onCard={setCard}
                                onWrite={write}
                            />
                        </Show>
                        <Changes loaded={l()} onWrite={write} />
                        <Show when={card()}>
                            {(c) => <Dialog onClose={() => setCard(null)}>{c()}</Dialog>}
                        </Show>
                    </div>
                )}
            </Show>
        </Show>
    );
}

type Open = (card: JSX.Element | null) => void;

const kidsShown = (l: Loaded, w: Where): Kid[] =>
    w.who === "all" ? [...l.view.kids] : l.view.kids.filter((k) => k.id === w.who);

/** The week a day falls in, as the calendar counts them from the term's first Monday. */
function weekWords(cal: Calendar, on: string): string {
    const t = termOn(cal, on);
    if (!t) {
        const next = cal.terms.find((x) => x.from > on);
        return next ? `Before term ${next.n}` : "After the year";
    }
    const n = Math.floor((dayOf(mondayOf(on)) - dayOf(mondayOf(t.from))) / 7) + 1;
    return `Week ${n} of term ${t.n}`;
}

function Head(props: {
    loaded: Loaded;
    where: Where;
    said: string;
    onMove: (next: Partial<Where>) => void;
    onCard: Open;
    onWrite: Write;
}): JSX.Element {
    const l = (): Loaded => props.loaded;
    const cells = (): CalCell[] =>
        kidsShown(l(), props.where).flatMap((kid) =>
            weekDays(mondayOf(l().cal.today), false).flatMap(
                (d) => calOf(l(), kid)?.cells.get(d) ?? [],
            ),
        );
    const missed = (): number =>
        kidsShown(l(), props.where).reduce(
            (n, kid) =>
                n +
                [...(calOf(l(), kid)?.cells ?? [])].filter(([, cs]) =>
                    cs.some((c) => c.state === "missed"),
                ).length,
            0,
        );
    return (
        <Postcard
            wide
            kicker={`${familyName(l().view.family.name)} · ${weekWords(l().cal, l().cal.today)}`}
            title="The calendar"
            lead={`${plural(cells().length, "lesson")} planned this week for ${
                props.where.who === "all"
                    ? "everyone"
                    : (kidsShown(l(), props.where)[0]?.name ?? "")
            }, ${
                missed()
                    ? `${plural(missed(), "day")} not done since the year began`
                    : "every planned day so far done"
            }.`}
        >
            <div class="gc-filters gc-tools">
                <Seg
                    legend="Which view"
                    options={[
                        { value: "week", label: "The week" },
                        { value: "month", label: "The month" },
                        { value: "year", label: "The year" },
                    ]}
                    value={props.where.view}
                    onChange={(v) => props.onMove({ view: v })}
                />
                <Seg
                    legend="Whose"
                    options={[
                        { value: "all", label: "Everyone" },
                        ...l().view.kids.map((k) => ({ value: k.id, label: k.name })),
                    ]}
                    value={props.where.who}
                    onChange={(v) => props.onMove({ who: v })}
                />
            </div>
            <Show when={props.said}>
                <Say calm focus text={props.said} />
            </Show>
        </Postcard>
    );
}

/** How wide a term's world is drawn on the year, in px. */
const WORLD_W = 96;

/**
 * The world a child is in that term, as the map draws it and with no guide in it, beside its name.
 * The painter and that world's drawings load only once the year is scrolled to.
 */
function WorldPicture(props: { kid: Kid; record: GrownRecord; world: string }): JSX.Element {
    const draw = async (host: HTMLElement): Promise<void> => {
        const { paintWorld } = await import("./where");
        await paintWorld(worldAs(props.kid, props.record, props.world), host, WORLD_W);
    };
    return <Near class="gc-world" draw={draw} />;
}

/** A lesson as a sticker on its day: its track's tape, its first drawing, its title and how it went. */
function Sticker(props: {
    loaded: Loaded;
    kid: Kid;
    cell: CalCell;
    onOpen: () => void;
    onDrag?: (e: DragEvent) => void;
}): JSX.Element {
    const c = (): CalCell => props.cell;
    const facts = (): LessonFacts | undefined => factsOf(props.loaded, c().lesson);
    const printed = (): string | null =>
        props.loaded.cal.printed
            .filter(
                (p) =>
                    p.kid === props.kid.id &&
                    p.lesson === c().lesson &&
                    p.on <= c().on &&
                    p.on >= addDays(c().on, -8),
            )
            .sort((a, b) => b.on.localeCompare(a.on))[0]?.on ?? null;
    const sub = (): string =>
        [
            trackTitle(c().track),
            c().kind === "again"
                ? "again, new numbers"
                : c().kind === "practice"
                  ? "practice sheet"
                  : "",
            c().state === "late" && c().doneOn
                ? `done ${dayMark(c().doneOn ?? "")}`
                : c().state === "planned"
                  ? ""
                  : CELL_LABEL[c().state].toLowerCase(),
            printed() ? `printed ${dayMark(printed() ?? "")}` : "",
        ]
            .filter(Boolean)
            .join(" · ");
    const draw = (host: HTMLElement): Promise<void> => drawFirst(props.loaded, facts(), host);
    return (
        <li
            class={`gc-sticker ${c().state}`}
            draggable={props.onDrag ? true : undefined}
            ref={(el) => {
                el.addEventListener("dragstart", (e) => props.onDrag?.(e));
            }}
        >
            <button
                type="button"
                class="gc-sticker-in"
                style={{ "--m": `var(--${subjectFacts(c().track).marker})` }}
                aria-label={`${titleOf(props.loaded, c().lesson)}, ${trackTitle(c().track)}, ${CELL_LABEL[
                    c().state
                ].toLowerCase()}, ${dayLong(c().on)}. Opens what you can do with it.`}
                onClick={() => props.onOpen()}
            >
                <span class="gc-tape" aria-hidden="true" />
                <Show
                    when={facts()?.first}
                    fallback={
                        <span class="gc-pic gc-plain" aria-hidden="true">
                            {trackTitle(c().track).slice(0, 1)}
                        </span>
                    }
                >
                    <Near class="gc-pic on-paper" draw={draw} />
                </Show>
                <span class="gc-sticker-title">{titleOf(props.loaded, c().lesson)}</span>
                <span class="gc-sticker-sub">{sub()}</span>
            </button>
        </li>
    );
}

interface Dragged {
    kid: string;
    track: string;
    from: string;
}

function Week(props: {
    loaded: Loaded;
    where: Where;
    onMove: (next: Partial<Where>) => void;
    onCard: Open;
    onWrite: Write;
}): JSX.Element {
    const l = (): Loaded => props.loaded;
    const monday = (): string => mondayOf(props.where.at);
    const kids = (): Kid[] => kidsShown(l(), props.where);
    const weekend = (): boolean =>
        kids().some((k) => (calOf(l(), k)?.schoolDays ?? []).some((d) => d >= 6));
    const days = (): string[] => weekDays(monday(), weekend());
    const [over, setOver] = createSignal("");
    // a phone has no room for a column a day, so there the days stack with every child under each
    const narrow = matches("(max-width: 900px)");
    let dragging: Dragged | null = null;
    const dropOn = (kid: Kid, on: string): void => {
        const d = dragging;
        setOver("");
        dragging = null;
        if (!d || d.kid !== kid.id || d.from === on) return;
        const k = calOf(l(), kid);
        if (!k) return;
        if (dayState(l().cal, k, on).state !== "school") {
            props.onCard(
                <Note
                    title="That day is not a school day"
                    line={`${dayLong(on)} is not a day ${kid.name} works. Change their school days, or drop it on another day.`}
                    onClose={() => props.onCard(null)}
                />,
            );
            return;
        }
        if (on < l().cal.today) {
            props.onCard(
                <Note
                    title="That day has gone"
                    line="A lesson moves to today or to a day to come."
                    onClose={() => props.onCard(null)}
                />,
            );
            return;
        }
        const lesson = titleOf(l(), k.lanes.get(d.track)?.find((x) => x.on === d.from)?.lesson);
        const there = k.lanes.get(d.track)?.find((x) => x.on === on);
        void props.onWrite(
            acts.moveDay(writing(), kid.id, d.track, d.from, on),
            `${lesson} moved from ${dayShort(d.from)} to ${dayShort(on)} for ${kid.name}.${
                there
                    ? ` ${titleOf(l(), there.lesson)} takes ${dayShort(d.from)} in its place.`
                    : ""
            }`,
        );
    };
    const carried = (kid: Kid): CalCell[] => {
        const k = calOf(l(), kid);
        if (!k) return [];
        const out: CalCell[] = [];
        for (const [on, cells] of k.cells)
            if (on < monday() && on >= addDays(monday(), -28))
                for (const c of cells) if (c.state === "missed") out.push(c);
        return out.sort((a, b) => a.on.localeCompare(b.on));
    };
    return (
        <section class="gc-sheet" aria-label={`The week of ${dayLong(monday())}`}>
            <header class="gc-head">
                <div>
                    <p class="kicker">{weekWords(l().cal, monday())}</p>
                    <h2 class="gc-title">{`Week of ${dayMark(monday())}`}</h2>
                </div>
                <div class="gc-tools">
                    <Button second onClick={() => props.onMove({ at: addDays(monday(), -7) })}>
                        Last week
                    </Button>
                    <Button second onClick={() => props.onMove({ at: l().cal.today })}>
                        This week
                    </Button>
                    <Button second onClick={() => props.onMove({ at: addDays(monday(), 7) })}>
                        Next week
                    </Button>
                    <Show when={kids().length > 1}>
                        <Seg
                            legend="Laid out"
                            options={[
                                { value: "days", label: "Days across" },
                                { value: "kids", label: "Children across" },
                            ]}
                            value={props.where.lay}
                            onChange={(v) => props.onMove({ lay: v })}
                        />
                    </Show>
                </div>
            </header>
            <Show when={narrow()}>
                <div class="gc-stack">
                    <For each={days()}>
                        {(on) => (
                            <div class="gc-stack-day">
                                <DayHead
                                    loaded={l()}
                                    on={on}
                                    onOpen={() =>
                                        props.onCard(
                                            <DayCard
                                                loaded={l()}
                                                on={on}
                                                kid={
                                                    kids().length === 1 ? (kids()[0] ?? null) : null
                                                }
                                                onClose={() => props.onCard(null)}
                                                onWrite={props.onWrite}
                                            />,
                                        )
                                    }
                                />
                                <For each={kids()}>
                                    {(kid) => (
                                        <>
                                            <Show when={kids().length > 1}>
                                                <p class="gc-stack-who">{kid.name}</p>
                                            </Show>
                                            <Cellbox
                                                loaded={l()}
                                                kid={kid}
                                                on={on}
                                                over={over() === `${kid.id}|${on}`}
                                                onCard={props.onCard}
                                                onWrite={props.onWrite}
                                                onDragStart={(d) => {
                                                    dragging = d;
                                                }}
                                                onOver={(yes) =>
                                                    setOver(yes ? `${kid.id}|${on}` : "")
                                                }
                                                onDrop={() => dropOn(kid, on)}
                                            />
                                        </>
                                    )}
                                </For>
                            </div>
                        )}
                    </For>
                </div>
            </Show>
            <Show when={!narrow()}>
                <div
                    class="gc-grid"
                    classList={{ kidsAcross: props.where.lay === "kids" && kids().length > 1 }}
                    style={{
                        "--cols": String(
                            props.where.lay === "kids" && kids().length > 1
                                ? kids().length
                                : days().length,
                        ),
                    }}
                >
                    <div class="gc-corner" />
                    <Show
                        when={props.where.lay === "kids" && kids().length > 1}
                        fallback={
                            <For each={days()}>
                                {(on) => (
                                    <DayHead
                                        loaded={l()}
                                        on={on}
                                        onOpen={() =>
                                            props.onCard(
                                                <DayCard
                                                    loaded={l()}
                                                    on={on}
                                                    kid={
                                                        kids().length === 1
                                                            ? (kids()[0] ?? null)
                                                            : null
                                                    }
                                                    onClose={() => props.onCard(null)}
                                                    onWrite={props.onWrite}
                                                />,
                                            )
                                        }
                                    />
                                )}
                            </For>
                        }
                    >
                        <For each={kids()}>
                            {(kid) => (
                                <KidHead
                                    loaded={l()}
                                    kid={kid}
                                    monday={monday()}
                                    onCard={props.onCard}
                                    onWrite={props.onWrite}
                                />
                            )}
                        </For>
                    </Show>
                    <Show
                        when={props.where.lay === "kids" && kids().length > 1}
                        fallback={
                            <For each={kids()}>
                                {(kid) => (
                                    <>
                                        <KidHead
                                            loaded={l()}
                                            kid={kid}
                                            monday={monday()}
                                            onCard={props.onCard}
                                            onWrite={props.onWrite}
                                        />
                                        <For each={days()}>
                                            {(on) => (
                                                <Cellbox
                                                    loaded={l()}
                                                    kid={kid}
                                                    on={on}
                                                    over={over() === `${kid.id}|${on}`}
                                                    onCard={props.onCard}
                                                    onWrite={props.onWrite}
                                                    onDragStart={(d) => {
                                                        dragging = d;
                                                    }}
                                                    onOver={(yes) =>
                                                        setOver(yes ? `${kid.id}|${on}` : "")
                                                    }
                                                    onDrop={() => dropOn(kid, on)}
                                                />
                                            )}
                                        </For>
                                    </>
                                )}
                            </For>
                        }
                    >
                        <For each={days()}>
                            {(on) => (
                                <>
                                    <DayHead
                                        loaded={l()}
                                        on={on}
                                        onOpen={() =>
                                            props.onCard(
                                                <DayCard
                                                    loaded={l()}
                                                    on={on}
                                                    kid={null}
                                                    onClose={() => props.onCard(null)}
                                                    onWrite={props.onWrite}
                                                />,
                                            )
                                        }
                                    />
                                    <For each={kids()}>
                                        {(kid) => (
                                            <Cellbox
                                                loaded={l()}
                                                kid={kid}
                                                on={on}
                                                over={over() === `${kid.id}|${on}`}
                                                onCard={props.onCard}
                                                onWrite={props.onWrite}
                                                onDragStart={(d) => {
                                                    dragging = d;
                                                }}
                                                onOver={(yes) =>
                                                    setOver(yes ? `${kid.id}|${on}` : "")
                                                }
                                                onDrop={() => dropOn(kid, on)}
                                            />
                                        )}
                                    </For>
                                </>
                            )}
                        </For>
                    </Show>
                </div>
            </Show>
            <footer class="gc-foot">
                <div class="gc-carried">
                    <p class="kicker">Carried over</p>
                    <Show
                        when={kids().some((k) => carried(k).length)}
                        fallback={<p class="gc-quiet">Nothing carried over from earlier weeks.</p>}
                    >
                        <ul>
                            <For each={kids()}>
                                {(kid) => (
                                    <Show when={carried(kid).length}>
                                        <li>
                                            {`${kid.name}: ${names([
                                                ...new Set(
                                                    carried(kid).map((c) => titleOf(l(), c.lesson)),
                                                ),
                                            ])} still to do from earlier weeks (${plural(
                                                carried(kid).length,
                                                "day",
                                            )} not done). Nothing is lost: the plan picks up where it was, or move a lesson onto a day.`}
                                            <button
                                                type="button"
                                                class="link"
                                                onClick={() =>
                                                    props.onMove({ view: "year", who: kid.id })
                                                }
                                            >
                                                See what catching up takes
                                            </button>
                                        </li>
                                    </Show>
                                )}
                            </For>
                        </ul>
                    </Show>
                </div>
                <div class="gc-tools">
                    <Button second onClick={() => print()}>
                        Print this week
                    </Button>
                    <Button
                        onClick={() =>
                            props.onCard(
                                <DayCard
                                    loaded={l()}
                                    on={monday() < l().cal.today ? l().cal.today : monday()}
                                    kid={null}
                                    onClose={() => props.onCard(null)}
                                    onWrite={props.onWrite}
                                />,
                            )
                        }
                    >
                        A week went wrong
                    </Button>
                </div>
            </footer>
        </section>
    );
}

function DayHead(props: { loaded: Loaded; on: string; onOpen: () => void }): JSX.Element {
    const off = (): ReturnType<typeof offOn> => offOn(props.loaded.cal.off, null, props.on);
    return (
        <button
            type="button"
            class="gc-dayhead"
            classList={{
                today: props.on === props.loaded.cal.today,
                off: !!off(),
            }}
            aria-label={`${dayLong(props.on)}${props.on === props.loaded.cal.today ? ", today" : ""}${
                off() ? `, off: ${off()?.note ?? ""}` : ""
            }. Opens what can be done with the day.`}
            onClick={() => props.onOpen()}
        >
            <span class="gc-date">
                <b>{String(Number(props.on.slice(8)))}</b>
                <span>{weekdayShort(props.on)}</span>
            </span>
            <Show when={off()}>{(o) => <span class="gc-offnote">{o().note}</span>}</Show>
            <Show when={props.on === props.loaded.cal.today}>
                <span class="gc-todayword">today</span>
            </Show>
        </button>
    );
}

function KidHead(props: {
    loaded: Loaded;
    kid: Kid;
    monday: string;
    onCard: Open;
    onWrite: Write;
}): JSX.Element {
    const k = (): KidCalendar | undefined => calOf(props.loaded, props.kid);
    const daysText = (): string => {
        const days = k()?.schoolDays ?? [];
        return days.length === 5 && days[0] === 1 && days[4] === 5
            ? "Mon to Fri"
            : names(days.map((d) => (WEEKDAY_NAMES[d - 1] ?? "").slice(0, 3)));
    };
    return (
        <div class="gc-kidhead">
            <b>{props.kid.name}</b>
            <span>{gradeName(props.kid.grade)}</span>
            <button
                type="button"
                class="link"
                aria-label={`${props.kid.name}'s school days, ${daysText()}. Opens the days to change them.`}
                onClick={() =>
                    props.onCard(
                        <SchoolDaysCard
                            loaded={props.loaded}
                            kid={props.kid}
                            onClose={() => props.onCard(null)}
                            onWrite={props.onWrite}
                        />,
                    )
                }
            >
                {daysText()}
            </button>
        </div>
    );
}

function Cellbox(props: {
    loaded: Loaded;
    kid: Kid;
    on: string;
    over: boolean;
    onCard: Open;
    onWrite: Write;
    onDragStart: (d: Dragged) => void;
    onOver: (yes: boolean) => void;
    onDrop: () => void;
}): JSX.Element {
    const l = (): Loaded => props.loaded;
    const k = (): KidCalendar | undefined => calOf(l(), props.kid);
    const state = (): ReturnType<typeof dayState> | null => {
        const kid = k();
        return kid ? dayState(l().cal, kid, props.on) : null;
    };
    const cells = (): CalCell[] => k()?.cells.get(props.on) ?? [];
    const addedDay = (): { subject: string; minutes: number; note: string } | undefined =>
        l().cal.added.find((a) => a.kid === props.kid.id && a.on === props.on);
    return (
        <div
            class="gc-cell"
            classList={{
                off: state()?.state === "off",
                rest: state()?.state === "weekend",
                over: props.over,
            }}
            ref={(el) => {
                // a day takes a sticker dropped on it; the same move is on the lesson's own card
                el.addEventListener("dragover", (e) => {
                    if (props.on < l().cal.today) return;
                    e.preventDefault();
                    props.onOver(true);
                });
                el.addEventListener("dragleave", () => props.onOver(false));
                el.addEventListener("drop", (e) => {
                    e.preventDefault();
                    props.onDrop();
                });
            }}
        >
            <Show when={state()?.off}>
                {(o) => (
                    <p class="gc-tag off">
                        {o().kid ? `${props.kid.name} off: ${o().note}` : o().note}
                    </p>
                )}
            </Show>
            <Show when={state()?.state === "weekend"}>
                <p class="gc-quiet">no school</p>
            </Show>
            <Show when={state()?.state === "school"}>
                <ul class="gc-items">
                    <For each={cells()}>
                        {(c) => (
                            <Sticker
                                loaded={l()}
                                kid={props.kid}
                                cell={c}
                                onDrag={
                                    c.state === "planned" && c.on >= l().cal.today
                                        ? (e) => {
                                              e.dataTransfer?.setData("text/plain", c.track);
                                              props.onDragStart({
                                                  kid: props.kid.id,
                                                  track: c.track,
                                                  from: c.on,
                                              });
                                          }
                                        : undefined
                                }
                                onOpen={() =>
                                    props.onCard(
                                        <LessonCard
                                            loaded={l()}
                                            kid={props.kid}
                                            cell={c}
                                            onClose={() => props.onCard(null)}
                                            onWrite={props.onWrite}
                                        />,
                                    )
                                }
                            />
                        )}
                    </For>
                </ul>
                <Show when={!cells().length}>
                    <p class="gc-quiet">Nothing planned</p>
                </Show>
                <Tags loaded={l()} kid={props.kid} on={props.on} />
            </Show>
            <Show when={addedDay()}>
                {(a) => (
                    <p class="gc-tag added">{`${a().note}: ${Math.round(a().minutes / 6) / 10} h of ${a().subject}`}</p>
                )}
            </Show>
            <Show when={state()?.state !== "off"}>
                <button
                    type="button"
                    class="gc-more"
                    aria-label={`More for ${props.kid.name} on ${dayLong(props.on)}: a day off, a family day, or the plan moved on`}
                    onClick={() =>
                        props.onCard(
                            <DayCard
                                loaded={l()}
                                on={props.on}
                                kid={props.kid}
                                onClose={() => props.onCard(null)}
                                onWrite={props.onWrite}
                            />,
                        )
                    }
                >
                    +
                </button>
            </Show>
        </div>
    );
}

/** What the plan's own changes left on a day: a park, a shift, a track moved here or away. */
function Tags(props: { loaded: Loaded; kid: Kid; on: string }): JSX.Element {
    const mine = (): Change[] =>
        props.loaded.cal.changes.filter((c) => c.kid === props.kid.id || c.kid === null);
    const tags = (): string[] => {
        const out: string[] = [];
        for (const c of mine()) {
            if (c.op.op === "park" && c.op.from === props.on)
                out.push(
                    `${titleOf(props.loaded, c.op.lesson)} parked until ${dayMark(addDays(c.op.from, c.op.gapWeeks * 7))}`,
                );
            if (c.op.op === "shift" && c.op.from === props.on)
                out.push(`Plan moved on ${plural(c.op.weeks, "week")} from here`);
            if (c.op.op === "move" && c.op.to === props.on)
                out.push(`${trackTitle(c.op.track)} moved here from ${dayMark(c.op.from)}`);
            if (c.op.op === "move" && c.op.from === props.on)
                out.push(`${trackTitle(c.op.track)} moved to ${dayMark(c.op.to)}`);
        }
        return out;
    };
    return <For each={tags()}>{(t) => <p class="gc-tag">{t}</p>}</For>;
}

function Month(props: {
    loaded: Loaded;
    where: Where;
    onMove: (next: Partial<Where>) => void;
}): JSX.Element {
    const l = (): Loaded => props.loaded;
    const month = (): string => props.where.at.slice(0, 7);
    const kids = (): Kid[] => kidsShown(l(), props.where);
    const grid = createMemo(() => monthGrid(month()));
    const name = (): string =>
        new Date(`${month()}-01T00:00:00Z`).toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
        });
    const printedOn = (on: string): number =>
        on < l().printedSince
            ? 0
            : l().cal.printed.filter((p) => p.on >= addDays(on, -6) && p.on <= on).length;
    /** The first day of the family's year: days before it are faded rather than drawn as empty days. */
    const begins = (): string | null => l().cal.terms[0]?.from ?? null;
    /** The initial beside a strip is for telling children apart, so one child alone has none. */
    const initials = (): boolean => kids().length > 1;
    return (
        <section class="gc-sheet" aria-label={`${name()} on the calendar`}>
            <header class="gc-head">
                <div>
                    <p class="kicker">The month</p>
                    <h2 class="gc-title">{name()}</h2>
                </div>
                <div class="gc-tools">
                    <Button
                        second
                        onClick={() => props.onMove({ at: addDays(`${month()}-01`, -1) })}
                    >
                        The month before
                    </Button>
                    <Button second onClick={() => props.onMove({ at: l().cal.today })}>
                        This month
                    </Button>
                    <Button
                        second
                        onClick={() => props.onMove({ at: addDays(`${month()}-28`, 7) })}
                    >
                        The month after
                    </Button>
                    <Button second onClick={() => print()}>
                        Print this month
                    </Button>
                </div>
            </header>
            <ol class="gc-month squared">
                <For each={WEEKDAY_NAMES}>
                    {(d) => (
                        <li class="gc-month-name" aria-hidden="true">
                            {d.slice(0, 3)}
                        </li>
                    )}
                </For>
                <For each={grid()}>
                    {(on) => {
                        const inMonth = (): boolean => on.slice(0, 7) === month();
                        const off = (): ReturnType<typeof offOn> => offOn(l().cal.off, null, on);
                        const term = (): Term | null => termOn(l().cal, on);
                        const first = (): Term | undefined =>
                            l().cal.terms.find((t) => t.from === on);
                        const last = (): Term | undefined => l().cal.terms.find((t) => t.to === on);
                        const before = (): boolean => {
                            const b = begins();
                            return b !== null && on < b;
                        };
                        return (
                            <li
                                class="gc-month-day"
                                classList={{
                                    out: !inMonth(),
                                    today: on === l().cal.today,
                                    off: !!off(),
                                    weekend: weekdayNumber(on) >= 6,
                                    rest: !term() && !before(),
                                    before: before(),
                                }}
                            >
                                <button
                                    type="button"
                                    class="gc-month-in"
                                    aria-label={`${dayLong(on)}${off() ? `, off: ${off()?.note ?? ""}` : ""}. Opens its week.`}
                                    onClick={() => props.onMove({ view: "week", at: on })}
                                >
                                    <span class="gc-month-date">{Number(on.slice(8))}</span>
                                    <Show when={first() ?? last()}>
                                        {(t) => (
                                            <span class="gc-month-note">{`Term ${t().n} ${first() ? "begins" : "ends"}`}</span>
                                        )}
                                    </Show>
                                    <Show when={off()}>
                                        {(o) => <span class="gc-month-off">{o().note}</span>}
                                    </Show>
                                    <For each={kids()}>
                                        {(kid) => {
                                            const cells = (): CalCell[] =>
                                                (calOf(l(), kid)?.cells.get(on) ?? []).filter(
                                                    (c) => c.kind !== "off",
                                                );
                                            return (
                                                <Show when={cells().length}>
                                                    <span class="gc-strips">
                                                        <Show when={initials()}>
                                                            <span class="gc-strips-name">
                                                                {kid.name.slice(0, 1)}
                                                            </span>
                                                        </Show>
                                                        <For each={cells()}>
                                                            {(c) => (
                                                                <i
                                                                    class={`gc-strip ${c.state}`}
                                                                    style={{
                                                                        "--m": `var(--${subjectFacts(c.track).marker})`,
                                                                    }}
                                                                />
                                                            )}
                                                        </For>
                                                    </span>
                                                    <span class="sr">
                                                        {`${kid.name}: ${cells()
                                                            .map(
                                                                (c) =>
                                                                    `${titleOf(l(), c.lesson)}, ${CELL_LABEL[c.state].toLowerCase()}`,
                                                            )
                                                            .join("; ")}.`}
                                                    </span>
                                                </Show>
                                            );
                                        }}
                                    </For>
                                    <Show when={weekdayNumber(on) === 7 && printedOn(on)}>
                                        {(n) => (
                                            <span class="gc-month-printed">{`${plural(n(), "sheet")} printed`}</span>
                                        )}
                                    </Show>
                                </button>
                                <Show when={on === l().cal.today}>
                                    <Loop />
                                </Show>
                            </li>
                        );
                    }}
                </For>
            </ol>
        </section>
    );
}

/**
 * The pencil loop round today, laid over the day and out of the way of its press. Its box follows
 * the day's own shape as the window changes, since a phone's days are tall and a screen's are wide,
 * and the drawing keeps its proportions inside the box it is given.
 */
function Loop(): JSX.Element {
    const [box, setBox] = createSignal({ width: 5, height: 4 });
    return (
        <span
            class="gc-month-loop"
            aria-hidden="true"
            ref={(el) => {
                const fit = (): void => {
                    const r = el.getBoundingClientRect();
                    if (!r.width || !r.height) return;
                    setBox({
                        width: 5,
                        height: Math.max(2, Math.min(16, Math.round((5 * r.height) / r.width))),
                    });
                };
                const watch = new ResizeObserver(fit);
                watch.observe(el);
                onCleanup(() => watch.disconnect());
            }}
        >
            <Drawing class="gc-month-loop-in" id="dayloop" params={box()} seed={11} />
        </span>
    );
}

function Year(props: {
    loaded: Loaded;
    where: Where;
    onMove: (next: Partial<Where>) => void;
    onCard: Open;
    onWrite: Write;
}): JSX.Element {
    const l = (): Loaded => props.loaded;
    const kids = (): Kid[] => kidsShown(l(), props.where);
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
                                                                    props.onMove({
                                                                        view: "week",
                                                                        at: w,
                                                                        who: kid.id,
                                                                    })
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

function Changes(props: { loaded: Loaded; onWrite: Write }): JSX.Element {
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
                Every change is an event appended to the family's log, never an edit, and the
                calendar is folded from the log each time. A change put back is one more event, so
                nothing is ever rewritten.
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
