// Change the plan: the family's subjects, one sheet per child. Each subject a child does with the
// days a week it is worked, the lessons done and the one they are on, the subjects not planned yet,
// and the terms a world was made for that can still be chosen; the school days and the terms open
// the calendar's cards. A change is one event in the family's log, folded again the moment it is
// kept (.docs/parent-app.md, "The calendar and the plan"). The day, the lesson and the week are the
// calendar's alone.

import "./plan.css";
import {
    createEffect,
    createMemo,
    createResource,
    createSignal,
    createUniqueId,
    For,
    Index,
    on,
    Show,
    type JSX,
} from "solid-js";
import type { Draft } from "../../engine/answer";
import * as api from "../../engine/ui/api";
import { onThisComputer } from "../../engine/ui/device";
import { Dialog } from "../../engine/ui/dialog";
import { failureText } from "../../engine/ui/failure";
import { TextButton } from "../../engine/ui/fields";
import { Button } from "../../engine/ui/form";
import { grownRecord } from "../../engine/ui/grown";
import { Portrait } from "../../engine/ui/kids";
import { useLook, Waiting } from "../../engine/ui/page";
import { Postcard } from "../../engine/ui/postcard";
import { Link, search } from "../../engine/ui/router";
import { Say } from "../../engine/ui/say";
import { Near } from "../../engine/ui/viewport";
import type { Failure } from "../../engine/ui/wire";
import * as acts from "../../school/family/calendar";
import { catchUp, termOn, type KidCalendar, type Term } from "../../school/family/calendar";
import { laneOf } from "../../school/family/family";
import { familyName, gradeName } from "../../school/family/names";
import { dayOf } from "../../school/record/record";
import { subjectFacts, TRACK_IDS } from "../../school/tracks";
import type { GrownRecord } from "../../server/api";
import type { Kid } from "../../server/db/schema";
import { familyChanged } from "./bar";
import {
    calOf,
    Card,
    SchoolDaysCard,
    TermsCard,
    WEEKDAY_NAMES,
    writing,
    type Write,
} from "./cards";
import { dayLong, dayMark, names, placeName, plural } from "./grown";
import { readFamilyLog, type Loaded } from "./log";
import type { TermToChoose } from "./worlds";

const local = onThisComputer(location.hostname);

/** The paces a subject is offered at, which are the paces the plan lays days out for. */
const PACES: readonly { value: number; label: string; word: string }[] = [
    { value: 0, label: "Off", word: "off" },
    { value: 1, label: "1", word: "once a week" },
    { value: 2, label: "2", word: "twice a week" },
    { value: 3, label: "3", word: "three days a week" },
    { value: 4, label: "4", word: "four days a week" },
    { value: 5, label: "5", word: "every day" },
];

const wordOf = (perWeek: number): string =>
    PACES.find((p) => p.value === perWeek)?.word ?? `${perWeek} days a week`;

const capital = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** What the last change said, and what puts it back or shows its week. */
interface Said {
    line: string;
    kid: Kid | null;
    /** The events the change was written as, for Put it back; empty once it has been put back. */
    wrote: { id: string; kid: string | null }[];
}

