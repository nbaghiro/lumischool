// The grown-ups' home (.docs/parent-app.md, "The journal, for grown-ups", as the Grown-ups tab draws
// it): a hello card with today's lessons and what waits to be marked, and a card taped over the map
// for each child with today's lessons to open or print, the week, where they are on their map, what
// came back and the one thing to look at, and their view opened on this browser in one tap (flow 5).
// Under them, the family's own card: the children's view, the family PIN and the other families.

import "./home.css";
import type { SceneDrawer } from "../../engine/ui/scene";
import {
    createEffect,
    createMemo,
    createResource,
    createSignal,
    createUniqueId,
    For,
    lazy,
    mapArray,
    on,
    onCleanup,
    onMount,
    Show,
    untrack,
    type JSX,
} from "solid-js";
import type { Draft, Envelope } from "../../engine/answer";
import type { LessonFacts } from "../../engine/pack";
import type { Scene } from "../../engine/scene";
import * as api from "../../engine/ui/api";
import { grownRecord } from "../../engine/ui/grown";
import { Drawing } from "../../engine/ui/art";
import { onThisComputer } from "../../engine/ui/device";
import { failureText } from "../../engine/ui/failure";
import { Button } from "../../engine/ui/form";
import { Portrait } from "../../engine/ui/kids";
import { Postcard } from "../../engine/ui/postcard";
import { go, Link, search } from "../../engine/ui/router";
import { Say } from "../../engine/ui/say";
import { Near, whenNear } from "../../engine/ui/viewport";
import type { Failure } from "../../engine/ui/wire";
import { isParent } from "../../school/family/access";
import { KIND_LABEL } from "../../school/family/family";
import type { Attention, Pace } from "../../school/family/morning";
import { familyName, gradeName } from "../../school/family/names";
import { subjectFacts } from "../../school/tracks";
import { addDays, dayIn, fold, type Sitting } from "../../school/record/record";
import type { SheetBack } from "../../school/family/sheets";
import type { FamilyView, GrownRecord, Me, PackView } from "../../server/api";
import type { Kid } from "../../server/db/schema";
import type { ToWalk } from "./mark";
import type { Where } from "./where";
import {
    dayLong,
    dayMark,
    dayShort,
    DOT_WORDS,
    helloLine,
    paperFor,
    minuteOfDay,
    placeName,
    plannedOn,
    plural,
    waitingIn,
    weekdayShort,
    weekOf,
    type Planned,
} from "./grown";

const local = onThisComputer(location.hostname);

/** The marking layer, with the lesson sheet it draws, loaded the first time a grown-up marks. */
const Marking = lazy(() => import("./mark").then((m) => ({ default: m.Marking })));

/** A child's roll, with the worlds and their painter, loaded the first time a journal opens. */
const Journal = lazy(() => import("./journal").then((m) => ({ default: m.Journal })));

/** Which journals are open, kept on this device only. */
const OPEN_KEY = "lumischool.grownups.journals.v1";

const remembered = (): string[] => {
    try {
        const raw: unknown = JSON.parse(localStorage.getItem(OPEN_KEY) ?? "[]");
        return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string") : [];
    } catch {
        return [];
    }
};

const remember = (ids: readonly string[]): void => {
    try {
        localStorage.setItem(OPEN_KEY, JSON.stringify(ids));
    } catch {
        // storage is off, so the journals open closed next time
    }
};

/** How many journals stand side by side: as many columns as the children's cards have, at 400 px or more each. */
const fitting = (): number => (innerWidth > 1240 ? 3 : innerWidth > 700 ? 2 : 1);

/** Where the children's view opens, on the one origin. */
const KIDS = "/kids";

/** How wide a card's world picture is drawn when the card cannot say, in px. */
const WORLD_W = 200;

/** The family's pack, read once while the app is open. */
let packOnce: Promise<PackView | Failure> | null = null;
const packOf = async (): Promise<PackView | Failure> => {
    const p = await (packOnce ??= api.pack());
    if ("error" in p) packOnce = null;
    return p;
};

/** The drawer of a pack's scenes, with the drawings the scenes given name loaded first. */
const drawer = (of: readonly Scene[]): Promise<SceneDrawer> =>
    import("../../engine/ui/scene").then((m) => m.scenes(of));

type Read<T> = T | Failure | undefined;
const ok = <T extends object>(r: Read<T>): T | null => (r && !("error" in r) ? r : null);
const bad = <T extends object>(r: Read<T>): Failure | null => (r && "error" in r ? r : null);

const cardId = (kid: Pick<Kid, "id">): string => `kid-${kid.id}`;

const MORNING_ID = "gh-morning";
/** How much of the morning the card shows before the rest folds into a summary. */
const MORNING_ROWS = 6;

