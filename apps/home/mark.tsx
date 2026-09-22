// Marking a sheet that came back on paper (.docs/parents.md, "Mark a sheet"): the lesson as the
// grown-ups' sheet has it, with the answers written in, beside a column with a box for each question
// of the sheet as it was printed. A tap marks a question wrong, and a tap on one of the lines its
// author wrote for a mistake marks it wrong and says which; everything left is right, so a sheet with
// nothing wrong is one tap on Done. The marks are `marked` events, and a walk from the hello card
// goes through every waiting sheet, oldest first, one after another.

import type { SceneDrawer } from "../../engine/ui/scene";
import {
    createMemo,
    createResource,
    createSignal,
    createUniqueId,
    For,
    onCleanup,
    onMount,
    Show,
    Suspense,
    type JSX,
} from "solid-js";
import { LEVELS, type Level, type PackLesson } from "../../engine/pack";
import * as api from "../../engine/ui/api";
import { onThisComputer } from "../../engine/ui/device";
import { failureText } from "../../engine/ui/failure";
import { LessonSheet } from "../../engine/ui/lesson";
import { Say } from "../../engine/ui/say";
import { matches } from "../../engine/ui/viewport";
import type { Failure } from "../../engine/ui/wire";
import {
    cameBackRight,
    marksOf,
    sheetSays,
    toMark,
    type SheetBack,
} from "../../school/family/sheets";
import { askedIn, levelIn } from "../../school/lessons";
import { subjectFacts } from "../../school/tracks";
import type { PackView } from "../../server/api";
import type { Kid } from "../../server/db/schema";
import { dayLong, plural } from "./grown";

const local = onThisComputer(location.hostname);

/** A sheet to mark, and the child it came back from. */
export interface ToWalk {
    kid: Kid;
    sheet: SheetBack;
    /** Read with the grown-up's card rather than marked. */
    read?: boolean;
}

/** The drawer of a pack's scenes, with the drawings the lesson's scenes name loaded first. */
const drawer = (lesson: PackLesson): Promise<SceneDrawer> =>
    import("../../engine/ui/scene").then((m) => m.scenes(m.scenesIn(lesson)));

/** The level a sheet was printed at, by the hash its questions carry, or the lesson as written. */
const levelOf = (lesson: PackLesson, hash: string | undefined): Level =>
    LEVELS.find((l) => lesson.levels[l]?.hash === hash) ?? "medium";

/**
 * The walk through the sheets given, over the page, until the last is marked or the grown-up goes
 * back. `onMarked` hears each sheet as its marks are kept, so the page can read that child again.
 */
export function Marking(props: {
    walk: readonly ToWalk[];
    pack: PackView;
    onMarked: (kid: Kid) => void;
    /** Back to the page, with the last line said while marking. */
    onClose: (said: string) => void;
}): JSX.Element {
    const [at, setAt] = createSignal(0);
    const [said, setSaid] = createSignal("");
    const now = (): ToWalk | undefined => props.walk[at()];
    // read as a function rather than inside a Show, so that moving to the next sheet says so: a
    // Show's children run once for a truthy value, and a string built in there never changes again
    const who = (): string => {
        const w = now();
        if (!w) return "";
        const count =
            props.walk.length > 1
                ? ` · ${at() + 1} of ${plural(props.walk.length, "sheet")} to mark`
                : "";
        return `${w.kid.name} · ${w.read ? "" : "came back "}${dayLong(w.sheet.on)}${count}`;
    };
    let box: HTMLDivElement | undefined;
    let back: HTMLButtonElement | undefined;
    let dialog: HTMLDialogElement | undefined;
    const from = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    onMount(() => {
        document.body.classList.add("gm-open");
        // modal, so the page under it can be neither read nor reached until it closes
        dialog?.showModal();
        back?.focus();
    });
    onCleanup(() => {
        document.body.classList.remove("gm-open");
        dialog?.close();
        from?.focus({ preventScroll: true });
    });
    const next = (line: string): void => {
        setSaid(line);
        if (at() + 1 >= props.walk.length) {
            props.onClose(line);
            return;
        }
        setAt(at() + 1);
        box?.scrollTo({ top: 0 });
        back?.focus();
    };
    const id = createUniqueId();
    return (
        <dialog
            ref={(el) => {
                dialog = el;
            }}
            class="gm"
            aria-labelledby={id}
            onCancel={(e) => {
                // Escape goes back to the page through the same way as the button
                e.preventDefault();
                props.onClose(said());
            }}
        >
            <div class="gm-top">
                <p id={id} class="gm-who">
                    {who()}
                </p>
                <button
                    ref={(el) => {
                        back = el;
                    }}
                    type="button"
                    class="btn second gm-back"
                    onClick={() => props.onClose(said())}
                >
                    Back to the page
                </button>
            </div>
            <div
                class="gm-body"
                ref={(el) => {
                    box = el;
                }}
            >
                {/* The next sheet waits on its lesson's file. Without a boundary of its own here,
                    that wait is the screen's (engine/ui/router.tsx), which takes the whole page off
                    the document while it lasts: the walk loses focus, and Escape, which a modal
                    dialog only answers while focus is inside it, stops going back to the page. */}
                <Suspense>
                    <Show when={now()} keyed>
                        {(w) => (
                            <OneSheet
                                walk={w}
                                pack={props.pack}
                                more={props.walk.length - at() - 1}
                                said={said()}
                                onDone={(line) => {
                                    props.onMarked(w.kid);
                                    next(line);
                                }}
                            />
                        )}
                    </Show>
                </Suspense>
            </div>
        </dialog>
    );
}