export function Plan(): JSX.Element {
    const look = useLook();
    createEffect(() =>
        look({
            place: "meadow",
            wide: true,
        }),
    );
    const [loaded, { refetch }] = createResource(readFamilyLog);
    createEffect(on(familyChanged, () => void refetch(), { defer: true }));
    const [said, setSaid] = createSignal<Said | null>(null);
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
    const kids = (): Kid[] => got()?.view.kids ?? [];
    /** Appends what a change writes, then reads the log again so every sheet is folded from it. */
    const write = async (drafts: Draft[], line: string, kid: Kid | null = null): Promise<void> => {
        if (busy() || !drafts.length) return;
        setBusy(true);
        const r = await api.append(drafts);
        setBusy(false);
        setCard(null);
        if ("error" in r) {
            setSaid({ line: `The change was not kept. ${failureText(r, local)}`, kid, wrote: [] });
            return;
        }
        setSaid({ line, kid, wrote: drafts.map((d) => ({ id: d.id, kid: d.kid_id })) });
        void refetch();
    };
    const putBack = (s: Said): void => {
        void write(acts.putBack(writing(), s.wrote), `Put back: ${s.line}`, s.kid);
    };
    // `?who=<kid>` brings that child's sheet into view, as the home's `?kid=` does
    createEffect(
        on(
            () => [search(), got()] as const,
            ([q, l]) => {
                const who = new URLSearchParams(q).get("who");
                if (!l || !who) return;
                requestAnimationFrame(() =>
                    document.getElementById(sheetId(who))?.scrollIntoView({ block: "start" }),
                );
            },
        ),
    );
    return (
        <Show
            when={loaded.latest}
            fallback={<Waiting kicker="For grown-ups" title="Opening the plan" />}
        >
            <Show when={failed()}>
                {(f) => (
                    <Postcard note kicker="Change the plan" title="The plan did not load">
                        <Say
                            text={failureText(f(), local)}
                            action={{ label: "Try again", run: () => void refetch() }}
                        />
                    </Postcard>
                )}
            </Show>
            <Show when={got()}>
                {(l) => (
                    <div class="gp">
                        <Postcard
                            kicker={familyName(l().view.family.name)}
                            title="Change the plan"
                            lead="Which subjects each child does, and how many days a week. The days themselves, a lesson moved or parked, and a week that went wrong are on the calendar."
                        >
                            <Show when={said()}>
                                {(s) => (
                                    <div class="gp-said">
                                        <Say calm focus text={s().line} />
                                        <div class="gp-said-acts">
                                            <Show when={s().wrote.length}>
                                                <TextButton onClick={() => putBack(s())}>
                                                    Put it back
                                                </TextButton>
                                            </Show>
                                            <Show when={s().kid}>
                                                {(kid) => (
                                                    <Link
                                                        href={`/calendar?who=${encodeURIComponent(kid().id)}`}
                                                    >
                                                        {`See ${kid().name}'s week`}
                                                    </Link>
                                                )}
                                            </Show>
                                        </div>
                                    </div>
                                )}
                            </Show>
                        </Postcard>
                        <Show
                            when={kids().length}
                            fallback={
                                <p class="note">
                                    No children yet. Add the first one from the bar, and their plan
                                    is here.
                                </p>
                            }
                        >
                            <div
                                class="gp-sheets"
                                style={{ "--n": String(Math.min(kids().length, 3)) }}
                            >
                                {/* by position, not by row: the log is read again after every
                                    change and each read is new kid rows, and a sheet rebuilt then
                                    would drop the keyboard from whatever on it had it */}
                                <Index each={kids()}>
                                    {(kid) => (
                                        <Sheet
                                            loaded={l()}
                                            kid={kid()}
                                            kids={kids()}
                                            onWrite={write}
                                            onCard={setCard}
                                        />
                                    )}
                                </Index>
                            </div>
                        </Show>
                        <TermsNote loaded={l()} onWrite={write} onCard={setCard} />
                        <Show when={card()}>
                            {(c) => <Dialog onClose={() => setCard(null)}>{c()}</Dialog>}
                        </Show>
                    </div>
                )}
            </Show>
        </Show>
    );
}

type WriteFor = (drafts: Draft[], line: string, kid: Kid | null) => Promise<void>;
type Open = (card: JSX.Element | null) => void;

const sheetId = (kid: string): string => `plan-${kid}`;

/** "Mon to Fri" for a run of days, "Mon, Wed and Fri" otherwise, and the days in full for a label. */
function daysWords(days: readonly number[]): { short: string; long: string } {
    const sorted = [...days].sort((a, b) => a - b);
    const name = (d: number, n: number): string => (WEEKDAY_NAMES[d - 1] ?? "").slice(0, n);
    if (!sorted.length) return { short: "no days yet", long: "no days yet" };
    const run = sorted.every((d, i) => i === 0 || d === (sorted[i - 1] ?? 0) + 1);
    const first = sorted[0] ?? 1;
    const last = sorted[sorted.length - 1] ?? 1;
    if (run && sorted.length > 2)
        return {
            short: `${name(first, 3)} to ${name(last, 3)}`,
            long: `${name(first, 9)} to ${name(last, 9)}`,
        };
    return {
        short: names(sorted.map((d) => name(d, 3))),
        long: names(sorted.map((d) => name(d, 9))),
    };
}