/**
 * How far back the card reads the family's own sittings, in days. Long enough for a term's habit to
 * show and short enough that a child who has got faster is not held to the autumn.
 */
const TIMED_BACK = 60;

/** The start a family is offered before their own days say otherwise. */
const MORNING_FROM_DEFAULT = "9:00";

/** The start this grown-up set by hand, kept on this device only. */
const START_KEY = "lumischool.grownups.morning.start.v1";

/** A clock as the time control wants it, and as the card writes it: "08:30" there, "8:30" here. */
const padded = (clock: string): string => (clock.length === 4 ? `0${clock}` : clock);
const tidy = (clock: string): string =>
    clock.startsWith("0") && clock.length === 5 ? clock.slice(1) : clock;

interface Row {
    /** Minutes from the start of the morning, so the clock follows the start a grown-up sets. */
    from: number;
    who: string;
    what: string;
    attention: Attention;
}

interface Order {
    /** The child the morning starts with, or null on a morning with nothing in it. */
    first: string | null;
    minutes: number;
    withYou: number;
    rows: Row[];
    /** The clock, from the scheduler, so the card reads a row's time without carrying the module. */
    at: (start: string, minutes: number) => string;
    /** How many of the morning's lessons were laid out on the family's own times, and how many on the table. */
    timed: number;
    guessed: number;
    /** What each child's own sittings say, subject by subject, for the words under the card. */
    paces: { child: string; subject: string; pace: Pace }[];
    /** The time the family's own days have begun at, or null while there are too few of them. */
    began: string | null;
    failure: Failure | null;
}

/** The sittings the card reads back, folded from the family's log as every other screen folds them. */
const sittingsIn = (
    events: readonly Envelope[],
    zone: string,
    facts: (id: string) => LessonFacts | undefined,
): Sitting[] => fold(events, zone, (id) => facts(id)?.subject ?? "maths").sittings;

/** The minute of the day each school day's first sitting began, which says when a morning starts. */
function startsIn(events: readonly Envelope[], zone: string): number[] {
    const first = new Map<string, number>();
    for (const e of events) {
        if (e.kind !== "sitting-began") continue;
        const day = dayIn(e.at, zone);
        const minute = minuteOfDay(e.at, zone);
        const had = first.get(day);
        if (had === undefined || minute < had) first.set(day, minute);
    }
    return [...first.values()];
}

/** The start a grown-up set on this device, or null for the family's own. */
const startKept = (): string | null => {
    try {
        return localStorage.getItem(START_KEY);
    } catch {
        return null;
    }
};

const keepStart = (clock: string | null): void => {
    try {
        if (clock === null) localStorage.removeItem(START_KEY);
        else localStorage.setItem(START_KEY, clock);
    } catch {
        // storage is off, so the start goes back to the family's own next time
    }
};

const toMorning = (): void => {
    const card = document.getElementById(MORNING_ID);
    if (!card) return;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    card.scrollIntoView({ block: "start", behavior: still ? "auto" : "smooth" });
};

/** Takes the page to the card the address names, once it is drawn. */
export function toKid(id: string | null): void {
    if (!id) return;
    requestAnimationFrame(() => {
        const card = document.getElementById(cardId({ id }));
        if (!card) return;
        const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
        card.scrollIntoView({ block: "start", behavior: still ? "auto" : "smooth" });
        card.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true });
    });
}

