// The merged family calendar: routine and dated placements over the same saved family log.
import { Select } from "../../engine/ui/select";
import "./calendar.css";
import "./plan.css";
import "./calendar-planner.css";
import {
    createEffect,
    createMemo,
    createResource,
    createSignal,
    For,
    on,
    Show,
    type JSX,
} from "solid-js";
import type { Draft, PlanOp, SessionOp, Weekday } from "../../engine/answer";
import * as api from "../../engine/ui/api";
import { onThisComputer } from "../../engine/ui/device";
import { Dialog } from "../../engine/ui/dialog";
import { failureText } from "../../engine/ui/failure";
import { Button } from "../../engine/ui/form";
import { Portrait } from "../../engine/ui/kids";
import { useLook, Waiting } from "../../engine/ui/page";
import { Postcard } from "../../engine/ui/postcard";
import { go, Link, search } from "../../engine/ui/router";
import { Say } from "../../engine/ui/say";
import { Near } from "../../engine/ui/viewport";
import { isParent } from "../../school/family/access";
import {
    monthGrid,
    offOn,
    putBack,
    weekdayNumber,
    type CalCell,
} from "../../school/family/calendar";
import {
    laneOf,
    movesOf,
    pickWeekdays,
    sessionChanges,
    sessionKey,
    trackDays,
    turnOf,
} from "../../school/family/family";
import { addDays, mondayOf } from "../../school/record/record";
import { subjectFacts } from "../../school/tracks";
import type { Kid } from "../../server/db/schema";
import { familyChanged, openAdd } from "./bar";
import { Changes, Year } from "./calendar";
import {
    Card,
    DayCard,
    drawFirst,
    factsOf,
    SchoolDaysCard,
    Seg,
    TermsCard,
    titleOf,
    WEEKDAY_NAMES,
    writing,
} from "./cards";
import { dayLong, dayMark, plural } from "./grown";
import { readFamilyLog, type Loaded } from "./log";
import { Worlds } from "./plan";

type View = "week" | "month" | "year" | "subjects" | "lessons";
interface Slot {
    kid: Kid;
    cell: CalCell;
    op: SessionOp;
}
const editable = (c: CalCell): boolean => !["done", "late", "part"].includes(c.state);
const minutes = (subject: string): number =>
    subject === "maths" ? 25 : subject === "art" ? 30 : 20;
