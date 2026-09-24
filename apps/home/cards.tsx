import { Select } from "../../engine/ui/select";
import "./cards.css";
import type { SceneDrawer } from "../../engine/ui/scene";
import { createSignal, createUniqueId, For, Show, type JSX } from "solid-js";
import type { Draft, Weekday } from "../../engine/answer";
import type { LessonFacts } from "../../engine/pack";
import type { Scene } from "../../engine/scene";
import * as api from "../../engine/ui/api";
import { CloseX } from "../../engine/ui/dialog";
import { Button } from "../../engine/ui/form";
import { Postcard } from "../../engine/ui/postcard";

import { Say } from "../../engine/ui/say";
import { defaultTerms, type KidCalendar, type Term } from "../../school/family/calendar";
import * as acts from "../../school/family/calendar";

import { gradeName } from "../../school/family/names";

import { subjectFacts } from "../../school/tracks";
import type { Kid } from "../../server/db/schema";
import { dayLong, dayShort, names, plural } from "./grown";
import type { Loaded } from "./log";

/** The drawer of a pack's scenes, with the drawings the scenes given name loaded first. */
const drawer = (of: readonly Scene[]): Promise<SceneDrawer> =>
    import("../../engine/ui/scene").then((m) => m.scenes(of));

export type Write = (drafts: Draft[], line: string) => Promise<void>;

export const calOf = (l: Loaded, kid: Kid): KidCalendar | undefined => l.cal.kids.get(kid.id);

export const titleOf = (l: Loaded, lesson: string | undefined): string =>
    l.pack.index.lessons.find((x) => x.id === lesson)?.title ?? lesson ?? "";

export const factsOf = (l: Loaded, lesson: string | undefined): LessonFacts | undefined =>
    l.pack.index.lessons.find((x) => x.id === lesson);

export const trackTitle = (track: string): string => subjectFacts(track).title;

export const WEEKDAY_NAMES = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
] as const;

export const writing = (): acts.Writing => ({ newId: api.newId, at: api.nowAt() });

/** A lesson's first drawing into a host, as its sticker and its card both draw it. */
export async function drawFirst(
    loaded: Loaded,
    facts: LessonFacts | undefined,
    host: HTMLElement,
): Promise<void> {
    const first = facts?.first;
    if (!first) return;
    const scene = await api.packScene(loaded.pack.pack, first);
    if ("error" in scene) return;
    const svg = (await drawer([scene.scene]))(host, scene.scene, { seed: 5 });
    svg.removeAttribute("width");
    svg.removeAttribute("height");
    host.replaceChildren(svg);
}

export function Seg<V extends string>(props: {
    legend: string;
    options: readonly { value: V; label: string }[];
    /** Null while nothing is picked yet, as a card's choice starts. */
    value: V | null;
    onChange: (v: V) => void;
    /** The first choice takes the keyboard when the card opens. */
    first?: boolean;
}): JSX.Element {
    const id = createUniqueId();
    return (
        <fieldset class="gc-seg">
            <legend id={id}>{props.legend}</legend>
            <For each={props.options}>
                {(o, i) => (
                    <button
                        type="button"
                        class="btn second pick"
                        aria-pressed={o.value === props.value}
                        data-focus={props.first && i() === 0 ? "" : undefined}
                        onClick={() => props.onChange(o.value)}
                    >
                        {o.label}
                    </button>
                )}
            </For>
        </fieldset>
    );
}

/**
 * The card a change is made on: a postcard lifted off the calendar, closed by its X, by Escape or by
 * a click beside it. `picture` is drawn beside the title, the way the sticker that opened it draws
 * its lesson.
 */
export function Card(props: {
    kicker: string;
    title: string;
    picture?: JSX.Element;
    lead?: string;
    children: JSX.Element;
    onClose: () => void;
}): JSX.Element {
    return (
        <div class="gc-card">
            <Postcard
                focus={false}
                kicker={props.kicker}
                title={
                    <>
                        {props.picture}
                        <span>{props.title}</span>
                    </>
                }
                lead={props.lead}
            >
                <CloseX onClose={props.onClose} />
                <div class="gc-card-body">{props.children}</div>
            </Postcard>
        </div>
    );
}

type DayChange = "off" | "holiday" | "family" | "shift";