export function GrownHome(props: {
    me: Me;
    view: FamilyView;
    said: string;
    onAdd: () => void;
}): JSX.Element {
    const parent = (): boolean => isParent(props.me.members);
    const [pack] = createResource(packOf);
    const today = (): string => dayIn(new Date().toISOString(), props.view.family.time_zone);
    const facts = createMemo(() => {
        const p = ok(pack.latest);
        return new Map((p?.index.lessons ?? []).map((l) => [l.id, l]));
    });
    const records = createMemo(
        mapArray(
            () => props.view.kids.map((k) => k.id),
            (id) => {
                const [r, { refetch }] = createResource(() => grownRecord(id));
                return { id, r, refetch };
            },
        ),
    );
    const recordOf = (id: string): ReturnType<typeof records>[number] | undefined =>
        records().find((x) => x.id === id);
    const loaded = (): GrownRecord[] | null => {
        if (!ok(pack.latest)) return null;
        const all = records().map((x) => ok(x.r.latest));
        const got = all.filter((x): x is GrownRecord => x !== null);
        return got.length === all.length ? got : null;
    };
    const [walk, setWalk] = createSignal<ToWalk[] | null>(null);
    const [open, setOpen] = createSignal<string[]>([]);
    const known = (ids: readonly string[]): string[] =>
        ids.filter((id) => props.view.kids.some((k) => k.id === id));
    const openAll = (ids: readonly string[]): void => {
        const next = known(ids).slice(-fitting());
        setOpen(next);
        remember(next);
    };
    // the address may say which journals are open; otherwise this device remembers
    createEffect(
        on(search, (q) => {
            const asked = new URLSearchParams(q).get("journals");
            if (asked === null) return openAll(untrack(open).length ? untrack(open) : remembered());
            openAll(
                asked === "all"
                    ? props.view.kids.map((k) => k.id)
                    : asked.split(",").map((x) => x.trim()),
            );
        }),
    );
    const toggle = (kid: Kid): void => {
        const was = open().includes(kid.id);
        openAll(was ? open().filter((id) => id !== kid.id) : [...open(), kid.id]);
        if (!was) toKid(kid.id);
    };
    const [marked, setMarked] = createSignal("");
    const waitingFor = (kids: readonly Kid[]): ToWalk[] =>
        kids
            .flatMap((kid) => {
                const r = ok(recordOf(kid.id)?.r.latest);
                return r ? waitingIn(r).map((sheet) => ({ kid, sheet })) : [];
            })
            .sort((a, b) => a.sheet.on.localeCompare(b.sheet.on));
    const markAll = (): void => {
        setMarked("");
        setWalk(waitingFor(props.view.kids));
    };
    const waiting = (): number => (loaded() ?? []).reduce((n, r) => n + waitingIn(r).length, 0);
    const lessonsToday = (): number =>
        (loaded() ?? []).reduce(
            (n, r) => n + plannedOn(r, r.today, (id) => facts().get(id)).length,
            0,
        );
    const line = (): string => {
        const all = loaded();
        if (!all) return props.view.kids.length ? "Reading today's lessons." : helloLine([], 0, 0);
        return helloLine(
            props.view.kids.map((k) => k.name),
            lessonsToday(),
            waiting(),
        );
    };
    return (
        <div class="gh">
            <Postcard
                wide
                focus={!props.said}
                kicker={
                    <>
                        <span>{familyName(props.view.family.name)}</span>
                        <span aria-hidden="true"> · </span>
                        <span>{dayLong(today())}</span>
                    </>
                }
                title={props.me.user.name ? `Hello, ${props.me.user.name}` : "Hello"}
                lead={line()}
                links={
                    <div class="acts">
                        <Show when={parent() && waiting()}>
                            {(n) => (
                                <Button onClick={markAll}>
                                    {n() === 1 ? "Mark it" : "Mark them"}
                                </Button>
                            )}
                        </Show>
                        <Show when={lessonsToday() > 1}>
                            <Button second onClick={toMorning}>
                                The morning&apos;s order
                            </Button>
                        </Show>
                        <Show when={parent()}>
                            <Button second onClick={props.onAdd}>
                                {props.view.kids.length ? "Add another child" : "Add a child"}
                            </Button>
                        </Show>
                    </div>
                }
            >
                <Show when={props.said}>
                    <Say calm focus text={props.said} />
                </Show>
                <Show when={marked()}>
                    <Say calm focus text={marked()} />
                </Show>
                <Show when={bad(pack.latest)}>
                    {(f) => <Say text={`The lessons did not load. ${failureText(f(), local)}`} />}
                </Show>
            </Postcard>
            <Show when={props.view.kids.length}>
                <section class="gh-kids-part" aria-labelledby="gh-children">
                    <h2 id="gh-children" class="sr">
                        Children
                    </h2>
                    <ul class="gh-kids" style={{ "--n": String(props.view.kids.length) }}>
                        <For each={props.view.kids}>
                            {(kid, i) => (
                                <li>
                                    <KidCard
                                        kid={kid}
                                        kids={props.view.kids}
                                        i={i()}
                                        parent={parent()}
                                        pack={ok(pack.latest)}
                                        facts={(id) => facts().get(id)}
                                        record={recordOf(kid.id)?.r.latest}
                                        again={() => void recordOf(kid.id)?.refetch()}
                                        onMark={() => {
                                            setMarked("");
                                            setWalk(waitingFor([kid]));
                                        }}
                                        onSheet={(sheet, read) => {
                                            setMarked("");
                                            setWalk([{ kid, sheet, read }]);
                                        }}
                                        open={open().includes(kid.id)}
                                        onToggle={() => toggle(kid)}
                                        timeZone={props.view.family.time_zone}
                                        today={today()}
                                    />
                                </li>
                            )}
                        </For>
                    </ul>
                </section>
            </Show>
            <Show when={props.view.kids.length}>
                <MorningCard
                    records={loaded()}
                    facts={(id) => facts().get(id)}
                    pack={ok(pack.latest)}
                    timeZone={props.view.family.time_zone}
                />
            </Show>
            <Show when={walk()?.length ? walk() : null}>
                {(w) => (
                    <Show when={ok(pack.latest)}>
                        {(p) => (
                            <Marking
                                walk={w()}
                                pack={p()}
                                onMarked={(kid) => void recordOf(kid.id)?.refetch()}
                                onClose={(said) => {
                                    setWalk(null);
                                    setMarked(said);
                                }}
                            />
                        )}
                    </Show>
                )}
            </Show>
            <FamilyCard me={props.me} view={props.view} parent={parent()} />
        </div>
    );
}