/** One child: their subjects with the scale and the rail, the subjects not planned, and the worlds. */
function Sheet(props: {
    loaded: Loaded;
    kid: Kid;
    kids: readonly Kid[];
    onWrite: WriteFor;
    onCard: Open;
}): JSX.Element {
    const id = createUniqueId();
    const l = (): Loaded => props.loaded;
    const k = (): KidCalendar | undefined => calOf(l(), props.kid);
    const paceOf = (track: string): number =>
        k()?.tracks.find((t) => t.track === track)?.perWeek ?? 0;
    const lane = (track: string): string[] =>
        laneOf(l().pack.index.lessons, track, props.kid.grade);
    const tracks = createMemo(() => TRACK_IDS.filter((t) => lane(t).length));
    const on = (): string[] => tracks().filter((t) => paceOf(t) > 0);
    const off = (): string[] => tracks().filter((t) => paceOf(t) === 0);
    const days = (): { short: string; long: string } => daysWords(k()?.schoolDays ?? []);
    const write = (drafts: Draft[], line: string): Promise<void> =>
        props.onWrite(drafts, line, props.kid);
    return (
        <article id={sheetId(props.kid.id)} class="gp-sheet" aria-labelledby={id}>
            <span class="postcard-tape" aria-hidden="true" />
            <span class="postcard-tape r" aria-hidden="true" />
            <header class="gp-who">
                <div>
                    <h2 id={id} class="gp-name">
                        {props.kid.name}
                    </h2>
                    <p class="gp-line">
                        <span>{`${gradeName(props.kid.grade)} · works`}</span>
                        <TextButton
                            label={`${props.kid.name}'s school days, ${days().long}. Opens the days to change them.`}
                            onClick={() =>
                                props.onCard(
                                    <SchoolDaysCard
                                        loaded={l()}
                                        kid={props.kid}
                                        onClose={() => props.onCard(null)}
                                        onWrite={write}
                                    />,
                                )
                            }
                        >
                            {days().short}
                        </TextButton>
                    </p>
                </div>
                <Portrait kid={props.kid} kids={props.kids} />
            </header>
            <For each={on()}>
                {(track) => <Subject loaded={l()} kid={props.kid} track={track} onWrite={write} />}
            </For>
            <Show when={off().length}>
                <section class="gp-more" aria-labelledby={`${id}-more`}>
                    <h3 id={`${id}-more`} class="kicker">
                        Not planned this year
                    </h3>
                    <div class="gp-chips">
                        <For each={off()}>
                            {(track) => (
                                <button
                                    type="button"
                                    class="gp-chip"
                                    aria-label={`Start ${subjectFacts(track).title}, once a week`}
                                    onClick={() =>
                                        void write(
                                            [paceDraft(props.kid, track, 1)],
                                            `${subjectFacts(track).title} is once a week for ${props.kid.name} from now on. Set its days on the sheet.`,
                                        )
                                    }
                                >
                                    {subjectFacts(track).title}
                                    <span>{plural(lane(track).length, "lesson")}</span>
                                </button>
                            )}
                        </For>
                    </div>
                    <p class="note">
                        Press one to start it at once a week, then set its days here.
                    </p>
                </section>
            </Show>
            <Worlds loaded={l()} kid={props.kid} onWrite={write} onCard={props.onCard} />
        </article>
    );
}

/** The one event a change of pace is: the track on or off, at that many days a week. */
const paceDraft = (kid: Kid, track: string, perWeek: number): Draft => ({
    id: api.newId(),
    kid_id: kid.id,
    kind: "plan-changed",
    at: api.nowAt(),
    data: { op: { op: "track", track, on: perWeek > 0, perWeek } },
});