function OneSheet(props: {
    walk: ToWalk;
    pack: PackView;
    more: number;
    said: string;
    onDone: (line: string) => void;
}): JSX.Element {
    const s = props.walk.sheet;
    const facts = props.pack.index.lessons.find((l) => l.id === s.lesson);
    const [lesson, { refetch }] = createResource(async (): Promise<PackLesson | Failure | null> =>
        facts ? api.packLesson(props.pack.pack, facts.file) : null,
    );
    const narrow = matches("(max-width: 900px)");
    const read = (): PackLesson | null => {
        const l = lesson.latest;
        return l && !("error" in l) ? l : null;
    };
    const [draw] = createResource(read, drawer);
    const failed = (): Failure | null => {
        const l = lesson.latest;
        return l && "error" in l ? l : null;
    };
    return (
        <div class="gm-one">
            <div class="gm-paper">
                <Show when={failed()}>
                    {(f) => (
                        <Say
                            text={`The lesson did not load. ${failureText(f(), local)}`}
                            action={{ label: "Try again", run: () => void refetch() }}
                        />
                    )}
                </Show>
                <Show when={lesson.latest === null}>
                    <p class="note">This lesson is not in the family's lessons any more.</p>
                </Show>
                <Show when={read()}>
                    {(l) => (
                        <Show when={draw.latest}>
                            {(d) => (
                                <LessonSheet
                                    lesson={l()}
                                    level={levelOf(l(), s.questions[0]?.lessonHash)}
                                    strip={{ label: "For grown-ups", date: dayLong(s.on) }}
                                    width={narrow() ? Math.min(innerWidth - 32, 560) : 760}
                                    narrow={narrow()}
                                    limits={{ sheets: "look", key: true }}
                                    draw={d()}
                                />
                            )}
                        </Show>
                    )}
                </Show>
            </div>
            <Show when={read()}>
                {(l) => (
                    <Show
                        when={!props.walk.read}
                        fallback={<HowItWent walk={props.walk} lesson={l()} />}
                    >
                        <Column
                            walk={props.walk}
                            lesson={l()}
                            more={props.more}
                            said={props.said}
                            onDone={props.onDone}
                        />
                    </Show>
                )}
            </Show>
        </div>
    );
}