const label = (track: string): string => subjectFacts(track).title;
const marker = (track: string): string => `var(--${subjectFacts(track).marker})`;
const draft = (kid: string, op: PlanOp): Draft => ({
    id: api.newId(),
    kid_id: kid,
    kind: "plan-changed",
    at: api.nowAt(),
    data: { op },
});
function slots(l: Loaded, kid: Kid, day: string): Slot[] {
    const counts = new Map<string, number>();
    return (l.cal.kids.get(kid.id)?.cells.get(day) ?? [])
        .flatMap((cell): Slot[] => {
            if (!cell.lesson) return [];
            const slot = counts.get(cell.track) ?? 0;
            if (!cell.session) counts.set(cell.track, slot + 1);
            const id = sessionKey(cell.track, cell, slot);
            return [
                {
                    kid,
                    cell,
                    op: {
                        op: "session",
                        id,
                        track: cell.track,
                        source: cell.session ? (cell.source ?? null) : id,
                        onDay: cell.on,
                        lesson: cell.lesson,
                        kind: cell.kind === "off" ? "lesson" : cell.kind,
                        minutes: cell.plannedMinutes ?? minutes(cell.track),
                        order: cell.order ?? slot,
                        note: cell.session ? (cell.note ?? "") : "",
                        removed: false,
                    },
                },
            ];
        })
        .sort((a, b) => a.op.order - b.op.order);
}
function Tape(): JSX.Element {
    return (
        <>
            <span class="postcard-tape" aria-hidden="true" />
            <span class="postcard-tape r" aria-hidden="true" />
        </>
    );
}
function Field(props: { label: string; children: JSX.Element }): JSX.Element {
    return (
        <label class="cp-field field">
            <span>{props.label}</span>
            {props.children}
        </label>
    );
}
function Days(props: {
    value: readonly number[];
    allowed?: readonly number[];
    change: (days: Weekday[]) => void;
}): JSX.Element {
    return (
        <div class="cp-days">
            <For each={WEEKDAY_NAMES}>
                {(name, i) => {
                    const n = () => (i() + 1) as Weekday;
                    return (
                        <label>
                            <input
                                type="checkbox"
                                checked={props.value.includes(n())}
                                disabled={props.allowed && !props.allowed.includes(n())}
                                onChange={(e) =>
                                    props.change(
                                        e.currentTarget.checked
                                            ? [...(props.value as Weekday[]), n()].sort(
                                                  (a, b) => a - b,
                                              )
                                            : (props.value.filter((d) => d !== n()) as Weekday[]),
                                    )
                                }
                            />
                            {name.slice(0, 3)}
                        </label>
                    );
                }}
            </For>
        </div>
    );
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
    const loadedNow = (): Loaded => {
        const value = got();
        if (!value) throw new Error("The calendar has not loaded yet.");
        return value;
    };
    const firstKid = (): Kid => {
        const kid = kids()[0];
        if (!kid) throw new Error("Choose a child before planning a lesson.");
        return kid;
    };
    const [card, setCard] = createSignal<JSX.Element>();
    const [busy, setBusy] = createSignal(false),
        [error, setError] = createSignal(""),
        [said, setSaid] = createSignal("");
    const [weekends, setWeekends] = createSignal(false);
    const [last, setLast] = createSignal<Draft[]>([]),
        [redo, setRedo] = createSignal<Draft[]>([]);
    const query = () => new URLSearchParams(search());
    const view = (): View => {
        const v = query().get("view");
        return v === "month" || v === "year" || v === "subjects" || v === "lessons" ? v : "week";
    };
    const who = (): string =>
        got()?.view.kids.some((k) => k.id === query().get("who"))
            ? (query().get("who") ?? "all")
            : "all";
    const day = (): string => {
        const raw = query().get("at");
        const value = raw && /^\d{4}-\d{2}$/.test(raw) ? `${raw}-01` : raw;
        return value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value))
            ? value
            : (got()?.cal.today ?? "");
    };
    const kids = (): Kid[] =>
        got()?.view.kids.filter((k) => who() === "all" || k.id === who()) ?? [];
    const parent = (): boolean => !!got() && isParent(loadedNow().me.members);
    const move = (next: { view?: View; at?: string; who?: string }): void => {
        const q = new URLSearchParams({
            view: next.view ?? view(),
            at: next.at ?? day(),
            who: next.who ?? who(),
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
    const save = async (
        drafts: Draft[],
        line: string,
        shut = true,
        remember = true,
    ): Promise<boolean> => {
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
            if (remember) {
                setLast(drafts);
                setRedo([]);
            }
            setSaid(line);
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
        // The day editor also applies to individually placed sessions: keep them in For later.
        const parked = new Map<string, Draft>();
        for (const d of drafts)
            if (d.kind === "plan-changed" && d.data.op.op === "days-off") {
                const span = d.data.op;
                for (const kid of loadedNow().view.kids.filter(
                    (k) => !d.kid_id || k.id === d.kid_id,
                )) {
                    for (const op of sessionChanges(
                        movesOf(loadedNow().events, kid.id, loadedNow().me.family.time_zone),
                    )) {
                        if (
                            !op.removed &&
                            op.onDay &&
                            op.onDay >= span.from &&
                            op.onDay <= span.to
                        ) {
                            const cell = slots(loadedNow(), kid, op.onDay).find(
                                (s) => s.op.id === op.id,
                            );
                            if (cell && editable(cell.cell))
                                parked.set(
                                    `${kid.id}:${op.id}`,
                                    draft(kid.id, { ...op, onDay: null }),
                                );
                        }
                    }
                }
            }
        await save(
            [...drafts, ...parked.values()],
            parked.size ? `${line} Individually placed sessions are in For later.` : line,
        );
    };
    const undo = async (): Promise<void> => {
        const old = last();
        if (
            await save(
                putBack(
                    writing(),
                    old.map((d) => ({ id: d.id, kid: d.kid_id })),
                ),
                "Put the last change back.",
                true,
                false,
            )
        ) {
            setLast([]);
            setRedo(old);
        }
    };
    const reapply = async (): Promise<void> => {
        const again = redo().map((d) => ({ ...d, id: api.newId(), at: api.nowAt() }));
        if (await save(again, "Restored the change.", true, false)) {
            setLast(again);
            setRedo([]);
        }
    };
    const onDay = (d = day()): Slot[] =>
        got() ? kids().flatMap((k) => slots(loadedNow(), k, d)) : [];
    const selectDay = (d: string): void => {
        move({ at: d });
        if (matchMedia("(max-width:1100px)").matches)
            requestAnimationFrame(() =>
                document.getElementById("cp-day")?.scrollIntoView({ block: "start" }),
            );
    };
    const checkDate = (kid: string, date: string): string =>
        !date || date < loadedNow().cal.today
            ? "Choose today or a later day. Completed work stays in the record."
            : offOn(loadedNow().cal.off, kid, date)
              ? "This day is marked off. Choose another day, or undo its day off first."
              : "";
    const place = async (s: Slot, date: string | null): Promise<void> => {
        if (!editable(s.cell)) {
            setError("Finished or started work stays in the record.");
            return;
        }
        const problem = date ? checkDate(s.kid.id, date) : "";
        if (problem) {
            setError(problem);
            return;
        }
        await save(
            [draft(s.kid.id, { ...s.op, onDay: date, order: 1000 + onDay(date ?? day()).length })],
            date
                ? `Moved ${titleOf(loadedNow(), s.op.lesson)} to ${dayMark(date)}.`
                : "Set the session aside for later.",
        );
    };
    let dragging: Slot | undefined;
    const drop = (event: DragEvent, date: string, kid?: string): void => {
        event.preventDefault();
        const from = dragging;
        dragging = undefined;
        if (from && (!kid || from.kid.id === kid)) void place(from, date);
    };
    const openLesson = (s: Slot): void => open(<EditSession slot={s} />);
    const openAddLesson = (d = day(), kid = kids()[0]?.id): void => {
        if (kid) open(<AddLessons on={d} kid={kid} />);
    };
    const openRoutine = (kid: Kid, track: string, pace?: number): void =>
        open(<Routine kid={kid} track={track} pace={pace} />);
    function Sticker(props: { slot: Slot }): JSX.Element {
        const s = () => props.slot;
        return (
            <div
                class={`gc-sticker ${s().cell.state}`}
                draggable={parent() && editable(s().cell)}
                onDragStart={(e) => {
                    dragging = s();
                    e.dataTransfer?.setData("text/plain", s().op.id);
                }}
                onDragEnd={() => {
                    dragging = undefined;
                }}
            >
                <button
                    type="button"
                    class="gc-sticker-in"
                    style={{ "--m": marker(s().op.track) }}
                    onClick={() => openLesson(s())}
                >
                    <span class="gc-tape" aria-hidden="true" />
                    <Near
                        class="gc-pic on-paper"
                        draw={(host) =>
                            drawFirst(loadedNow(), factsOf(loadedNow(), s().op.lesson), host)
                        }
                    />
                    <span class="gc-sticker-title">{titleOf(loadedNow(), s().op.lesson)}</span>
                    <span class="gc-sticker-sub">
                        {label(s().op.track)} · {s().op.minutes} min planned
                    </span>
                    <span class="gc-tag">
                        {s().cell.state === "done"
                            ? "✓ Done"
                            : s().cell.state === "late"
                              ? "Done later"
                              : s().cell.state === "part"
                                ? "In progress"
                                : s().cell.session
                                  ? "Placed by you"
                                  : s().cell.state === "missed"
                                    ? "Not done"
                                    : "Planned"}
                    </span>
                </button>
            </div>
        );
    }
    function Week(): JSX.Element {
        const days = () =>
            Array.from({ length: 7 }, (_, i) => addDays(mondayOf(day()), i)).filter(
                (d) =>
                    weekends() ||
                    weekdayNumber(d) <= 5 ||
                    onDay(d).length ||
                    kids().some((k) =>
                        loadedNow().cal.kids.get(k.id)?.schoolDays.includes(weekdayNumber(d)),
                    ),
            );
        return (
            <div class="cp-week" style={{ "--days": String(days().length) }}>
                <For each={days()}>
                    {(d) => (
                        <section
                            class="cp-day"
                            classList={{
                                selected: d === day(),
                                today: d === loadedNow().cal.today,
                            }}
                            data-date={d}
                        >
                            <button
                                class="gc-dayhead"
                                type="button"
                                aria-pressed={d === day()}
                                aria-label={`Select ${dayLong(d)}`}
                                onClick={() => selectDay(d)}
                            >
                                <span class="gc-date">
                                    <b>{Number(d.slice(8))}</b>
                                    <span>{WEEKDAY_NAMES[weekdayNumber(d) - 1]?.slice(0, 3)}</span>
                                </span>
                                <Show when={d === loadedNow().cal.today}>
                                    <span class="gc-todayword">today</span>
                                </Show>
                            </button>
                            <For each={kids()}>
                                {(kid) => {
                                    const list = () => slots(loadedNow(), kid, d);
                                    const off = () => offOn(loadedNow().cal.off, kid.id, d);
                                    return (
                                        <div
                                            class="gc-cell cp-cell"
                                            classList={{ off: !!off() }}
                                            onDragOver={(e) => {
                                                if (
                                                    dragging?.kid.id === kid.id &&
                                                    d >= loadedNow().cal.today
                                                )
                                                    e.preventDefault();
                                            }}
                                            onDrop={(e) => drop(e, d, kid.id)}
                                        >
                                            <Show when={kids().length > 1}>
                                                <h3>{kid.name}</h3>
                                            </Show>
                                            <p class="cp-load">
                                                {plural(list().length, "session")} ·{" "}
                                                {list().reduce((n, s) => n + s.op.minutes, 0)} min
                                                planned
                                            </p>
                                            <Show when={off()}>
                                                <p class="note">{off()?.note || "Day off"}</p>
                                            </Show>
                                            <For each={list()}>{(s) => <Sticker slot={s} />}</For>
                                            <Show when={!list().length}>
                                                <p class="cp-empty">
                                                    {d < loadedNow().cal.today
                                                        ? "Nothing recorded"
                                                        : off()
                                                          ? "A day away from lessons"
                                                          : "Nothing planned"}
                                                </p>
                                            </Show>
                                            <Show when={parent() && d >= loadedNow().cal.today}>
                                                <button
                                                    type="button"
                                                    class="gc-more"
                                                    aria-label={`Add a lesson for ${kid.name} on ${dayLong(d)}`}
                                                    disabled={!!off()}
                                                    onClick={() => openAddLesson(d, kid.id)}
                                                >
                                                    +
                                                </button>
                                            </Show>
                                        </div>
                                    );
                                }}
                            </For>
                        </section>
                    )}
                </For>
            </div>
        );
    }
    function Month(): JSX.Element {
        return (
            <div class="gc-month">
                <For each={WEEKDAY_NAMES}>
                    {(name) => <div class="gc-month-name">{name.slice(0, 3)}</div>}
                </For>
                <For each={monthGrid(day().slice(0, 7))}>
                    {(d) => (
                        <div
                            class="gc-month-day cp-month-day"
                            classList={{
                                selected: d === day(),
                                weekend: weekdayNumber(d) > 5,
                                out: d.slice(0, 7) !== day().slice(0, 7),
                            }}
                            onDragOver={(e) => {
                                if (dragging) e.preventDefault();
                            }}
                            onDrop={(e) => drop(e, d)}
                        >
                            <button
                                type="button"
                                class="gc-month-in"
                                aria-label={`Open ${dayLong(d)}`}
                                onClick={() => selectDay(d)}
                            >
                                <b class="gc-month-date">{Number(d.slice(8))}</b>
                                <Show when={d === loadedNow().cal.today}>
                                    <span class="gc-todayword">today</span>
                                </Show>
                                <For each={kids()}>
                                    {(kid) => (
                                        <span class="gc-strips">
                                            <Show when={kids().length > 1}>
                                                <span class="gc-strips-name">{kid.name}</span>
                                            </Show>
                                            <For each={slots(loadedNow(), kid, d)}>
                                                {(s) => (
                                                    <span
                                                        class={`gc-strip ${s.cell.state}`}
                                                        style={{ "--m": marker(s.op.track) }}
                                                        title={`${titleOf(loadedNow(), s.op.lesson)} · ${s.cell.state}`}
                                                    />
                                                )}
                                            </For>
                                        </span>
                                    )}
                                </For>
                                <Show when={onDay(d).length}>
                                    <span class="cp-load">
                                        {plural(onDay(d).length, "session")}
                                    </span>
                                </Show>
                                <Show
                                    when={kids().some((k) => offOn(loadedNow().cal.off, k.id, d))}
                                >
                                    <span class="gc-month-note">Day off</span>
                                </Show>
                            </button>
                        </div>
                    )}
                </For>
            </div>
        );
    }
    function Detail(): JSX.Element {
        return (
            <aside id="cp-day" class="cp-detail">
                <Tape />
                <p class="kicker">The day in detail</p>
                <h2 class="gc-title">{dayLong(day())}</h2>
                <p class="note">
                    {who() === "all" ? "Everyone" : kids()[0]?.name} ·{" "}
                    {onDay().reduce((n, s) => n + s.op.minutes, 0)} minutes planned
                </p>
                <For each={onDay()}>
                    {(s, index) => (
                        <div class="cp-agenda">
                            <span class="gp-subj-name" style={{ "--m": marker(s.op.track) }}>
                                {label(s.op.track)}
                            </span>
                            <button
                                type="button"
                                class="cp-agenda-title"
                                onClick={() => openLesson(s)}
                            >
                                {titleOf(loadedNow(), s.op.lesson)}
                            </button>
                            <p class="note">
                                {s.kid.name} · {s.op.minutes} min · {s.cell.state}
                            </p>
                            <Show when={s.op.note}>
                                <p class="cp-note">{s.op.note}</p>
                            </Show>
                            <Show when={parent() && editable(s.cell)}>
                                <div class="acts">
                                    <button
                                        type="button"
                                        class="link"
                                        onClick={() => openLesson(s)}
                                    >
                                        Move / edit
                                    </button>
                                    <button
                                        type="button"
                                        class="link"
                                        disabled={busy()}
                                        onClick={() => void place(s, null)}
                                    >
                                        For later
                                    </button>
                                    <button
                                        type="button"
                                        class="link"
                                        disabled={busy() || index() === 0}
                                        onClick={() => {
                                            const previous = onDay()
                                                .slice(0, index())
                                                .reverse()
                                                .find(
                                                    (x) =>
                                                        x.kid.id === s.kid.id && editable(x.cell),
                                                );
                                            if (previous)
                                                void save(
                                                    [
                                                        draft(s.kid.id, {
                                                            ...s.op,
                                                            order: previous.op.order - 1,
                                                        }),
                                                    ],
                                                    "Changed the lesson order.",
                                                );
                                        }}
                                    >
                                        Earlier
                                    </button>
                                </div>
                            </Show>
                        </div>
                    )}
                </For>
                <Show when={!onDay().length}>
                    <p class="cp-empty">
                        {day() < loadedNow().cal.today
                            ? "Nothing recorded on this day."
                            : "An open day. Add a lesson or leave room for something else."}
                    </p>
                </Show>
                <Show when={parent() && day() >= loadedNow().cal.today}>
                    <Button onClick={() => openAddLesson()}>Add a lesson</Button>
                    <button
                        type="button"
                        class="link"
                        onClick={() =>
                            open(
                                <DayCard
                                    loaded={loadedNow()}
                                    on={day()}
                                    kid={who() === "all" ? null : (kids()[0] ?? null)}
                                    onClose={close}
                                    onWrite={write}
                                />,
                            )
                        }
                    >
                        Day off / family activity
                    </button>
                    <button type="button" class="link" onClick={() => open(<Bulk />)}>
                        Copy day / move week
                    </button>
                </Show>
            </aside>
        );
    }
    function EditSession(props: { slot: Slot }): JSX.Element {
        const s = props.slot;
        const [date, setDate] = createSignal(
                s.cell.on < loadedNow().cal.today ? loadedNow().cal.today : s.cell.on,
            ),
            [duration, setDuration] = createSignal(s.op.minutes),
            [note, setNote] = createSignal(s.op.note),
            [remove, setRemove] = createSignal(false);
        const submit = async (repeat = false): Promise<void> => {
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
                [
                    draft(s.kid.id, {
                        ...s.op,
                        id: repeat ? api.newId() : s.op.id,
                        source: repeat ? null : s.op.source,
                        onDay: date(),
                        kind: repeat ? "practice" : s.op.kind,
                        minutes: duration(),
                        note: note(),
                    }),
                ],
                repeat ? "Added another practice session." : "Updated the session.",
            );
        };
        return (
            <Card
                kicker={`${s.kid.name} · ${label(s.op.track)}`}
                title={titleOf(loadedNow(), s.op.lesson)}
                onClose={close}
            >
                <p class="note">
                    {editable(s.cell)
                        ? "Move this session without replacing another lesson."
                        : "Work already started stays in the record. You can add another practice session."}
                </p>
                <div class="cp-fields">
                    <Field label="Date">
                        <input
                            type="date"
                            value={date()}
                            min={loadedNow().cal.today}
                            onInput={(e) => setDate(e.currentTarget.value)}
                        />
                    </Field>
                    <Field label="Minutes planned">
                        <input
                            type="number"
                            value={duration()}
                            min="5"
                            max="240"
                            onInput={(e) => setDuration(e.currentTarget.valueAsNumber)}
                        />
                    </Field>
                </div>
                <Field label="Parent note">
                    <textarea
                        value={note()}
                        maxlength="2000"
                        onInput={(e) => setNote(e.currentTarget.value)}
                    />
                </Field>
                <Show when={parent()}>
                    <div class="acts">
                        <Show when={editable(s.cell)}>
                            <Button busy={busy()} onClick={() => void submit()}>
                                Save changes
                            </Button>
                        </Show>
                        <Button second busy={busy()} onClick={() => void submit(true)}>
                            Add practice
                        </Button>
                    </div>
                    <Show when={editable(s.cell)}>
                        <div class="acts">
                            <button
                                type="button"
                                class="link"
                                disabled={busy()}
                                onClick={() => void place(s, null)}
                            >
                                Set aside for later
                            </button>
                            <button type="button" class="link" onClick={() => setRemove(true)}>
                                Remove session
                            </button>
                        </div>
                        <Show when={remove()}>
                            <div class="cp-impact">
                                <p>
                                    Remove this session from the plan? The lesson and completed work
                                    remain available.
                                </p>
                                <Button
                                    busy={busy()}
                                    onClick={() =>
                                        void save(
                                            [draft(s.kid.id, { ...s.op, removed: true })],
                                            "Removed the session from the plan.",
                                        )
                                    }
                                >
                                    Remove this session
                                </Button>
                            </div>
                        </Show>
                    </Show>
                </Show>
                <Link href={`/explore/${encodeURIComponent(s.op.lesson)}`}>Open the lesson</Link>
            </Card>
        );
    }
    function Library(props: { choose: (id: string) => void; grade: number }): JSX.Element {
        const [find, setFind] = createSignal(""),
            [grade, setGrade] = createSignal(String(props.grade)),
            [subject, setSubject] = createSignal("all");
        createEffect(() => setGrade(String(props.grade)));
        const found = () =>
            loadedNow().pack.index.lessons.filter(
                (l) =>
                    (grade() === "all" || l.grade === Number(grade())) &&
                    (subject() === "all" || l.subject === subject()) &&
                    `${l.title} ${label(l.subject)}`.toLowerCase().includes(find().toLowerCase()),
            );
        return (
            <>
                <div class="cp-filters">
                    <Field label="Find a lesson">
                        <input
                            type="search"
                            value={find()}
                            placeholder="Search lessons"
                            onInput={(e) => setFind(e.currentTarget.value)}
                        />
                    </Field>
                    <Field label="Grade">
                        <Select value={grade()} onChange={(e) => setGrade(e.currentTarget.value)}>
                            <option value="all">All grades</option>
                            <For
                                each={[
                                    ...new Set(loadedNow().pack.index.lessons.map((l) => l.grade)),
                                ].sort((a, b) => a - b)}
                            >
                                {(g) => <option value={g}>Grade {g}</option>}
                            </For>
                        </Select>
                    </Field>
                    <Field label="Subject">
                        <Select
                            value={subject()}
                            onChange={(e) => setSubject(e.currentTarget.value)}
                        >
                            <option value="all">All subjects</option>
                            <For
                                each={[
                                    ...new Set(
                                        loadedNow().pack.index.lessons.map((l) => l.subject),
                                    ),
                                ]}
                            >
                                {(s) => <option value={s}>{label(s)}</option>}
                            </For>
                        </Select>
                    </Field>
                </div>
                <p class="note">{plural(found().length, "lesson")}</p>
                <div class="cp-library">
                    <For each={found()}>
                        {(l) => (
                            <article class="cp-library-row">
                                <Near
                                    class="gc-pic on-paper"
                                    draw={(host) => drawFirst(loadedNow(), l, host)}
                                />
                                <div>
                                    <h3>{l.title}</h3>
                                    <p class="note">
                                        {label(l.subject)} · Grade {l.grade} · Unit {l.unit}
                                    </p>
                                </div>
                                <a
                                    href={`/explore/${encodeURIComponent(l.id)}`}
                                    target="_blank"
                                    rel="noopener"
                                >
                                    Preview
                                </a>
                                <Show when={parent()}>
                                    <Button second busy={busy()} onClick={() => props.choose(l.id)}>
                                        Add
                                    </Button>
                                </Show>
                            </article>
                        )}
                    </For>
                    <Show when={!found().length}>
                        <p class="note">No lessons match. Try another subject, grade or search.</p>
                    </Show>
                </div>
            </>
        );
    }
    function AddLessons(props: { on: string; kid: string; picked?: string }): JSX.Element {
        const [kid, setKid] = createSignal(props.kid),
            [date, setDate] = createSignal(
                props.on < loadedNow().cal.today ? loadedNow().cal.today : props.on,
            );
        const add = async (id: string): Promise<void> => {
            const problem = checkDate(kid(), date());
            if (problem) {
                setError(problem);
                return;
            }
            const lesson = factsOf(loadedNow(), id);
            if (!lesson) return;
            const op: SessionOp = {
                op: "session",
                id: api.newId(),
                source: null,
                track: lesson.subject,
                lesson: id,
                onDay: date(),
                kind: "lesson",
                minutes: minutes(lesson.subject),
                order: 1000,
                note: "",
                removed: false,
            };
            await save([draft(kid(), op)], `Added ${lesson.title}.`);
        };
        return (
            <Card
                kicker="The calendar"
                title="Add to the day"
                lead="Choose a lesson to add to the day."
                onClose={close}
            >
                <div class="cp-fields">
                    <Field label="Child">
                        <Select value={kid()} onChange={(e) => setKid(e.currentTarget.value)}>
                            <For each={loadedNow().view.kids}>
                                {(k) => <option value={k.id}>{k.name}</option>}
                            </For>
                        </Select>
                    </Field>
                    <Field label="Lesson date">
                        <input
                            type="date"
                            value={date()}
                            min={loadedNow().cal.today}
                            onInput={(e) => setDate(e.currentTarget.value)}
                        />
                    </Field>
                </div>
                <Show
                    when={props.picked}
                    fallback={
                        <Library
                            grade={loadedNow().view.kids.find((k) => k.id === kid())?.grade ?? 1}
                            choose={(id) => void add(id)}
                        />
                    }
                >
                    <h3>{titleOf(loadedNow(), props.picked)}</h3>
                    <Button busy={busy()} onClick={() => void add(props.picked ?? "")}>
                        Add this lesson
                    </Button>
                </Show>
                <Button second disabled={busy()} onClick={close}>
                    Cancel
                </Button>
            </Card>
        );
    }
    function Routine(props: { kid: Kid; track: string; pace?: number }): JSX.Element {
        const l = loadedNow(),
            k = l.cal.kids.get(props.kid.id);
        if (!k) throw new Error("This child’s calendar has not loaded.");
        const latest = movesOf(l.events, props.kid.id, l.me.family.time_zone)
            .flatMap((m) => (m.op.op === "routine" && m.op.track === props.track ? [m.op] : []))
            .at(-1);
        const normal = k.tracks.find((t) => t.track === props.track)?.perWeek ?? 0;
        const initial =
            props.pace === undefined
                ? (latest?.weekdays ?? pickWeekdays(k.schoolDays, normal, turnOf(props.track)))
                : pickWeekdays(k.schoolDays, props.pace, turnOf(props.track));
        const [days, setDays] = createSignal<Weekday[]>(initial as Weekday[]),
            [count, setCount] = createSignal(latest?.sessions ?? 1),
            [from, setFrom] = createSignal(day() < l.cal.today ? l.cal.today : day());
        const op = (): PlanOp => ({
            op: "routine",
            track: props.track,
            from: from(),
            weekdays: days().filter((d) => k.schoolDays.includes(d)),
            sessions: count(),
        });
        const preview = createMemo(() => {
            const moves = movesOf(l.events, props.kid.id, l.me.family.time_zone);
            const lane = laneOf(l.pack.index.lessons, props.track, props.kid.grade);
            const after = trackDays({
                track: props.track,
                lessons: lane,
                perWeek: normal,
                start: k.start,
                today: l.cal.today,
                until: addDays(l.cal.today, 90),
                moves: [...moves, { on: l.cal.today, op: op() }],
                sittings: l.sittings.filter(
                    (s) => s.child === props.kid.id && lane.includes(s.lesson),
                ),
            });
            return after.filter((d) => d.on >= from()).length;
        });
        return (
            <Card
                kicker={`${props.kid.name} · ${label(props.track)}`}
                title="Shape the usual week"
                onClose={close}
            >
                <h3>Which days?</h3>
                <Days value={days()} allowed={k.schoolDays} change={setDays} />
                <div class="cp-fields">
                    <Field label="Sessions on each chosen day">
                        <input
                            type="number"
                            min="1"
                            max="3"
                            value={count()}
                            onInput={(e) => setCount(e.currentTarget.valueAsNumber)}
                        />
                    </Field>
                    <Field label="Starting from">
                        <input
                            type="date"
                            min={l.cal.today}
                            value={from()}
                            onInput={(e) => setFrom(e.currentTarget.value)}
                        />
                    </Field>
                </div>
                <div class="cp-impact">
                    <h3>What will change</h3>
                    <p>
                        {days().length
                            ? `${days().length * count()} sessions a week.`
                            : "This subject will be paused."}{" "}
                        {preview()} sessions projected in the next 90 days from this date. Lessons
                        you placed yourself and finished work stay where they are.
                    </p>
                </div>
                <Button
                    busy={busy()}
                    onClick={() => {
                        if (
                            !from() ||
                            from() < l.cal.today ||
                            days().some((d) => !k.schoolDays.includes(d)) ||
                            !Number.isInteger(count()) ||
                            count() < 1 ||
                            count() > 3
                        ) {
                            setError("Choose today or later, and 1 to 3 sessions per day.");
                            return;
                        }
                        void save(
                            [draft(props.kid.id, op())],
                            `Changed ${props.kid.name}’s ${label(props.track).toLowerCase()} routine.`,
                        );
                    }}
                >
                    Apply routine
                </Button>
            </Card>
        );
    }
    function Subjects(): JSX.Element {
        return (
            <div class="cp-subjects">
                <For each={kids()}>
                    {(kid) => (
                        <section class="gp-sheet">
                            <header class="gp-who">
                                <div>
                                    <h2 class="gp-name">{kid.name}</h2>
                                    <p class="note">Grade {kid.grade}</p>
                                </div>
                                <Portrait kid={kid} kids={loadedNow().view.kids} />
                            </header>
                            <For
                                each={[
                                    ...new Set(
                                        loadedNow().pack.index.lessons.map((l) => l.subject),
                                    ),
                                ].filter(
                                    (s) =>
                                        laneOf(loadedNow().pack.index.lessons, s, kid.grade).length,
                                )}
                            >
                                {(track) => {
                                    const rule = () =>
                                        movesOf(
                                            loadedNow().events,
                                            kid.id,
                                            loadedNow().me.family.time_zone,
                                        )
                                            .flatMap((m) =>
                                                m.op.op === "routine" &&
                                                m.op.track === track &&
                                                m.op.from <= loadedNow().cal.today
                                                    ? [m.op]
                                                    : [],
                                            )
                                            .at(-1);
                                    const pace = () =>
                                        rule()?.weekdays.length ??
                                        loadedNow()
                                            .cal.kids.get(kid.id)
                                            ?.tracks.find((t) => t.track === track)?.perWeek ??
                                        0;
                                    const lane = () =>
                                        laneOf(loadedNow().pack.index.lessons, track, kid.grade);
                                    const done = () =>
                                        new Set(
                                            loadedNow()
                                                .sittings.filter(
                                                    (s) => s.child === kid.id && s.finished,
                                                )
                                                .map((s) => s.lesson),
                                        );
                                    return (
                                        <section class="gp-subj" style={{ "--m": marker(track) }}>
                                            <div class="gp-subj-top">
                                                <h3 class="gp-subj-name">{label(track)}</h3>
                                                <fieldset class="gp-scale">
                                                    <legend class="sr">
                                                        {label(track)}, days a week
                                                    </legend>
                                                    <For
                                                        each={Array.from(
                                                            {
                                                                length:
                                                                    (loadedNow().cal.kids.get(
                                                                        kid.id,
                                                                    )?.schoolDays.length ?? 5) + 1,
                                                            },
                                                            (_, i) => i,
                                                        )}
                                                    >
                                                        {(n) => (
                                                            <button
                                                                type="button"
                                                                aria-pressed={pace() === n}
                                                                disabled={!parent()}
                                                                aria-label={`${kid.name}, ${label(track)}, ${n} days a week`}
                                                                onClick={() =>
                                                                    openRoutine(kid, track, n)
                                                                }
                                                            >
                                                                {n || "Off"}
                                                            </button>
                                                        )}
                                                    </For>
                                                </fieldset>
                                            </div>
                                            <p class="gp-fact">
                                                <span class="gp-rail" aria-hidden="true">
                                                    <For each={lane()}>
                                                        {(id) => (
                                                            <i
                                                                classList={{ done: done().has(id) }}
                                                            />
                                                        )}
                                                    </For>
                                                </span>
                                                {lane().filter((id) => done().has(id)).length} of{" "}
                                                {lane().length} done ·{" "}
                                                {pace() * (rule()?.sessions ?? 1)} sessions a week
                                            </p>
                                            <Show when={parent()}>
                                                <button
                                                    type="button"
                                                    class="link"
                                                    onClick={() => openRoutine(kid, track)}
                                                >
                                                    Choose days & sessions
                                                </button>
                                            </Show>
                                        </section>
                                    );
                                }}
                            </For>
                            <Show when={parent()}>
                                <Worlds
                                    loaded={loadedNow()}
                                    kid={kid}
                                    onWrite={write}
                                    onCard={open}
                                />
                            </Show>
                        </section>
                    )}
                </For>
            </div>
        );
    }
    function Later(): JSX.Element {
        const parked = () =>
            kids().flatMap((k) =>
                sessionChanges(movesOf(loadedNow().events, k.id, loadedNow().me.family.time_zone))
                    .filter((s) => !s.onDay && !s.removed)
                    .map((op) => ({ kid: k, op })),
            );
        return (
            <Card kicker="The calendar" title="For later" onClose={close}>
                <p class="note">Choose a date to bring a session back to the plan.</p>
                <For each={parked()}>
                    {(s) => (
                        <div class="cp-later">
                            <h3>{titleOf(loadedNow(), s.op.lesson)}</h3>
                            <p>{s.kid.name}</p>
                            <Button
                                second
                                onClick={() =>
                                    openLesson({
                                        ...s,
                                        cell: {
                                            on: day(),
                                            weekday: "",
                                            kind: s.op.kind,
                                            lesson: s.op.lesson,
                                            state: "planned",
                                            minutes: 0,
                                            track: s.op.track,
                                        },
                                    })
                                }
                            >
                                Choose a date
                            </Button>
                        </div>
                    )}
                </For>
                <Show when={!parked().length}>
                    <p class="note">Nothing set aside for now.</p>
                </Show>
            </Card>
        );
    }
    function School(): JSX.Element {
        return (
            <Card kicker="The calendar" title="School days & breaks" onClose={close}>
                <For each={kids()}>
                    {(kid) => (
                        <div class="cp-later">
                            <h3>{kid.name}</h3>
                            <p class="note">
                                {loadedNow()
                                    .cal.kids.get(kid.id)
                                    ?.schoolDays.map((d) => WEEKDAY_NAMES[d - 1])
                                    .join(", ")}
                            </p>
                            <Button
                                second
                                onClick={() =>
                                    open(
                                        <SchoolDaysCard
                                            loaded={loadedNow()}
                                            kid={kid}
                                            onClose={close}
                                            onWrite={write}
                                        />,
                                    )
                                }
                            >
                                Change {kid.name}’s days
                            </Button>
                        </div>
                    )}
                </For>
                <Button
                    second
                    onClick={() =>
                        open(
                            <DayCard
                                loaded={loadedNow()}
                                on={day()}
                                kid={null}
                                onClose={close}
                                onWrite={write}
                            />,
                        )
                    }
                >
                    Plan a break or family day
                </Button>
            </Card>
        );
    }
    function Bulk(): JSX.Element {
        const [mode, setMode] = createSignal("copy"),
            [date, setDate] = createSignal(addDays(day(), 7));
        const eligible = () =>
            mode() === "copy"
                ? onDay().filter((s) => editable(s.cell))
                : kids()
                      .flatMap((k) =>
                          Array.from({ length: 7 }, (_, i) => addDays(mondayOf(day()), i)).flatMap(
                              (d) => slots(loadedNow(), k, d),
                          ),
                      )
                      .filter((s) => editable(s.cell) && s.cell.on >= loadedNow().cal.today);
        return (
            <Card kicker="The calendar" title="Make room in the week" onClose={close}>
                <Field label="Change">
                    <Select value={mode()} onChange={(e) => setMode(e.currentTarget.value)}>
                        <option value="copy">Copy this day’s unfinished lessons</option>
                        <option value="move">Move this week forward one week</option>
                    </Select>
                </Field>
                <Show when={mode() === "copy"}>
                    <Field label="Copy to">
                        <input
                            type="date"
                            value={date()}
                            onInput={(e) => setDate(e.currentTarget.value)}
                        />
                    </Field>
                </Show>
                <div class="cp-impact">
                    <p>
                        {plural(eligible().length, "session")} for{" "}
                        {who() === "all" ? "everyone" : kids()[0]?.name}. Completed work stays in
                        the record. Destination lessons remain in place.
                    </p>
                </div>
                <Button
                    busy={busy()}
                    onClick={() => {
                        const all = eligible();
                        const problem = all
                            .map((s) =>
                                checkDate(
                                    s.kid.id,
                                    mode() === "copy" ? date() : addDays(s.cell.on, 7),
                                ),
                            )
                            .find(Boolean);
                        if (problem) {
                            setError(problem);
                            return;
                        }
                        if (!all.length) {
                            setError("There are no unfinished sessions to change.");
                            return;
                        }
                        void save(
                            all.map((s) =>
                                draft(s.kid.id, {
                                    ...s.op,
                                    id: mode() === "copy" ? api.newId() : s.op.id,
                                    source: mode() === "copy" ? null : s.op.source,
                                    onDay: mode() === "copy" ? date() : addDays(s.cell.on, 7),
                                }),
                            ),
                            mode() === "copy"
                                ? "Copied the day’s sessions."
                                : "Moved the week’s unfinished sessions forward.",
                        );
                    }}
                >
                    Apply this change
                </Button>
            </Card>
        );
    }
    const advance = (n: number): void => {
        if (view() === "month") {
            const d = new Date(`${day().slice(0, 7)}-01T12:00:00Z`);
            d.setUTCMonth(d.getUTCMonth() + n);
            move({ at: d.toISOString().slice(0, 10) });
        } else move({ at: addDays(day(), n * 7) });
    };
    return (
        <Show when={loaded.latest} fallback={<Waiting kicker="For grown-ups" title="Opening the calendar" />}>
            <Show
                when={got()}
                fallback={
                    <Postcard note kicker="The calendar" title="The calendar did not load">
                        <Say
                            text="We could not open your plan."
                            action={{ label: "Try again", run: () => void refetch() }}
                        />
                    </Postcard>
                }
            >
                {(l) => (
                    <div class="gc cp">
                        <Postcard
                            wide
                            kicker="Your family’s learning plan"
                            title="The calendar"
                            lead={`${plural(onDay().length, "session")} on ${dayMark(day())}. Plan the days and shape the weeks ahead.`}
                        >
                            <Seg
                                legend="Whose plan"
                                value={who()}
                                options={[
                                    ...(l().view.kids.length > 1
                                        ? [{ value: "all", label: "Everyone" }]
                                        : []),
                                    ...l().view.kids.map((k) => ({ value: k.id, label: k.name })),
                                ]}
                                onChange={(id) => move({ who: id })}
                            />
                            <Show when={parent() && kids().length}>
                                <div class="acts">
                                    <button
                                        type="button"
                                        class="link"
                                        onClick={() => open(<School />)}
                                    >
                                        School days & breaks
                                    </button>
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
                                    <button
                                        type="button"
                                        class="link"
                                        onClick={() => open(<Later />)}
                                    >
                                        For later
                                    </button>
                                </div>
                            </Show>
                        </Postcard>
                        <Show when={said()}>
                            <div class="cp-said">
                                <Say text={said()} />
                                <Show when={last().length}>
                                    <button
                                        type="button"
                                        class="link"
                                        disabled={busy()}
                                        onClick={() => void undo()}
                                    >
                                        Put it back
                                    </button>
                                </Show>
                                <Show when={redo().length}>
                                    <button
                                        type="button"
                                        class="link"
                                        disabled={busy()}
                                        onClick={() => void reapply()}
                                    >
                                        Redo
                                    </button>
                                </Show>
                            </div>
                        </Show>
                        <Show when={error() && !card()}>
                            <Say text={error()} />
                        </Show>
                        <Show
                            when={kids().length}
                            fallback={
                                <Postcard
                                    note
                                    kicker="The calendar"
                                    title="Room for their first week"
                                    lead="Add a child to choose subjects and plan their lessons."
                                >
                                    <Show when={parent()}>
                                        <Button onClick={openAdd}>Add a child</Button>
                                    </Show>
                                </Postcard>
                            }
                        >
                            <div
                                class="cp-layout"
                                classList={{ full: view() === "year" || view() === "subjects" }}
                            >
                                <section class="gc-sheet cp-main">
                                    <Tape />
                                    <Seg
                                        legend="Which view"
                                        value={view()}
                                        options={[
                                            { value: "week", label: "The week" },
                                            { value: "month", label: "The month" },
                                            { value: "year", label: "The year" },
                                            { value: "subjects", label: "Subjects & pace" },
                                            { value: "lessons", label: "Find lessons" },
                                        ]}
                                        onChange={(v) => move({ view: v })}
                                    />
                                    <Show when={view() === "week" || view() === "month"}>
                                        <header class="gc-head">
                                            <h2 class="gc-title">
                                                {view() === "month"
                                                    ? new Date(
                                                          `${day()}T12:00:00Z`,
                                                      ).toLocaleDateString("en-GB", {
                                                          month: "long",
                                                          year: "numeric",
                                                          timeZone: "UTC",
                                                      })
                                                    : `${dayMark(mondayOf(day()))} – ${dayMark(addDays(mondayOf(day()), 6))}`}
                                            </h2>
                                            <div class="acts">
                                                <Button second onClick={() => advance(-1)}>
                                                    Previous
                                                </Button>
                                                <Button
                                                    second
                                                    onClick={() => move({ at: l().cal.today })}
                                                >
                                                    Today
                                                </Button>
                                                <Button second onClick={() => advance(1)}>
                                                    Next
                                                </Button>
                                                <input
                                                    type="date"
                                                    aria-label="Jump to a date"
                                                    value={day()}
                                                    onChange={(e) => {
                                                        if (e.currentTarget.value)
                                                            move({ at: e.currentTarget.value });
                                                    }}
                                                />
                                            </div>
                                            <Show when={view() === "week"}>
                                                <label class="cp-check">
                                                    <input
                                                        type="checkbox"
                                                        checked={weekends()}
                                                        onChange={(e) =>
                                                            setWeekends(e.currentTarget.checked)
                                                        }
                                                    />
                                                    Show weekends
                                                </label>
                                            </Show>
                                        </header>
                                    </Show>
                                    <Show when={view() === "week"}>
                                        <Week />
                                    </Show>
                                    <Show when={view() === "month"}>
                                        <Month />
                                    </Show>
                                    <Show when={view() === "subjects"}>
                                        <Subjects />
                                    </Show>
                                    <Show when={view() === "lessons"}>
                                        <Library
                                            grade={kids()[0]?.grade ?? 1}
                                            choose={(id) =>
                                                open(
                                                    <AddLessons
                                                        on={day()}
                                                        kid={firstKid().id}
                                                        picked={id}
                                                    />,
                                                )
                                            }
                                        />
                                    </Show>
                                    <Show when={view() === "year"}>
                                        <Year
                                            loaded={l()}
                                            kids={kids()}
                                            onWeek={(at, who) => move({ view: "week", at, who })}
                                            onCard={open}
                                            onWrite={write}
                                        />
                                        <For each={kids()}>
                                            {(kid) => (
                                                <Show when={parent()}>
                                                    <Worlds
                                                        loaded={l()}
                                                        kid={kid}
                                                        onCard={open}
                                                        onWrite={write}
                                                    />
                                                </Show>
                                            )}
                                        </For>
                                    </Show>
                                    <footer class="gc-foot">
                                        <p class="note">
                                            Lessons you place stay put when the routine changes.
                                            Finished work stays in the record.
                                        </p>
                                        <button
                                            type="button"
                                            class="link"
                                            onClick={() => window.print()}
                                        >
                                            Print this view
                                        </button>
                                    </footer>
                                </section>
                                <Show when={view() !== "year" && view() !== "subjects"}>
                                    <Detail />
                                </Show>
                            </div>
                            <div class="gc-sheet cp-history">
                                <Changes loaded={l()} onWrite={write} />
                            </div>
                        </Show>
                        <Show when={card()}>
                            {(c) => (
                                <Dialog two onClose={close}>
                                    <div class="cp-editor">
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