export function DayCard(props: {
    loaded: Loaded;
    on: string;
    kid: Kid | null;
    onClose: () => void;
    onWrite: Write;
}): JSX.Element {
    const l = (): Loaded => props.loaded;
    const [what, setWhat] = createSignal<DayChange | null>(null);
    const [why, setWhy] = createSignal("");
    const [until, setUntil] = createSignal(props.on);
    const [who, setWho] = createSignal(props.kid?.id ?? "all");
    const [note, setNote] = createSignal("");
    const [subject, setSubject] = createSignal("science");
    const [minutes, setMinutes] = createSignal("180");
    const [counts, setCounts] = createSignal(true);
    const [weeks, setWeeks] = createSignal("1");
    const [whose, setWhose] = createSignal(props.kid?.id ?? "all");
    const kidOf = (id: string): Kid | null => l().view.kids.find((k) => k.id === id) ?? null;
    const names = (ids: string): string => (ids === "all" ? "everyone" : (kidOf(ids)?.name ?? ""));
    /** A day off is one day; a holiday is the same, over more days. Both are `daysOff`. */
    const keepOff = (): void => {
        const last = what() === "holiday" ? until() || props.on : props.on;
        void props.onWrite(
            acts.daysOff(writing(), who() === "all" ? null : who(), props.on, last, why()),
            `${props.on === last ? dayLong(props.on) : `${dayShort(props.on)} to ${dayShort(last)}`} off for ${names(who())}: ${why().trim() || "A day off"}.`,
        );
    };
    const whoPicker = (): JSX.Element => (
        <Select
            aria-label="Who it is for"
            value={who()}
            onChange={(e) => setWho(e.currentTarget.value)}
        >
            <For each={l().view.kids}>{(k) => <option value={k.id}>{`For ${k.name}`}</option>}</For>
            <option value="all">For everyone</option>
        </Select>
    );
    return (
        <Card
            kicker={props.kid ? `${props.kid.name}, ${gradeName(props.kid.grade)}` : "The family"}
            title={dayLong(props.on)}
            onClose={props.onClose}
        >
            <Seg
                legend="What happened"
                options={[
                    { value: "off", label: "A day off" },
                    { value: "holiday", label: "A holiday" },
                    { value: "family", label: "A family day" },
                    // a shift moves every planned day from this one on by whole weeks, so it needs
                    // days still ahead to move; from a day gone by it would rewrite what happened
                    ...(props.on >= l().cal.today
                        ? [{ value: "shift" as const, label: "A week went wrong" }]
                        : []),
                ]}
                value={what()}
                onChange={setWhat}
                first
            />
            <Show when={what() === "off" || what() === "holiday"}>
                <p class="note">
                    {what() === "holiday"
                        ? "Nothing is planned on the days off, and what was planned there moves on to the next school day after them."
                        : "Nothing is planned on a day off, and what was planned there moves on to the next school day."}
                </p>
                <div class="gc-row">
                    <input
                        type="text"
                        aria-label="Reason"
                        placeholder="A cold, a visit, a birthday"
                        maxlength={80}
                        value={why()}
                        onInput={(e) => setWhy(e.currentTarget.value)}
                    />
                    <Show when={what() === "holiday"}>
                        <input
                            type="date"
                            aria-label="Until"
                            min={props.on}
                            value={until()}
                            onInput={(e) => setUntil(e.currentTarget.value)}
                        />
                    </Show>
                    {whoPicker()}
                    <Button onClick={keepOff}>Keep this</Button>
                </div>
            </Show>
            <Show when={what() === "family"}>
                <p class="note">
                    A trip, a museum, a day out: no lessons for anyone, and, if you say so, a day of
                    teaching in everyone's records.
                </p>
                <div class="gc-row">
                    <input
                        type="text"
                        aria-label="What it was"
                        placeholder="Where you went, in your words"
                        maxlength={80}
                        value={note()}
                        onInput={(e) => setNote(e.currentTarget.value)}
                    />
                    <Select
                        aria-label="Counts as"
                        value={subject()}
                        onChange={(e) => setSubject(e.currentTarget.value)}
                    >
                        <For
                            each={[
                                "science",
                                "history",
                                "art",
                                "music",
                                "geography",
                                "reading",
                                "maths",
                            ]}
                        >
                            {(s) => <option value={s}>{s[0]?.toUpperCase() + s.slice(1)}</option>}
                        </For>
                    </Select>
                    <Select
                        aria-label="For how long"
                        value={minutes()}
                        onChange={(e) => setMinutes(e.currentTarget.value)}
                    >
                        <For each={[60, 90, 120, 180, 240, 300]}>
                            {(m) => (
                                <option
                                    value={String(m)}
                                >{`${m / 60} ${m === 60 ? "hour" : "hours"}`}</option>
                            )}
                        </For>
                    </Select>
                </div>
                <label class="gc-check">
                    <input
                        type="checkbox"
                        checked={counts()}
                        onChange={(e) => setCounts(e.currentTarget.checked)}
                    />
                    <span>Count it as teaching in the records</span>
                </label>
                <div class="acts">
                    <Button
                        onClick={() =>
                            void props.onWrite(
                                acts.familyDay(
                                    writing(),
                                    l().view.kids.map((k) => k.id),
                                    props.on,
                                    note(),
                                    counts()
                                        ? { subject: subject(), minutes: Number(minutes()) }
                                        : null,
                                ),
                                `${dayLong(props.on)} is a family day: ${note().trim() || "A family day"}.${
                                    counts()
                                        ? ` It counts as ${plural(Number(minutes()) / 60, "hour")} of ${subject()} in everyone's records.`
                                        : ""
                                }`,
                            )
                        }
                    >
                        Keep this
                    </Button>
                </div>
            </Show>
            <Show when={what() === "shift"}>
                <p class="note">
                    {`Move every planned day from ${dayShort(props.on)} on by whole weeks, keeping its weekday. Nothing is lost, and nothing is marked as missed.`}
                </p>
                <div class="gc-row">
                    <Select
                        aria-label="By how many weeks"
                        value={weeks()}
                        onChange={(e) => setWeeks(e.currentTarget.value)}
                    >
                        <option value="1">One week</option>
                        <option value="2">Two weeks</option>
                    </Select>
                    <Select
                        aria-label="Whose plan"
                        value={whose()}
                        onChange={(e) => setWhose(e.currentTarget.value)}
                    >
                        <For each={l().view.kids}>
                            {(k) => <option value={k.id}>{`${k.name}'s plan`}</option>}
                        </For>
                        <option value="all">Everyone's plan</option>
                    </Select>
                    <Button
                        onClick={() =>
                            void props.onWrite(
                                acts.shiftPlan(
                                    writing(),
                                    whose() === "all" ? l().view.kids.map((k) => k.id) : [whose()],
                                    props.on,
                                    Number(weeks()),
                                ),
                                `Every day from ${dayShort(props.on)} moves on ${plural(Number(weeks()), "week")} for ${names(whose())}. Nothing is lost or marked as missed.`,
                            )
                        }
                    >
                        Move it on
                    </Button>
                </div>
            </Show>
        </Card>
    );
}

export function SchoolDaysCard(props: {
    loaded: Loaded;
    kid: Kid;
    onClose: () => void;
    onWrite: Write;
}): JSX.Element {
    const now = calOf(props.loaded, props.kid)?.schoolDays ?? [];
    const [days, setDays] = createSignal<Weekday[]>([...now]);
    const flip = (d: Weekday): void => {
        setDays(days().includes(d) ? days().filter((x) => x !== d) : [...days(), d]);
    };
    const [refused, setRefused] = createSignal("");
    return (
        <Card
            kicker={`${props.kid.name}, ${gradeName(props.kid.grade)}`}
            title={`${props.kid.name}'s school days`}
            lead="Each subject's days a week are spread over these. The days already done stay as they were, and the change starts from today."
            onClose={props.onClose}
        >
            <div class="gc-days">
                <For each={WEEKDAY_NAMES}>
                    {(name, i) => {
                        const d = (i() + 1) as Weekday;
                        return (
                            <button
                                type="button"
                                class="btn second pick"
                                aria-pressed={days().includes(d)}
                                aria-label={name}
                                onClick={() => flip(d)}
                            >
                                {name.slice(0, 3)}
                            </button>
                        );
                    }}
                </For>
            </div>
            <Show when={refused()}>
                <Say text={refused()} />
            </Show>
            <div class="acts">
                <Button
                    onClick={() => {
                        const made = acts.setSchoolDays(writing(), props.kid.id, days());
                        if ("refused" in made) {
                            setRefused(made.refused);
                            return;
                        }
                        void props.onWrite(
                            made.drafts,
                            `${props.kid.name} works on ${names(
                                [...days()]
                                    .sort((a, b) => a - b)
                                    .map((d) => WEEKDAY_NAMES[d - 1] ?? ""),
                            )} from now on. The days already done stay as they were.`,
                        );
                    }}
                >
                    Keep this
                </Button>
            </div>
        </Card>
    );
}

export function TermsCard(props: {
    loaded: Loaded;
    onClose: () => void;
    onWrite: Write;
}): JSX.Element {
    const [terms, setTerms] = createSignal<Term[]>(
        props.loaded.cal.terms.length
            ? props.loaded.cal.terms.map((t) => ({ ...t }))
            : defaultTerms(props.loaded.cal.today),
    );
    const [refused, setRefused] = createSignal("");
    const put = (n: number, side: "from" | "to", v: string): void => {
        setTerms(terms().map((t) => (t.n === n ? { ...t, [side]: v } : t)));
    };
    return (
        <Card
            kicker="The school year"
            title="When the terms fall"
            lead="The records count the days inside these, and the year reads them. A child's arrival in a world still comes from their lessons, not from the date."
            onClose={props.onClose}
        >
            <For each={terms()}>
                {(t) => (
                    <div class="gc-row">
                        <p class="gc-term-n">{`Term ${t.n}`}</p>
                        <input
                            type="date"
                            aria-label={`Term ${t.n} from`}
                            value={t.from}
                            onInput={(e) => put(t.n, "from", e.currentTarget.value)}
                        />
                        <input
                            type="date"
                            aria-label={`Term ${t.n} to`}
                            value={t.to}
                            onInput={(e) => put(t.n, "to", e.currentTarget.value)}
                        />
                    </div>
                )}
            </For>
            <Show when={refused()}>
                <Say text={refused()} />
            </Show>
            <div class="acts">
                <Button
                    onClick={() => {
                        const made = acts.setTerms(writing(), terms());
                        if ("refused" in made) {
                            setRefused(made.refused);
                            return;
                        }
                        void props.onWrite(made.drafts, "The terms' dates are set for the year.");
                    }}
                >
                    Keep this
                </Button>
            </div>
        </Card>
    );
}