/**
 * The morning's order: today's lessons for every child laid against one adult, so that nobody is
 * needed in two places at once (.docs/parent-app.md, "The jobs, in the order a family meets them").
 * The lessons are read only once the card comes near, since a lesson's file is about 130 kB and a
 * morning is several of them, and the scheduler comes with them so the first screen carries neither.
 * The lengths are the family's own: a child's finished sittings say how long their lessons take, and
 * the table of guesses in `school/family/morning.ts` is used only until there are enough of them. The
 * card says which it is showing, for the morning as a whole and for each child.
 */
function MorningCard(props: {
    records: GrownRecord[] | null;
    facts: (id: string) => LessonFacts | undefined;
    pack: PackView | null;
    timeZone: string;
}): JSX.Element {
    const [near, setNear] = createSignal(false);
    const [host, setHost] = createSignal<HTMLDivElement>();
    onMount(() => {
        const el = host();
        if (el) onCleanup(whenNear(el, () => setNear(true)));
    });
    const days = (): { kid: Kid; lessons: Planned[] }[] =>
        (props.records ?? [])
            .map((r) => ({ kid: r.kid, lessons: plannedOn(r, r.today, props.facts) }))
            .filter((d) => d.lessons.length);
    const [order] = createResource(
        ():
            | { digest: string; days: { kid: Kid; lessons: Planned[] }[]; zone: string; on: string }
            | false => {
            const p = props.pack;
            const d = days();
            const on = props.records?.[0]?.today;
            return near() && p && d.length && on
                ? { digest: p.pack, days: d, zone: props.timeZone, on }
                : false;
        },
        async ({ digest, days: today, zone, on }): Promise<Order> => {
            const [morn, read, log] = await Promise.all([
                import("../../school/family/morning"),
                Promise.all(
                    today.map((d) =>
                        Promise.all(d.lessons.map((p) => api.packLesson(digest, p.lesson.file))),
                    ),
                ),
                api.events(undefined, {
                    kinds: ["sitting-began", "sitting-ended"],
                    from: addDays(on, -TIMED_BACK),
                    to: on,
                }),
            ]);
            const { ATTENTION_LABEL, clockAt, morning, paceFor, shapeOf, startedAt } = morn;
            // a log that did not answer leaves the lengths as the table has them, and says so
            const sittings = log ? sittingsIn(log, zone, props.facts) : [];
            const began = log ? startsIn(log, zone) : [];
            const paces = new Map<string, Pace>();
            const m = morning(
                "0:00",
                today.flatMap((d, i) => {
                    const lessons = (read[i] ?? []).flatMap((l) => {
                        if ("error" in l) return [];
                        const shape = shapeOf(l, "medium");
                        const pace = paceFor(sittings, d.kid.id, shape.subject);
                        paces.set(`${d.kid.id}|${shape.subject}`, pace);
                        return [{ ...shape, took: pace.minutes }];
                    });
                    return lessons.length ? [{ child: d.kid.id, name: d.kid.name, lessons }] : [];
                }),
            );
            return {
                first: m.blocks[0]?.childName ?? null,
                minutes: m.minutes,
                withYou: m.withYou,
                rows: m.blocks.map((b) => ({
                    from: b.from,
                    who: `${b.childName}, ${b.title}`,
                    what: `${b.label} · ${ATTENTION_LABEL[b.attention]}`,
                    attention: b.attention,
                })),
                at: clockAt,
                timed: m.timed,
                guessed: m.guessed,
                paces: [...paces.entries()].map(([key, pace]) => {
                    const [kid, subject] = key.split("|");
                    return {
                        child: today.find((d) => d.kid.id === kid)?.kid.name ?? "",
                        subject: subjectFacts(subject ?? "maths").title.toLowerCase(),
                        pace,
                    };
                }),
                began: startedAt(began),
                failure: read.flat().find((l): l is Failure => "error" in l) ?? null,
            };
        },
    );
    const rows = (): Row[] => order.latest?.rows ?? [];
    const [set, setSet] = createSignal<string | null>(startKept());
    /** The start the card lays the clock from: the one set here, else the family's own, else nine. */
    const start = (): string => set() ?? order.latest?.began ?? MORNING_FROM_DEFAULT;
    const clock = (from: number): string => order.latest?.at(start(), from) ?? "";
    /** Where the start came from: their own days, or this device, and what their days say either way. */
    const startWords = (): string => {
        const began = order.latest?.began ?? null;
        if (set() === null)
            return began
                ? "Read from the days you have worked."
                : "Until enough days have been worked for your own to say.";
        if (began && began !== set()) return `Your mornings have begun at ${began}.`;
        return "Kept on this device.";
    };
    /** Which of the two the lengths came from, in the words the card uses under the order. */
    const from = (): string => {
        const o = order.latest;
        if (!o || !o.rows.length) return "";
        const own = o.paces.filter((p) => p.pace.minutes !== null);
        const guess = o.paces.filter((p) => p.pace.minutes === null);
        if (!own.length)
            return "The lengths are our guess: nobody has sat down enough times yet for their own to say.";
        const fewest = Math.min(...own.map((p) => p.pace.sittings));
        if (!guess.length)
            return `Every length here is the family's own, from the lessons the children have already sat down to, the fewest behind any of them being ${plural(fewest, "lesson")}.`;
        const named = own.map((p) => `${p.child}'s ${p.subject}`).join(", ");
        return `${named} are from their own lessons; the rest are our guess until there are enough sittings to say.`;
    };
    const lead = (): string => {
        const o = order.latest;
        if (!o) return "Reading today's lessons.";
        if (!o.rows.length) return "Nothing is planned for this morning.";
        return `You are needed for about ${o.withYou} of the next ${o.minutes} minutes. The order keeps you in one place at a time.`;
    };
    return (
        <div ref={setHost} id={MORNING_ID} class="gh-morning">
            <Show when={days().length}>
                <Postcard
                    wide
                    focus={false}
                    kicker="This morning"
                    title={
                        order.latest?.first
                            ? `Start at ${start()} with ${order.latest.first}`
                            : "The morning's order"
                    }
                    lead={lead()}
                    links={
                        <div class="acts">
                            <Link href="/print" class="btn second">
                                Print the day
                            </Link>
                        </div>
                    }
                >
                    <Show when={order.latest?.failure}>
                        {(f) => (
                            <Say
                                text={`Some of today's lessons did not load. ${failureText(f(), local)}`}
                            />
                        )}
                    </Show>
                    <Show when={rows().length}>
                        <div class="gh-start">
                            <label>
                                <span>Start at</span>
                                <input
                                    type="time"
                                    value={padded(start())}
                                    onChange={(e) => {
                                        const clock = e.currentTarget.value;
                                        setSet(clock ? tidy(clock) : null);
                                        keepStart(clock ? tidy(clock) : null);
                                    }}
                                />
                            </label>
                            <span class="gh-quiet">{startWords()}</span>
                        </div>
                        <ol class="gh-blocks">
                            <For each={rows().slice(0, MORNING_ROWS)}>
                                {(b) => <MorningRow row={b} time={clock(b.from)} />}
                            </For>
                        </ol>
                        <Show when={rows().length > MORNING_ROWS}>
                            <details class="gh-more">
                                <summary>
                                    {`The rest of the morning, ${rows().length - MORNING_ROWS} more`}
                                </summary>
                                <ol class="gh-blocks">
                                    <For each={rows().slice(MORNING_ROWS)}>
                                        {(b) => <MorningRow row={b} time={clock(b.from)} />}
                                    </For>
                                </ol>
                            </details>
                        </Show>
                        <p class="gh-quiet gh-guess">{from()}</p>
                    </Show>
                </Postcard>
            </Show>
        </div>
    );
}