/** A subject on the sheet: its name over its marker, the scale, the rail and the fact line. */
function Subject(props: { loaded: Loaded; kid: Kid; track: string; onWrite: Write }): JSX.Element {
    const id = createUniqueId();
    const l = (): Loaded => props.loaded;
    const k = (): KidCalendar | undefined => calOf(l(), props.kid);
    const title = (): string => subjectFacts(props.track).title;
    const pace = (): number => k()?.tracks.find((t) => t.track === props.track)?.perWeek ?? 0;
    const lane = createMemo(() => laneOf(l().pack.index.lessons, props.track, props.kid.grade));
    /** The lessons of the lane with a finished sitting, as today's done count reads them. */
    const done = createMemo(() => {
        const lessons = new Set(lane());
        return new Set(
            l()
                .sittings.filter(
                    (s) => s.child === props.kid.id && s.finished && lessons.has(s.lesson),
                )
                .map((s) => s.lesson),
        );
    });
    const now = (): string | undefined => lane().find((id) => !done().has(id));
    const reaches = (): string | null => (k()?.lanes.get(props.track) ?? []).at(-1)?.on ?? null;
    /** The term today falls in, once it has begun: what the catch-up is worked out against. */
    const term = (): Term | null => {
        const t = termOn(l().cal, l().cal.today);
        return t && t.from <= l().cal.today ? t : null;
    };
    const catching = (): string | null => {
        const t = term();
        const kid = k();
        if (!t || !kid) return null;
        const inTerm = (kid.lanes.get(props.track) ?? [])
            .filter((d) => d.on >= t.from && d.on <= t.to)
            .flatMap((d) => (d.lesson ? [d.lesson] : []));
        const up = catchUp(l().cal, kid, t, props.track, [...new Set(inTerm)], pace());
        if (!up.over) return null;
        return `Runs ${plural(up.over, "day")} past the end of term ${t.n}. ${
            up.perWeek
                ? `${capital(wordOf(up.perWeek))} would fit the rest in by then.`
                : "Every school day is already used."
        }`;
    };
    return (
        <section
            class="gp-subj"
            style={{ "--m": `var(--${subjectFacts(props.track).marker})` }}
            aria-labelledby={id}
        >
            <div class="gp-subj-top">
                <h3 id={id} class="gp-subj-name">
                    {title()}
                </h3>
                <fieldset class="gp-scale">
                    <legend class="sr">{`${title()}, days a week`}</legend>
                    <For each={PACES}>
                        {(p) => (
                            <button
                                type="button"
                                classList={{ off: p.value === 0 }}
                                aria-pressed={pace() === p.value}
                                aria-label={`${title()}, ${p.word}`}
                                onClick={() =>
                                    void props.onWrite(
                                        [paceDraft(props.kid, props.track, p.value)],
                                        p.value
                                            ? `${title()} is ${p.word} for ${props.kid.name}. The days already done stay as they were.`
                                            : `${title()} is off for ${props.kid.name}. Nothing done is lost, and it can be turned on again.`,
                                    )
                                }
                            >
                                {p.label}
                            </button>
                        )}
                    </For>
                </fieldset>
            </div>
            <p class="gp-fact">
                <span class="gp-rail" aria-hidden="true">
                    <For each={lane()}>
                        {(lesson) => (
                            <i classList={{ done: done().has(lesson), now: lesson === now() }} />
                        )}
                    </For>
                </span>
                <span>
                    <b>{capital(wordOf(pace()))}</b>
                    {` · ${done().size} of ${lane().length} done`}
                    <Show when={reaches()}>{(r) => ` · last lesson ${dayMark(r())}`}</Show>
                </span>
            </p>
            <Show when={catching()}>{(c) => <p class="gp-catch">{c()}</p>}</Show>
        </section>
    );
}

/** How wide a world's picture is drawn on a term's card, in px. */
const WORLD_W = 160;

type WorldsModel = typeof import("./worlds");

/**
 * The terms with a world made for them and no work in them yet, in this grade and the next, one line
 * each with the choice on a card. A term with work in it keeps its world, since what the work made
 * is drawn there, and is not listed.
 */
function Worlds(props: { loaded: Loaded; kid: Kid; onWrite: Write; onCard: Open }): JSX.Element {
    const [read, { refetch }] = createResource(
        () => [props.kid.id, props.loaded] as const,
        async ([id]) => {
            const [record, model] = await Promise.all([grownRecord(id), import("./worlds")]);
            return "error" in record ? record : { record, model };
        },
    );
    const got = (): { record: GrownRecord; model: WorldsModel } | null => {
        const r = read.latest;
        return r && !("error" in r) ? r : null;
    };
    const failed = (): Failure | null => {
        const r = read.latest;
        return r && "error" in r ? r : null;
    };
    const terms = createMemo((): TermToChoose[] => {
        const g = got();
        return g ? g.model.openChoices(props.kid, g.record) : [];
    });
    const byGrade = (grade: number): TermToChoose[] => terms().filter((t) => t.grade === grade);
    const nameOf = (t: TermToChoose, world: string): string =>
        placeName({ name: t.options.find((o) => o.id === world)?.name ?? world });
    const madeFor = (t: TermToChoose): string[] =>
        t.options.filter((o) => !o.own).map((o) => placeName(o));
    const line = (t: TermToChoose): string => {
        const made = madeFor(t);
        return `${gradeName(t.grade)}, term ${t.term} is in ${nameOf(t, t.now)}. ${capital(names(made))} ${made.length > 1 ? "were" : "was"} made for it.`;
    };
    const open = (t: TermToChoose): void => {
        const g = got();
        if (!g) return;
        props.onCard(
            <WorldCard
                kid={props.kid}
                term={t}
                record={g.record}
                model={g.model}
                onClose={() => props.onCard(null)}
                onWrite={props.onWrite}
            />,
        );
    };
    const id = createUniqueId();
    return (
        <>
            <Show when={failed()}>
                {(f) => (
                    <Say
                        text={`${props.kid.name}'s worlds did not load. ${failureText(f(), local)}`}
                        action={{ label: "Try again", run: () => void refetch() }}
                    />
                )}
            </Show>
            <For each={[props.kid.grade, props.kid.grade + 1]}>
                {(grade) => (
                    <Show when={byGrade(grade).length}>
                        <section class="gp-worlds" aria-labelledby={`${id}-${grade}`}>
                            <h3 id={`${id}-${grade}`} class="kicker">
                                {grade === props.kid.grade
                                    ? "This year's worlds"
                                    : "Next year's worlds"}
                            </h3>
                            <For each={byGrade(grade)}>
                                {(t) => (
                                    <p>
                                        <span>{line(t)}</span>
                                        <TextButton
                                            label={`Choose the world for ${gradeName(t.grade)}, term ${t.term}`}
                                            onClick={() => open(t)}
                                        >
                                            Choose
                                        </TextButton>
                                    </p>
                                )}
                            </For>
                        </section>
                    </Show>
                )}
            </For>
        </>
    );
}