function Column(props: {
    walk: ToWalk;
    lesson: PackLesson;
    more: number;
    said: string;
    onDone: (line: string) => void;
}): JSX.Element {
    const s = props.walk.sheet;
    const kid = props.walk.kid;
    // a sheet printed elsewhere is marked against the lesson as it is written
    const printed = s.sheet;
    const sheetId = printed ?? api.newId();
    const questions = createMemo(() =>
        s.questions.length
            ? s.questions
            : askedIn(props.lesson, "medium")
                  .filter((a) => a.way !== "worked")
                  .map((a) => a.ref),
    );
    const items = createMemo(() => toMark(props.lesson, questions()));
    const [wrong, setWrong] = createSignal<ReadonlyMap<number, string | null>>(new Map());
    const [busy, setBusy] = createSignal(false);
    const [failed, setFailed] = createSignal("");
    const flip = (n: number, rule: string | null, on: boolean): void => {
        const m = new Map(wrong());
        if (on) m.set(n, rule);
        else m.delete(n);
        setWrong(m);
    };
    const tally = (): string => {
        const all = items().length;
        const w = wrong().size;
        return w ? `${all - w} of ${all} right first time` : `All ${all} right first time`;
    };
    const done = async (): Promise<void> => {
        if (busy()) return;
        setBusy(true);
        setFailed("");
        const drafts = marksOf({
            kid: kid.id,
            sheet: sheetId,
            items: items(),
            wrong: wrong(),
            at: api.nowAt(),
            newId: api.newId,
        });
        const r = await api.append(drafts);
        setBusy(false);
        if ("error" in r) {
            setFailed(`The marks were not kept, so nothing is saved yet. ${failureText(r, local)}`);
            return;
        }
        const right = cameBackRight({
            ...s,
            marked: true,
            asked: items().length,
            right: items().length - wrong().size,
        });
        props.onDone(
            `${props.lesson.title} is marked for ${kid.name}: ${tally().toLowerCase()}${right ? ", and it has its star" : ""}.`,
        );
    };
    const id = createUniqueId();
    return (
        <aside class="gm-card" aria-labelledby={id}>
            <span class="postcard-tape" aria-hidden="true" />
            <p class="kicker">{`Marking · ${subjectFacts(props.lesson.subject).title}`}</p>
            <h2 id={id} class="gm-title">
                {props.lesson.title}
            </h2>
            <Show when={props.said}>
                <Say calm text={props.said} />
            </Show>
            <p class="note">
                Tap what was wrong. Everything you leave is right, so a sheet with nothing wrong is
                one tap on Done.
            </p>
            <Show when={!printed}>
                <p class="note">
                    This sheet was not printed from here, so it is marked against the lesson as it
                    is written.
                </p>
            </Show>
            <ol class="gm-marks">
                <For each={items()}>
                    {(item) => {
                        const n = item.ref.n;
                        const isWrong = (): boolean => wrong().has(n);
                        return (
                            <li classList={{ wrong: isWrong() }}>
                                <div class="gm-q">
                                    <button
                                        type="button"
                                        class="gm-box"
                                        aria-pressed={isWrong()}
                                        aria-label={`Question ${n} was wrong`}
                                        onClick={() => flip(n, null, !isWrong())}
                                    >
                                        <span aria-hidden="true">{isWrong() ? "✕" : ""}</span>
                                    </button>
                                    <p>
                                        <b>{`${n}.`}</b>{" "}
                                        {item.answer
                                            ? `The answer is ${item.answer}.`
                                            : "You are the marker here."}
                                    </p>
                                </div>
                                <Show when={item.rules.length}>
                                    <div class="gm-rules">
                                        <For each={item.rules.slice(0, 3)}>
                                            {(rule) => (
                                                <button
                                                    type="button"
                                                    class="gm-rule"
                                                    aria-pressed={wrong().get(n) === rule}
                                                    onClick={() =>
                                                        flip(n, rule, wrong().get(n) !== rule)
                                                    }
                                                >
                                                    {rule}
                                                </button>
                                            )}
                                        </For>
                                    </div>
                                </Show>
                            </li>
                        );
                    }}
                </For>
            </ol>
            <p class="gm-tally" aria-live="polite">
                {tally()}
            </p>
            <Show when={failed()}>
                <Say text={failed()} />
            </Show>
            <div class="acts">
                <button
                    type="button"
                    class="btn"
                    aria-disabled={busy() ? true : undefined}
                    onClick={() => void done()}
                >
                    {props.more ? `Done, and the next of ${props.more}` : "Done"}
                </button>
            </div>
        </aside>
    );
}

/** The grown-up's card for a sheet that came back: how it went, the author's lines, and the lesson's note. */
function HowItWent(props: { walk: ToWalk; lesson: PackLesson }): JSX.Element {
    const s = props.walk.sheet;
    const id = createUniqueId();
    const note = (): string =>
        (levelIn(props.lesson, "medium").grownUps[0] ?? "").replace(/\s*\n\s*/g, " ").trim();
    return (
        <aside class="gm-card" aria-labelledby={id}>
            <span class="postcard-tape" aria-hidden="true" />
            <p class="kicker">{`${subjectFacts(props.lesson.subject).title} · ${dayLong(s.on)}`}</p>
            <h2 id={id} class="gm-title">
                {props.lesson.title}
            </h2>
            <p class="gm-tally">
                {`${sheetSays(s)}${cameBackRight(s) ? ", and it has its star" : ""}.`}
                <Show when={cameBackRight(s)}>
                    <span class="gj-star" aria-hidden="true">
                        {" ★"}
                    </span>
                </Show>
            </p>
            <p class="note">
                {`${s.mode === "paper" ? "Worked on paper" : "Worked on the screen"}${s.minutes ? `, about ${plural(s.minutes, "minute")}` : ""}.`}
            </p>
            <For each={s.mistakes.slice(0, 3)}>
                {(m) => (
                    <p class="gm-said">
                        <span class="gj-line">{`“${m.rule}”`}</span>{" "}
                        <span class="note">
                            {m.times > 1
                                ? `came up ${m.times} times on this sheet`
                                : "came up once"}
                        </span>
                    </p>
                )}
            </For>
            <Show when={note()}>
                <p class="kicker">For grown-ups</p>
                <p class="gm-note">{note()}</p>
            </Show>
        </aside>
    );
}