function MorningRow(props: { row: Row; time: string }): JSX.Element {
    return (
        <li class={`gh-block ${props.row.attention}`}>
            <span class="gh-time">{props.time}</span>
            <span class="gh-bw">
                <b>{props.row.who}</b>
                <span>{props.row.what}</span>
            </span>
        </li>
    );
}

function KidCard(props: {
    kid: Kid;
    kids: readonly Kid[];
    i: number;
    parent: boolean;
    pack: PackView | null;
    facts: (id: string) => LessonFacts | undefined;
    record: Read<GrownRecord>;
    again: () => void;
    onMark: () => void;
    onSheet: (sheet: SheetBack, read: boolean) => void;
    open: boolean;
    onToggle: () => void;
    timeZone: string;
    today: string;
}): JSX.Element {
    const id = createUniqueId();
    const record = (): GrownRecord | null => (props.pack ? ok(props.record) : null);
    // the worlds are read only once there is a record to read them for
    const [whereRead] = createResource(
        () => {
            const r = record();
            return r && props.pack ? { r, lessons: props.pack.index.lessons } : false;
        },
        async ({ r, lessons }) => (await import("./where")).whereOf(r, props.kid, lessons),
    );
    const where = (): Where | null => whereRead.latest ?? null;
    return (
        <article
            id={cardId(props.kid)}
            class="gh-kid"
            classList={{ open: props.open }}
            data-clear=""
            aria-labelledby={id}
        >
            <span class="postcard-tape" aria-hidden="true" />
            <span class="postcard-tape r" aria-hidden="true" />
            <header class="gh-head">
                <div class="gh-who">
                    <h2 id={id} class="gh-title" tabindex={-1}>
                        {props.kid.name}
                    </h2>
                    <p class="gh-line">
                        {[
                            gradeName(props.kid.grade),
                            where() ? `${where()?.world.name}, term ${where()?.term}` : "",
                        ]
                            .filter(Boolean)
                            .join(" · ")}
                    </p>
                </div>
                <div class="gh-corner" aria-hidden="true">
                    <Drawing
                        class="postmark"
                        id="postmark"
                        params={{
                            place: where()?.world.name ?? "",
                            date: dayMark(props.today),
                            waves: 3,
                        }}
                        seed={901 + props.i * 13}
                    />
                    <Portrait kid={props.kid} kids={props.kids} />
                </div>
            </header>
            <Show when={props.parent}>
                <OpenView kid={props.kid} kids={props.kids} />
            </Show>
            <Show when={bad(props.record)}>
                {(f) => (
                    <Say
                        text={`${props.kid.name}'s week did not load. ${failureText(f(), local)}`}
                        action={{ label: "Try again", run: props.again }}
                    />
                )}
            </Show>
            <Show
                when={record()}
                fallback={
                    <Show when={!bad(props.record)}>
                        <p class="gh-quiet gh-reading">{`Reading ${props.kid.name}'s week.`}</p>
                    </Show>
                }
            >
                {(r) => (
                    <>
                        <Sec title="Today">
                            <Today
                                kid={props.kid}
                                planned={plannedOn(r(), r().today, props.facts)}
                                pack={props.pack}
                                timeZone={props.timeZone}
                                parent={props.parent}
                            />
                        </Sec>
                        <button
                            type="button"
                            class="gh-toggle"
                            classList={{ open: props.open }}
                            aria-expanded={props.open}
                            onClick={props.onToggle}
                        >
                            <b>
                                {props.open
                                    ? `Close ${props.kid.name}'s journal`
                                    : `Open ${props.kid.name}'s journal`}
                            </b>
                            <span>
                                {where()
                                    ? `Last week and today, in ${placeName(where()?.world ?? { name: "" })}`
                                    : "Last week and today"}
                            </span>
                        </button>
                        <Show when={props.open && props.pack}>
                            {(pack) => (
                                <Journal
                                    kid={props.kid}
                                    record={r()}
                                    pack={pack()}
                                    parent={props.parent}
                                    facts={props.facts}
                                    onMark={(sheet) => props.onSheet(sheet, false)}
                                    onRead={(sheet) => props.onSheet(sheet, true)}
                                />
                            )}
                        </Show>
                        <Sec title="This week">
                            <Week kid={props.kid} record={r()} facts={props.facts} />
                        </Sec>
                        <Sec title="On the map">
                            <Show
                                when={where()}
                                fallback={<p class="gh-quiet">Not on the map yet.</p>}
                            >
                                {(w) => (
                                    <div class="gh-map">
                                        <WorldPicture where={w()} />
                                        <div class="gh-mapwords">
                                            <For each={w().lines}>{(l) => <p>{l}</p>}</For>
                                        </div>
                                    </div>
                                )}
                            </Show>
                        </Sec>
                        <Sec title="Came back">
                            <CameBack record={r()} parent={props.parent} onMark={props.onMark} />
                        </Sec>
                        <Sec title="One thing to look at">
                            <Show
                                when={r().look}
                                fallback={
                                    <p class="gh-quiet">
                                        Nothing stands out. No mistake came up more than once in
                                        four weeks.
                                    </p>
                                }
                            >
                                {(look) => (
                                    <div class="gh-look">
                                        <p class="gh-quote">{`“${look().rule}”`}</p>
                                        <p class="gh-rests">
                                            {`Came up ${plural(look().times, "time")} on ${plural(look().days, "day")}, in ${props.facts(look().lesson)?.title ?? look().lesson}.`}
                                        </p>
                                    </div>
                                )}
                            </Show>
                        </Sec>
                    </>
                )}
            </Show>
        </article>
    );
}