/** The card a term's world is chosen on: the worlds as pictures, the one in force pressed, and Keep this. */
function WorldCard(props: {
    kid: Kid;
    term: TermToChoose;
    record: GrownRecord;
    model: WorldsModel;
    onClose: () => void;
    onWrite: Write;
}): JSX.Element {
    const t = props.term;
    const [picked, setPicked] = createSignal(t.now);
    const when = `${gradeName(t.grade)}, term ${t.term}`;
    const draw =
        (world: string) =>
        async (host: HTMLElement): Promise<void> => {
            const { paintWorld } = await import("./where");
            await paintWorld(props.model.worldAs(props.kid, props.record, world), host, WORLD_W);
        };
    const keep = (): void => {
        const draft = props.model.chooseWorlds(
            writing(),
            props.kid,
            props.record,
            new Map([[props.model.termKey(t), picked()]]),
        );
        if (!draft) {
            props.onClose();
            return;
        }
        const name = placeName({ name: t.options.find((o) => o.id === picked())?.name ?? "" });
        void props.onWrite(
            [draft],
            `${props.kid.name}'s ${when.toLowerCase()} is in ${name} from now on. A term already worked in stays as it was.`,
        );
    };
    return (
        <Card
            kicker={`${props.kid.name}'s worlds`}
            title={when}
            lead="The term's own world, or one made for it. Once work is done there, the term keeps its world."
            onClose={props.onClose}
        >
            <fieldset class="gp-world-picks">
                <legend class="sr">{when}</legend>
                <For each={t.options}>
                    {(o, i) => (
                        <button
                            type="button"
                            class="gp-world-pick"
                            aria-pressed={picked() === o.id}
                            data-focus={i() === 0 ? "" : undefined}
                            onClick={() => setPicked(o.id)}
                        >
                            <Near class="gp-world-pic" draw={draw(o.id)} />
                            <span class="gp-world-name">{o.name}</span>
                            <span class="gp-world-sub">
                                {o.own ? "The term's own" : "Made for this term"}
                            </span>
                        </button>
                    )}
                </For>
            </fieldset>
            <div class="acts">
                <Button onClick={keep}>Keep this</Button>
            </div>
        </Card>
    );
}

/** The family's terms as one note under the sheets, with the calendar's card to change them. */
function TermsNote(props: { loaded: Loaded; onWrite: WriteFor; onCard: Open }): JSX.Element {
    const l = (): Loaded => props.loaded;
    const now = (): Term | null => termOn(l().cal, l().cal.today);
    const left = (): number => {
        const t = now();
        return t ? dayOf(t.to) - dayOf(l().cal.today) : 0;
    };
    return (
        <section class="gp-terms" aria-labelledby="gp-terms-title">
            <span class="postcard-tape" aria-hidden="true" />
            <span class="postcard-tape r" aria-hidden="true" />
            <h2 id="gp-terms-title" class="kicker">
                The terms
            </h2>
            <ul>
                <For each={l().cal.terms}>
                    {(t) => (
                        <li>
                            <b>{`Term ${t.n}`}</b>
                            {` ${dayMark(t.from)} to ${dayMark(t.to)}`}
                        </li>
                    )}
                </For>
            </ul>
            <div class="gp-terms-acts">
                <span>
                    {now()
                        ? `Today is in term ${now()?.n ?? 0}, ${plural(left(), "day")} from its end, ${dayLong(now()?.to ?? "")}.`
                        : "Today falls between terms."}
                </span>
                <TextButton
                    onClick={() =>
                        props.onCard(
                            <TermsCard
                                loaded={l()}
                                onClose={() => props.onCard(null)}
                                onWrite={(drafts, line) => props.onWrite(drafts, line, null)}
                            />,
                        )
                    }
                >
                    Change the dates
                </TextButton>
            </div>
        </section>
    );
}