function Sec(props: { title: string; children: JSX.Element }): JSX.Element {
    const id = createUniqueId();
    return (
        <section class="gh-sec" aria-labelledby={id}>
            <h3 id={id} class="kicker">
                {props.title}
            </h3>
            {props.children}
        </section>
    );
}

/**
 * Opens an independent child tab by default; using this tab is an explicit alternative.
 */
function OpenView(props: { kid: Kid; kids: readonly Kid[] }): JSX.Element {
    const [busy, setBusy] = createSignal(false);
    const [said, setSaid] = createSignal("");
    const open = async (): Promise<void> => {
        if (busy()) return;
        setBusy(true);
        setSaid("");
        const r = await api.openKidSession([props.kid.id]);
        if (r === true) {
            location.assign(KIDS);
            return;
        }
        setBusy(false);
        setSaid(failureText(r, local));
    };
    return (
        <div class="gh-open">
            <a
                class="gh-open-b"
                href={`/open-child?child=${encodeURIComponent(props.kid.id)}`}
                target="_blank"
                rel="noopener noreferrer"
            >
                <Portrait kid={props.kid} kids={props.kids} />
                <span>{`Open ${props.kid.name}'s view`}</span>
            </a>
            <p class="gh-small">Opens in a new tab. Your parent pages stay signed in.</p>
            <button type="button" class="link" disabled={busy()} onClick={() => void open()}>
                Use this tab instead
            </button>
            <Show when={said()}>
                <Say text={said()} />
            </Show>
        </div>
    );
}

/** A lesson's first drawing, which is how a grown-up knows it, drawn once it comes near. */
function LessonPicture(props: { lesson: LessonFacts; digest: string; class: string }): JSX.Element {
    const draw = async (host: HTMLElement): Promise<void> => {
        const first = props.lesson.first;
        if (!first) return;
        const scene = await api.packScene(props.digest, first);
        if ("error" in scene) return;
        const svg = (await drawer([scene.scene]))(host, scene.scene, { seed: 7 });
        svg.removeAttribute("width");
        svg.removeAttribute("height");
        host.replaceChildren(svg);
    };
    return <Near class={`${props.class} on-paper`} draw={draw} />;
}

/**
 * The world the child is in, as the map draws it and with no guide in it, beside the words that say
 * what has happened there. The painter and that world's drawings load only when the card comes near.
 */
function WorldPicture(props: { where: Where }): JSX.Element {
    const draw = async (host: HTMLElement): Promise<void> => {
        const { paintWorld } = await import("./where");
        await paintWorld(props.where.world, host, WORLD_W);
    };
    return <Near class="gh-world" draw={draw} />;
}

function Today(props: {
    kid: Kid;
    planned: Planned[];
    pack: PackView | null;
    timeZone: string;
    parent: boolean;
}): JSX.Element {
    const [printing, setPrinting] = createSignal<string | null>(null);
    const [said, setSaid] = createSignal("");
    const print = async (p: Planned, pack: PackView): Promise<void> => {
        if (printing()) return;
        setPrinting(p.lesson.id);
        setSaid("");
        const [lesson, { askedIn, levelIn }] = await Promise.all([
            api.packLesson(pack.pack, p.lesson.file),
            import("../../school/lessons"),
        ]);
        if ("error" in lesson) {
            setPrinting(null);
            setSaid(failureText(lesson, local));
            return;
        }
        const draft: Draft = {
            id: api.newId(),
            kid_id: props.kid.id,
            kind: "sheet-printed",
            at: api.nowAt(),
            data: {
                sheet: api.newId(),
                lesson: lesson.id,
                lessonHash: levelIn(lesson, "medium").hash,
                pack: pack.pack,
                paper: paperFor(props.timeZone),
                questions: askedIn(lesson, "medium")
                    .filter((a) => a.way !== "worked")
                    .map((a) => a.ref),
                grownUps: false,
            },
        };
        const r = await api.append([draft]);
        setPrinting(null);
        if ("error" in r) {
            setSaid(failureText(r, local));
            return;
        }
        go(`/explore/${encodeURIComponent(lesson.id)}?print=${encodeURIComponent(props.kid.id)}`);
    };
    return (
        <Show
            when={props.planned.length}
            fallback={<p class="gh-quiet">Nothing is planned today.</p>}
        >
            <ul class="gh-lessons">
                <For each={props.planned}>
                    {(p) => (
                        <li style={{ "--m": `var(--${p.marker})` }}>
                            <span class="gh-lpic">
                                <span class="gh-tape" aria-hidden="true" />
                                <Show when={props.pack}>
                                    {(pack) => (
                                        <LessonPicture
                                            lesson={p.lesson}
                                            digest={pack().pack}
                                            class="gh-lpic-in"
                                        />
                                    )}
                                </Show>
                            </span>
                            <span class="gh-lwords">
                                <b>{p.lesson.title}</b>
                                <span>
                                    {[p.title, p.kind === "lesson" ? "" : KIND_LABEL[p.kind]]
                                        .filter(Boolean)
                                        .join(" · ")}
                                </span>
                                <span class="gh-lacts">
                                    <Link
                                        href={`/explore/${encodeURIComponent(p.lesson.id)}`}
                                        class="link gh-act"
                                    >
                                        Open<span class="sr">{` ${p.lesson.title}`}</span>
                                    </Link>
                                    <Show when={props.parent && props.pack}>
                                        {(pack) => (
                                            <button
                                                type="button"
                                                class="link gh-act"
                                                aria-disabled={
                                                    printing() === p.lesson.id ? true : undefined
                                                }
                                                aria-label={`Print ${p.lesson.title} for ${props.kid.name}`}
                                                onClick={() => void print(p, pack())}
                                            >
                                                Print
                                            </button>
                                        )}
                                    </Show>
                                </span>
                            </span>
                        </li>
                    )}
                </For>
            </ul>
            <Show when={said()}>
                <Say text={said()} />
            </Show>
        </Show>
    );
}

function Week(props: {
    kid: Kid;
    record: GrownRecord;
    facts: (id: string) => LessonFacts | undefined;
}): JSX.Element {
    return (
        <ol class="gh-week" aria-label={`${props.kid.name}'s week`}>
            <For each={weekOf(props.record, props.facts)}>
                {(d) => (
                    <li class="gh-cell" classList={{ today: d.today }}>
                        <span class="gh-cell-day" aria-hidden="true">
                            {weekdayShort(d.on)}
                        </span>
                        <span class="gh-dots" aria-hidden="true">
                            <Show when={d.dots.length} fallback={<i class="gh-dot none" />}>
                                <For each={d.dots}>
                                    {(dot) => (
                                        <i
                                            class={`gh-dot ${dot.state}`}
                                            style={{ "--m": `var(--${dot.marker})` }}
                                        />
                                    )}
                                </For>
                            </Show>
                        </span>
                        <span class="sr">
                            {`${dayLong(d.on)}: ${
                                d.dots.length
                                    ? d.dots
                                          .map((x) => `${x.title}, ${DOT_WORDS[x.state]}`)
                                          .join("; ")
                                    : "nothing planned"
                            }.`}
                        </span>
                    </li>
                )}
            </For>
        </ol>
    );
}

function CameBack(props: {
    record: GrownRecord;
    parent: boolean;
    onMark: () => void;
}): JSX.Element {
    const waiting = (): ReturnType<typeof waitingIn> => waitingIn(props.record);
    const back = (): number => props.record.back.filter((s) => s.mode === "paper").length;
    return (
        <Show
            when={waiting().length}
            fallback={
                <p class="gh-quiet">
                    {back()
                        ? "Everything that came back on paper is marked."
                        : "Nothing came back on paper since last Monday."}
                </p>
            }
        >
            <p>
                {`${plural(waiting().length, "sheet")} came back on paper and ${
                    waiting().length === 1 ? "waits" : "wait"
                } to be marked, the oldest from ${dayShort(waiting()[0]?.on ?? props.record.today)}.`}
            </p>
            <Show when={props.parent}>
                <div class="acts">
                    <button type="button" class="btn second gh-small-btn" onClick={props.onMark}>
                        {waiting().length === 1 ? "Mark it" : "Mark them"}
                    </button>
                </div>
            </Show>
        </Show>
    );
}

/** The family's own card: the children's view and its PIN, and the other families a grown-up is in. */
function FamilyCard(props: { me: Me; view: FamilyView; parent: boolean }): JSX.Element {
    const id = createUniqueId();
    const others = (): Me["families"] =>
        props.me.families.filter((f) => f.family_id !== props.me.family.id);
    return (
        <Show when={props.parent || others().length}>
            <article class="postcard one gh-family" data-clear="" aria-labelledby={id}>
                <span class="postcard-tape" aria-hidden="true" />
                <span class="postcard-tape r" aria-hidden="true" />
                <div class="postcard-msg">
                    <p class="kicker">For grown-ups</p>
                    <h2 id={id} class="postcard-title">
                        {props.parent
                            ? "The children's view and the family PIN"
                            : "Your other families"}
                    </h2>
                    <Show when={props.parent}>
                        <p id="gh-view-note" class="note">
                            Opening a child's view puts your sign-in away on this browser, which
                            then shows only that child's pages. A grown-up comes back to this page
                            with the family PIN, as they were, or by signing in again, and can add a
                            brother or sister to the view from inside it with the PIN.
                        </p>
                        <p class="note">
                            {props.view.pin
                                ? "The family PIN is set."
                                : "The family has no PIN yet, so a grown-up leaves the children's view by signing in again."}
                        </p>
                    </Show>
                    <p class="note">
                        {props.parent
                            ? "The family PIN, the children's views open on your devices, and where you are signed in are on your account page."
                            : "The families you are in, and where you are signed in, are on your account page."}
                    </p>
                    <div class="acts">
                        <Link href="/account" class="btn second">
                            Your account
                        </Link>
                    </div>
                </div>
            </article>
        </Show>
    );
}
