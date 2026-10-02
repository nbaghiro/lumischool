// A lesson on a sheet, drawn from the pack (engine/pack.ts) at one of its levels: the strip with the
// day, the title and the goal, and each section as the lesson wrote it, its text, its pictures and
// its questions, with the pictures drawn by the scene's renderer (scene.ts). What the sheet shows is its state, which every sheet has; what may be done to it is its
// actions, which a sheet drawn to be read is not given, so the child's world and the grown-ups'
// journal draw one day from one piece of code and only one of them can record against it. With
// actions, a typed or picked answer is checked with the author's reply line, the part a rule points
// at is ringed while the child has another look, the companion (companion.ts) is asked to explain the
// lesson or help with the question to do now and opens its hints, rings and worked example through the
// sheet, I have finished is at the foot, and a piece a grown-up reads is written on paper and handed in. The question to do
// now stands out, with the part of its picture that holds the answer marked, a question done is
// ticked, and a child working down the sheet is taken on to the next question; a reader looks, with
// the answers, the hints, what a grown-up looks for and the notes for grown-ups when the page says
// so, and nothing to answer or record. A question answered on its drawing, a see-saw or a cake, is
// arrange.tsx's. Nothing on a child's sheet counts tries or shows a score.

import "./lesson.css";
import { choiceBoxes, inputBoxes, type SceneDrawer } from "./scene";
import {
    answeredWords,
    asksWhatItDoes,
    codingTarget,
    PREDICT_FIRST,
    sceneTarget,
    type CodingTarget,
} from "./coding";
import { CodingControls } from "./code-controls";
import {
    createEffect,
    createMemo,
    createSignal,
    For,
    Match,
    on,
    onCleanup,
    Show,
    Switch,
    type JSX,
} from "solid-js";
import { render } from "solid-js/web";
import type { ProgramLine, Timing, Way } from "../answer";
import { ARRANGED, barsOf, cuttingOf, plankOf, type Arrangement, type Board } from "../arrange";
import { done, GOALS, parse, run, writeLines, type Goal } from "../coding";
import { ArrangedQuestion, type Arranged, type ArrangedPart, type Arranging } from "./arrange";
import { linesFromKey } from "../parts/coding/codepad";
import { setupOf } from "../parts/coding/setup";
import { ProgramQuestion, type Built, type Programming, type ProgramPad } from "./program";
import { BookPages } from "./book";
import {
    chaptersLabel,
    DICTATION,
    noticeOf,
    paragraphs,
    partsOf,
    pieceOf,
    sectionLabel,
    sittingsOf,
    laidOut,
    blocksOf,
    stepsOf,
    type Laid,
    tagOf,
    type PackBook,
    type Left,
    type Level,
    type PackBlock,
    type PackItem,
    type PackLesson,
    type PackQuestion,
    type Piece,
} from "../pack";
import { valuesOf, type Box, type Scene } from "../scene";
import * as companion from "./companion";
import { Icon } from "./icon";
import { voice } from "./voice";

/** How a question is answered on the sheet: typed or picked into the strip under it, arranged on its drawing, shown worked, written on paper for a grown-up, or in another way this sheet does not have. */
export type SheetWay = "typed" | "arranged" | "program" | "worked" | "grown-up" | "other";

/** What a child reads after a try, and what the drawing shows: the part a rule points at, or the answers written in once the question is done. */
export interface Told {
    state: "right" | "again" | "shown" | "handed-in";
    say: string;
    point: string | null;
    key: Record<string, string> | null;
    done: boolean;
}

/**
 * What a sheet shows for each of a lesson's questions, by its number: what was asked, how it is
 * answered, and where the last sitting left it. Every sheet has this, whether anyone may answer it
 * or not, and `sheetState` builds it from the questions as they stand.
 */
export interface SheetState {
    way(n: number): SheetWay;
    /** A question already done, with the answer to write in, or null. */
    done(n: number): Told | null;
    /** What the child wrote last on it, by the answer's name. */
    written(n: number): Record<string, string>;
    /** The hints opened on it, in order. */
    opened(n: number): string[];
    /** A question answered on its drawing: the part and its board, set up from the scene, or null for any other way. */
    arranged(n: number): ArrangedPart | null;
    /** A program built from a pad's blocks: the pad and the drawing it runs in, or null for any other way. */
    program(n: number): ProgramPad | null;
    /** A picked answer's options for an answer's name, in order; none for an answer that is typed. */
    options(n: number, key: string): { label: string; value: string }[];
    /** Whether another hint may be opened, which is false wherever nobody is answering. */
    mayHint(n: number): boolean;
    /** What the companion can draw beside the question, or null wherever nobody is answering. */
    help(n: number): Help | null;
}

/** The easier thing the companion's show_worked draws beside a question: the lesson's worked example of it, or the same item asked easier. */
export interface Help {
    easier: { kind: "worked" | "easy"; question: PackQuestion } | null;
}

/**
 * What a viewer may do with a sheet's questions: each try checked and recorded, hints opened, and
 * the sheet ended. A sheet drawn to be read is given none of this, so a page that shows a child's
 * work cannot record against it and a question cannot be answered twice.
 */
export interface SheetActs {
    /** A typed or picked answer checked and recorded, or null while there is nothing to check. */
    typed(n: number, typed: Readonly<Record<string, string>>, timing: Timing): Reply | null;
    /** Pieces placed on a part, checked over the board's own measures and recorded. */
    arranged(
        n: number,
        part: string,
        places: Arrangement,
        measures: ReturnType<Board["measure"]>,
        timing: Timing,
    ): Reply | null;
    /** A program built from a pad's blocks, with whether running it reached the goal. */
    program(n: number, lines: ProgramLine[], works: boolean, timing: Timing): Reply | null;
    /** A piece written on paper, handed in for a grown-up to read; false for a question that is not. */
    handIn(n: number, timing: Timing): boolean;
    /** The next hint, opened and recorded. */
    hint(n: number): string | null;
    /** Help beyond a hint, recorded with what it gave: the part ringed, the easier thing's kind, or the companion's face. */
    asked(n: number, ask: "where" | "easier" | "talk", material: string | null): void;
    /** The line read when a box is empty. */
    empty: string;
    finished(): void;
}

/**
 * What a page's viewer may do with a sheet, as `WorldLimits` says what they may do in a world. A
 * child's own sheet is open: it shows the child's work through `state`, and with `acts` its
 * questions are answered, each try checked and recorded, and it names the child on the line that
 * asks them to press finished. A sheet opened with no `acts` is the same sheet as it was left. A
 * reader's sheet is for looking, and with `key` it shows the answers, the hints and the notes for
 * grown-ups.
 */
export type SheetLimits =
    | { sheets: "open"; state: SheetState; acts?: SheetActs; child: string }
    | { sheets: "look"; key: boolean };

const FINISH = (child: string): string =>
    `When you have done what you can, press finished, ${child}.`;
const FINISHED = (child: string): string => `You have finished this page. Well done, ${child}.`;
const SITTING = (n: number, of: number): string => `Sitting ${n} of ${of}`;
/** How the sheet offers each way a question is answered; a way the sheet does not have is done with a grown-up. */
const SHEET_WAY: Record<Way, SheetWay> = {
    worked: "worked",
    typed: "typed",
    arranged: "arranged",
    program: "program",
    "grown-up": "grown-up",
    elsewhere: "other",
};

/** What a check made of a try: what the sheet says, where it points, and whether the question is over. */
export interface Reply {
    state: "right" | "again" | "shown";
    say: string;
    point: string | null;
    right: boolean;
    done: boolean;
}

/** Where the pieces stand once a question is over: the child's own arrangement when it was right, the key when it was shown. */
const shownAs = (board: Board, places: Arrangement, right: boolean): Arranged => ({
    state: right ? "right" : "shown",
    say: board.after(places),
    point: null,
    places,
    done: true,
});

/**
 * What a sheet shows, from the questions as they stand (`at`): the child's own world draws a day it
 * comes near this way, and the grown-ups' journal draws the same day the same way, so one sheet is
 * drawn by one piece of code for both. A page a child answers on builds its actions over this same
 * state, so every try is checked against the boards and pads the sheet itself drew.
 */
export function sheetState(o: {
    at: (n: number) => Left | undefined;
    help?: (n: number) => Help | null;
}): SheetState {
    const { at } = o;
    const toldOf = (l: Left): Told | null => {
        if (!l.done) return null;
        if (l.given?.k === "unmarked")
            return { state: "handed-in", say: l.handedSays, point: null, key: null, done: true };
        return {
            state: l.right ? "right" : "shown",
            say: "",
            point: null,
            // the child's own answer, as they wrote it, when right; the answer when it was shown
            key: l.right && Object.keys(l.written).length ? l.written : l.question.answers,
            done: true,
        };
    };
    /** A question answered on its drawing: its part set up from the scene, and where the pieces stand. */
    const arrangedOn = (n: number): ArrangedPart | null => {
        const l = at(n);
        const q = l?.question;
        const arranged = q?.arranged;
        if (!l || !q || !arranged || !q.scene) return null;
        const node = q.scene.nodes.find((x) => x.id === arranged.part);
        const part = node && ARRANGED[node.type];
        const board = node && part ? part.board(node.v) : null;
        if (!node || typeof board !== "object" || board === null) return null;
        const plank = plankOf(node.v),
            cutting = cuttingOf(node.v),
            bars = node.type === "bargraph" ? barsOf(node.v) : null;
        const given = l.given;
        return {
            part: arranged.part,
            type: node.type,
            board,
            plank: typeof plank === "string" ? null : plank,
            cutting: typeof cutting === "string" ? null : cutting,
            bars: typeof bars === "string" ? null : bars,
            key: arranged.key,
            told: !l.done
                ? null
                : shownAs(
                      board,
                      l.right && given?.k === "arranged" ? given.places : arranged.key,
                      l.right,
                  ),
        };
    };
    /**
     * A program built from a pad's blocks: the pad and the drawing its check names, and what it takes
     * for a run to reach the task the check sets (`coding.builds` in the verifier).
     */
    const programOn = (n: number): ProgramPad | null => {
        const l = at(n);
        const q = l?.question;
        const settings = l?.item.check?.settings;
        if (!l || !q?.scene || !settings) return null;
        const selected = codingTarget(q, l.item);
        if (!selected || selected.mode !== "build") return null;
        const pad = settings.pad ?? "answer";
        const world = q.scene.nodes.find((x) => x.id === selected.node.id);
        const goal: Goal | "target" | undefined =
            settings.goal === "target" ? "target" : GOALS.find((g) => g === settings.goal);
        const setup = world ? setupOf(world.type, valuesOf(world.v)) : null;
        if (!world || !setup || !goal || !q.scene.nodes.some((x) => x.id === pad)) return null;
        const target = setup.target.length
            ? { segments: run(parse(setup.target), setup.world).segments }
            : undefined;
        const key = linesFromKey(q.answers[pad] ?? "");
        const given = l.given;
        return {
            pad,
            world: world.id,
            runs: (lines) => done(writeLines([...lines]), setup.world, goal, target),
            key,
            told: !l.done
                ? null
                : {
                      state: l.right ? "right" : "shown",
                      say: "",
                      lines: l.right && given?.k === "program" ? given.lines : key,
                      done: true,
                  },
        };
    };
    return {
        way: (n) => SHEET_WAY[at(n)?.way ?? "elsewhere"],
        done: (n) => {
            const l = at(n);
            return l ? toldOf(l) : null;
        },
        written: (n) => at(n)?.written ?? {},
        opened: (n) => at(n)?.opened ?? [],
        arranged: arrangedOn,
        program: programOn,
        options: (n, key) => at(n)?.options[key] ?? [],
        mayHint: (n) => at(n)?.mayHint ?? false,
        help: (n) => o.help?.(n) ?? null,
    };
}

const OTHER_WAY = "Do this one with a grown-up.";
/** Under a dictation: sound is the second way to hear it, and the grown-up's sheet is the first (.docs/sound.md). */
const DICTATE = "Your grown-up reads the sentence to you from their sheet. Type it, then check it.";
/** What the strip under a piece says and what its button says, by what the child makes. */
const ON_PAPER: Record<Piece, { say: string; done: string }> = {
    writing: {
        say: "Write this one on paper. A grown-up will read it.",
        done: "I have written it",
    },
    painting: {
        say: "Paint this one on paper. A grown-up will look at it.",
        done: "I have painted it",
    },
    made: {
        say: "Make this one away from the screen. A grown-up will look at it.",
        done: "I have made it",
    },
    spoken: {
        say: "Say this one to a grown-up. They will listen.",
        done: "I have said it",
    },
    sung: {
        say: "Sing this one to a grown-up. They will listen.",
        done: "I have sung it",
    },
};

/**
 * What the blocks read of the limits: the child's own sheet, with what it shows and what may be done
 * to it, closed once it is finished so what they wrote stays on it, or a reader's key.
 */
type Reading =
    | { state: SheetState; acts: SheetActs | null; closed: boolean; flow: Flow }
    | { key: boolean; look: Look };

/**
 * What the companion needs on a sheet being looked at, where nothing is recorded: which lesson it is,
 * and the lesson's worked example of an item, for show_worked.
 */
interface Look {
    lesson: string;
    level: Level;
    worked: (item: PackItem) => PackQuestion | null;
}

/** The ways of answering a child does on the sheet itself, which the sheet takes them through in order. */
const ON_SHEET: ReadonlySet<SheetWay> = new Set(["typed", "arranged", "program", "grown-up"]);

/**
 * The order a child works down a sheet in: the question to do now, the first not done in page order,
 * and each question saying when it is done. `recent` is whether the child was working in it just
 * now, which is when the sheet takes them on to the next.
 */
interface Flow {
    current: () => number | null;
    done: (n: number, recent: boolean) => void;
    /** What the companion can do on each question of the sheet, by its number. */
    desks: Map<number, companion.Desk>;
    lesson: string;
    level: Level;
}

/** What a sheet raises to ask the page it is on to bring something into view (world.tsx listens by this name). */
const REVEAL = "lumischool:reveal";

/** How long a question's reply line is left to be read before the next question takes focus, in ms. */
const NEXT_AFTER = 900;
/** How recently a child must have worked in a question for the sheet to take them on, in ms. */
const WORKING = 3000;

/** A quiet spell in a question after which the next touch asks for the whole question again, in ms. */
const SETTLING = 1500;

/** How long a reply line and what it moves take to settle before the strip asks again, in ms. */
const SETTLED = 400;
/** Keys that look about the page or move between boxes, which are not work in a question. */
const LOOKING = new Set([
    "PageUp",
    "PageDown",
    "Home",
    "End",
    "Tab",
    "Escape",
    "Shift",
    "Control",
    "Alt",
    "Meta",
    "CapsLock",
]);
/** Whether an event in a question is the child looking rather than working: a key above, or an arrow moving a box's caret. */
const looking = (e: Event): boolean =>
    e instanceof KeyboardEvent &&
    (LOOKING.has(e.key) ||
        (e.key.startsWith("Arrow") &&
            e.target instanceof Element &&
            e.target.closest("input, textarea") !== null));
/** The first thing to use in a question: its box or first option, its first block or weight, or its one button. */
const FIRST =
    "input:not(:disabled), .ls-pick:not(:disabled), .ar-piece:not(:disabled), .pg-block:not(:disabled), .ls-go:not(:disabled)";

export function LessonSheet(props: {
    lesson: PackLesson;
    level: Level;
    /** The corner: "Today" and the day, or what the page calls the sheet. */
    strip: { label: string; date: string | null };
    /** The sheet's width, in the roll's units, and whether it is a phone's narrow sheet. */
    width: number;
    narrow: boolean;
    limits: SheetLimits;
    draw: SceneDrawer;
    ref?: (el: HTMLElement) => void;
    /** A sheet looked back at: finished already, with what the child wrote on it and nothing more to take. */
    finished?: boolean;
    /** A line under the heading, for what a sheet looked back at cannot show. */
    note?: string;
    /** A book lesson's sitting to show, from 1; the sheet then shows that sitting alone, on screen and on paper. */
    part?: number;
    /** A book lesson's text, whose chapters the sitting shows as pages to read on screen. */
    book?: PackBook | null;
}): JSX.Element {
    const [finished, setFinished] = createSignal(props.finished === true);
    const open = (): Extract<SheetLimits, { sheets: "open" }> | null =>
        props.limits.sheets === "open" ? props.limits : null;
    const finish = (): void => {
        setFinished(true);
        open()?.acts?.finished();
    };
    const at = (): PackLesson["levels"]["medium"] =>
        props.lesson.levels[props.level] ?? props.lesson.levels.medium;
    const sections = (): { label: string; blocks: PackBlock[]; chapters: number[] }[] => {
        const nth = new Map<string, number>();
        return at().sections.map((s) => {
            nth.set(s.type, (nth.get(s.type) ?? 0) + 1);
            return {
                label:
                    sectionLabel(s.type, nth.get(s.type) ?? 1, s.stars) +
                    (s.chapters?.length ? `: ${chaptersLabel(s.chapters)}` : ""),
                blocks: s.blocks,
                chapters: s.chapters ?? [],
            };
        });
    };
    /** The sections this sheet draws: every one, or a book's one sitting when a part is asked for. */
    const shown = createMemo((): number[] => {
        const all = at().sections.map((_, i) => i);
        const part = props.part;
        const one =
            part === undefined
                ? undefined
                : all.filter((i) => at().sections[i]?.type === "sitting")[part - 1];
        return one === undefined ? all : [one];
    });
    // A sheet to be read may be printed, and a long one prints in as many sittings as keep each to
    // five pages (sittingsOf), a book in one for each of its own. The screen keeps the lesson whole
    // and in its order, so a section a sitting moves or cuts is drawn twice, whole in its place for the
    // screen and as the sittings take it for paper (laidOut).
    const sittings = createMemo(() =>
        props.limits.sheets === "look" && props.part === undefined
            ? sittingsOf(props.lesson, at())
            : [],
    );
    const laid = createMemo((): Laid[] =>
        laidOut(
            at(),
            sittings().length
                ? sittings()
                : [
                      shown().flatMap((i) => {
                          const s = at().sections[i];
                          return s ? [{ section: i, from: 0, to: stepsOf(s) }] : [];
                      }),
                  ],
        ).filter((l) => l.on !== "screen" || shown().includes(l.section)),
    );
    const slice = (l: Laid): PackBlock[] => {
        const s = at().sections[l.section];
        return s ? blocksOf(s, l.from, l.to) : [];
    };
    const key = (): boolean => props.limits.sheets === "look" && props.limits.key;
    const [doneNs, setDoneNs] = createSignal<ReadonlySet<number>>(new Set());
    let article: HTMLElement | undefined;
    let taking = 0;
    onCleanup(() => clearTimeout(taking));
    const order = createMemo((): number[] => {
        const o = open();
        if (!o) return [];
        return shown().flatMap((i) =>
            (at().sections[i]?.blocks ?? []).flatMap((b) =>
                b.k === "ask" && b.how !== "worked"
                    ? b.questions
                          .filter((q) => q.n > 0 && ON_SHEET.has(o.state.way(q.n)))
                          .map((q) => q.n)
                    : [],
            ),
        );
    });
    const current = createMemo((): number | null =>
        finished() ? null : (order().find((n) => !doneNs().has(n)) ?? null),
    );
    const desks = new Map<number, companion.Desk>();
    /** The lesson itself, for Explain this lesson while no question is to do. */
    const whole: companion.Desk = {
        where: () => ({
            lesson: props.lesson.id,
            level: props.level,
            n: null,
            variant: null,
            hints: 0,
            tries: 0,
            said: null,
            worked: false,
        }),
        hint: () => null,
        ring: () => false,
        worked: () => null,
        talked: () => undefined,
    };
    const deskNow = (): companion.Desk => desks.get(current() ?? 0) ?? whole;
    // a companion talking about this lesson follows the child on to the next question
    createEffect(on(current, () => companion.follow(deskNow()), { defer: true }));
    const flow: Flow = {
        desks,
        lesson: props.lesson.id,
        level: props.level,
        current,
        done: (n, recent) => {
            if (doneNs().has(n)) return;
            setDoneNs(new Set([...doneNs(), n]));
            const next = current();
            if (!recent || next === null) return;
            clearTimeout(taking);
            taking = window.setTimeout(() => {
                const q = article?.querySelector<HTMLElement>(`.ls-q[data-n="${next}"]`);
                if (!q) return;
                q.querySelector<HTMLElement>(FIRST)?.focus({ preventScroll: true });
                // the page the sheet is on brings the whole question into view its own way, its
                // buttons at the foot included (world.tsx)
                q.dispatchEvent(new Event(REVEAL, { bubbles: true }));
            }, NEXT_AFTER);
        },
    };
    const look: Look = {
        lesson: props.lesson.id,
        level: props.level,
        worked: (item) => {
            for (const s of at().sections)
                for (const b of s.blocks)
                    if (b.k === "ask" && b.item.id === item.id && b.how === "worked")
                        return b.questions[0] ?? null;
            return null;
        },
    };
    const reading = (): Reading =>
        props.limits.sheets === "open"
            ? {
                  state: props.limits.state,
                  acts: props.limits.acts ?? null,
                  closed: finished(),
                  flow,
              }
            : { key: props.limits.key, look };
    return (
        <article
            ref={(el) => {
                article = el;
                props.ref?.(el);
            }}
            class="j-sheet squared wd-sheet ls-sheet"
            classList={{
                big: props.lesson.grade <= 2,
                narrow: props.narrow,
                today: props.strip.label === "Today",
            }}
            style={{ width: `${props.width}px` }}
            data-lesson={props.lesson.id}
            aria-label={`${props.lesson.title}, ${props.strip.label.toLowerCase()}`}
        >
            <div class="j-strip">
                <span class="label">{finished() ? "Finished" : props.strip.label}</span>
                <span class="date hand">{props.strip.date ?? ""}</span>
            </div>
            <header class="ls-head">
                <span class="label">
                    {tagOf(props.lesson)}
                    <Show when={props.part}>
                        {(part) => ` · ${SITTING(part(), partsOf(props.lesson))}`}
                    </Show>
                    <Show when={sittings().length > 1}>
                        <span class="ls-on-paper">{` · ${SITTING(1, sittings().length)}`}</span>
                    </Show>
                </span>
                <h2 class="hand">{props.lesson.title}</h2>
                <Show when={props.lesson.goal}>{(goal) => <p class="ls-goal">{goal()}</p>}</Show>
                <Show when={props.note}>{(note) => <p class="ls-note ls-looked">{note()}</p>}</Show>
                <Show when={companion.offered() && !(open()?.acts && finished())}>
                    <button
                        type="button"
                        class="ls-explain"
                        aria-label="Explain this lesson"
                        title="Explain this lesson"
                        onClick={(e) => companion.ask("explain", deskNow(), e.currentTarget)}
                    >
                        <Icon name="words" />
                    </button>
                </Show>
            </header>
            <For each={laid()}>
                {(at) => (
                    <>
                        <Show when={at.starts}>
                            {(k) => (
                                <header
                                    class="ls-head ls-on-paper ls-sitting-next"
                                    data-sitting={k()}
                                    aria-hidden="true"
                                >
                                    <span class="label">
                                        {`${tagOf(props.lesson)} · ${SITTING(k(), sittings().length)}`}
                                    </span>
                                    <h2 class="hand">{props.lesson.title}</h2>
                                </header>
                            )}
                        </Show>
                        <section
                            class="ls-sec"
                            classList={{
                                "ls-on-screen": at.on === "screen",
                                "ls-on-paper": at.on === "paper",
                            }}
                            aria-hidden={at.on === "paper" ? "true" : undefined}
                        >
                            <h3>{sections()[at.section]?.label}</h3>
                            <Show
                                when={props.book !== undefined && sections()[at.section]?.chapters}
                            >
                                {(chapters) => (
                                    <Show when={chapters().length}>
                                        <BookPages
                                            book={props.book ?? null}
                                            chapters={chapters()}
                                        />
                                    </Show>
                                )}
                            </Show>
                            <For each={slice(at)}>
                                {(block) => (
                                    <Block block={block} reading={reading()} draw={props.draw} />
                                )}
                            </For>
                        </section>
                    </>
                )}
            </For>
            <Show when={key() && at().grownUps.length}>
                <aside class="ls-grownups">
                    <span class="label">For grown-ups</span>
                    <For each={at().grownUps.flatMap(paragraphs)}>
                        {(runs) => <Paragraph runs={runs} />}
                    </For>
                </aside>
            </Show>
            <Show when={open()}>
                {(o) => (
                    <section class="ls-finish" aria-label="When you have finished">
                        {/* with nothing to do, the sheet was finished when it was left, and there is
                            no button, since there is nothing for one to end */}
                        <Show
                            when={o().acts && !finished()}
                            fallback={<p class="ls-finished">{FINISHED(o().child)}</p>}
                        >
                            <p>{FINISH(o().child)}</p>
                            <button type="button" class="ls-go" onClick={finish}>
                                I have finished
                            </button>
                        </Show>
                    </section>
                )}
            </Show>
            <div class="j-cover" aria-hidden="true">
                <span class="label">{finished() ? "Finished" : props.strip.label}</span>
                <span class="t hand">{props.lesson.title}</span>
            </div>
        </article>
    );
}

function Paragraph(props: { runs: ReturnType<typeof paragraphs>[number] }): JSX.Element {
    return (
        <p>
            <For each={props.runs}>
                {(r) => (r.strong ? <strong>{r.text}</strong> : r.em ? <em>{r.text}</em> : r.text)}
            </For>
        </p>
    );
}

function Block(props: { block: PackBlock; reading: Reading; draw: SceneDrawer }): JSX.Element {
    const b = props.block;
    const state = (): SheetState | null => ("state" in props.reading ? props.reading.state : null);
    const acts = (): SheetActs | null => ("acts" in props.reading ? props.reading.acts : null);
    const closed = (): boolean => "closed" in props.reading && props.reading.closed;
    const key = (): boolean => "key" in props.reading && props.reading.key;
    const flow = (): Flow | null => ("flow" in props.reading ? props.reading.flow : null);
    const look = (): Look | null => ("look" in props.reading ? props.reading.look : null);
    switch (b.k) {
        case "say":
            return (
                <div class="ls-say">
                    <For each={paragraphs(b.text)}>{(runs) => <Paragraph runs={runs} />}</For>
                </div>
            );
        case "grown-ups":
            return (
                <Show when={key()}>
                    <aside class="ls-grownups">
                        <span class="label">For grown-ups</span>
                        <For each={paragraphs(b.text)}>{(runs) => <Paragraph runs={runs} />}</For>
                    </aside>
                </Show>
            );
        case "scene":
            return (
                <SceneTile
                    scene={b.scene}
                    point={null}
                    key={null}
                    here={[]}
                    coding={sceneTarget(b.scene)}
                    reveal
                    draw={props.draw}
                />
            );
        case "ask":
            return (
                <div class="ls-grid" classList={{ many: b.questions.length > 1 }}>
                    <For each={b.questions}>
                        {(q) => (
                            <Question
                                q={q}
                                way={
                                    b.how === "worked" || q.n === 0 || key()
                                        ? "worked"
                                        : (state()?.way(q.n) ?? "other")
                                }
                                item={b.item}
                                lookFor={lookFor(b.item)}
                                notice={noticeOf(b.item)}
                                dictates={b.item.check?.name === DICTATION}
                                piece={pieceOf(b.item)}
                                n={q.n}
                                state={state()}
                                acts={acts()}
                                closed={closed()}
                                flow={flow()}
                                look={look()}
                                draw={props.draw}
                            />
                        )}
                    </For>
                </div>
            );
    }
}

/** What a grown-up looks for in a piece they read, as the item's check says it, or null for an item the machine marks. */
const lookFor = (item: PackItem): string | null =>
    (pieceOf(item) && item.check?.settings["look-for"]) || null;

/** An answer in words, as a worked example or a reader's key shows it: a picked one reads as its label. */
const answerText = (q: PackQuestion): string =>
    Object.entries(q.answers)
        .map(([k, v]) => q.labels?.[k] ?? v)
        .join(", ");

function Question(props: {
    q: PackQuestion;
    way: SheetWay;
    /** What a grown-up looks for, for a piece they read, which a reader's key shows in place of an answer. */
    /** The item the question was drawn from, whose check says which drawing a program plays in. */
    item: PackItem;
    lookFor: string | null;
    /** The points a grown-up ticks for a piece, which a reader's key lists under what to look for. */
    notice: string[];
    /** A dictation: its answer is the sentence a grown-up reads aloud, or the device plays. */
    dictates: boolean;
    /** What the child makes for a grown-up, for a question handed in. */
    piece: Piece | null;
    n: number;
    /** What the sheet shows of it; null on a reader's sheet, which shows the key instead. */
    state: SheetState | null;
    /** What may be done to it; null wherever the sheet is only read. */
    acts: SheetActs | null;
    /** The sheet is finished: what was written stays, and nothing more is taken. */
    closed: boolean;
    flow: Flow | null;
    /** A sheet being looked at, where the companion still helps and nothing is recorded. */
    look: Look | null;
    draw: SceneDrawer;
}): JSX.Element {
    const [told, setTold] = createSignal<Told | null>(props.state?.done(props.q.n) ?? null);
    // the part the companion rings, over what a wrong try rings
    const [ring, setRing] = createSignal<string | null>(null);
    let ringing = 0;
    onCleanup(() => clearTimeout(ringing));
    // the easier thing the companion drew beside the question
    const [easier, setEasier] = createSignal<Help["easier"]>(null);
    const hints = props.state ? hintsOn(props.q, props.state, props.acts) : null;
    const [tries, setTries] = createSignal(0);
    // the hints the companion opened on a sheet being looked at
    const [shown, setShown] = createSignal<string[]>([]);
    let active = 0;
    let figure: HTMLElement | undefined;
    const working = (e: Event): void => {
        if (looking(e) || isDone()) return;
        // the first touch of a spell of work asks the page for the whole question, its buttons at the
        // foot included, so a child never reaches for a Check that is off the window (world.tsx)
        if (Date.now() - active > SETTLING)
            figure?.dispatchEvent(new Event(REVEAL, { bubbles: true }));
        active = Date.now();
    };
    const worked = (): boolean => props.way === "worked";
    /** A program the question shows, played under its picture; a build is ProgramQuestion's. */
    const coding = (): CodingTarget | null => codingTarget(props.q, props.item);
    /** The question asks what its program does, so it is played only once answered. */
    const asks = (): boolean => asksWhatItDoes(props.q, props.item, coding());
    /** The sheet is read or the question is done, so a played drawing may fill in its answers. */
    const reveal = (): boolean => worked() || !props.state || isDone();
    /** The question is typed or picked into, so Strip draws its picture and the strip under it. */
    const typedHere = (): boolean => props.way === "typed" && !!props.state;
    const key = (): Record<string, string> | null =>
        worked() ? props.q.answers : (told()?.key ?? null);
    const arranging = (): { scene: Scene; part: ArrangedPart } | null => {
        const part = props.way === "arranged" ? props.state?.arranged(props.q.n) : null;
        return part && props.q.scene ? { scene: props.q.scene, part } : null;
    };
    /** Each try on the drawing checked and recorded, for a sheet that may be answered. */
    const arrangingActs = (part: ArrangedPart): Arranging | undefined => {
        const acts = props.acts;
        if (!acts) return undefined;
        return {
            tried: (places, timing) => {
                const reply = acts.arranged(
                    props.q.n,
                    part.type,
                    places,
                    part.board.measure(places),
                    timing,
                );
                if (!reply) return shownAs(part.board, places, false);
                return {
                    state: reply.state,
                    say: `${part.board.after(places)} ${reply.say}`,
                    point: reply.done ? null : reply.point,
                    places: reply.done && !reply.right ? part.key : places,
                    done: reply.done,
                };
            },
        };
    };
    const [arrangedTold, setArrangedTold] = createSignal<Arranged | null>(
        arranging()?.part.told ?? null,
    );
    const programming = (): { scene: Scene; part: ProgramPad } | null => {
        const part = props.way === "program" ? props.state?.program(props.q.n) : null;
        return part && props.q.scene ? { scene: props.q.scene, part } : null;
    };
    /** Each run of the program judged and recorded, for a sheet that may be answered. */
    const programActs = (pad: ProgramPad): Programming | undefined => {
        const acts = props.acts;
        if (!acts) return undefined;
        return {
            tried: (lines, timing) => {
                const reply = acts.program(props.q.n, lines, pad.runs(lines), timing);
                if (!reply) return { state: "again", say: "", lines, done: false };
                return {
                    state: reply.state,
                    say: reply.say,
                    lines: reply.done && !reply.right ? pad.key : lines,
                    done: reply.done,
                };
            },
        };
    };
    const [builtTold, setBuiltTold] = createSignal<Built | null>(programming()?.part.told ?? null);
    /**
     * Whenever what a question holds changes size, a reply line, a hint, a weight standing somewhere
     * new, its strip asks to be seen, so a child's Check and the line that answers them never slip
     * below the window mid-answer. The strip is small enough to hold whatever the question's height.
     */
    let asking = 0;
    const seen = (): void => {
        const ask = (): void => {
            const strip = figure?.querySelector<HTMLElement>(".ls-strip, .ar-bar") ?? figure;
            strip?.dispatchEvent(new Event(REVEAL, { bubbles: true }));
        };
        requestAnimationFrame(ask);
        // and once more when the reply line and what it pushed down have settled
        clearTimeout(asking);
        asking = window.setTimeout(ask, SETTLED);
    };
    onCleanup(() => clearTimeout(asking));
    // what a question holds grows and shrinks as a child works: a reply line, a hint, a weight standing
    // somewhere new. Watching its own height catches every kind of question, the drawn ones included.
    let tall = 0;
    const watch = (el: HTMLElement): void => {
        const eye = new ResizeObserver(() => {
            const now = el.getBoundingClientRect().height;
            if (tall && Math.abs(now - tall) > 1 && Date.now() - active < WORKING) seen();
            tall = now;
        });
        eye.observe(el);
        onCleanup(() => eye.disconnect());
    };
    const isDone = (): boolean =>
        (told()?.done ?? false) || (arrangedTold()?.done ?? false) || (builtTold()?.done ?? false);
    const current = (): boolean => !isDone() && props.flow?.current() === props.q.n;
    createEffect(() => {
        if (isDone()) props.flow?.done(props.q.n, Date.now() - active < WORKING);
    });
    const desk = deskOf();
    /** What the companion can do on this question, for a sheet that may be answered. */
    function deskOf(): companion.Desk | null {
        const acts = props.acts;
        const flow = props.flow;
        if (props.look && props.q.n > 0) return lookDesk(props.look);
        if (!acts || !flow || !hints || props.q.n <= 0) return null;
        const d: companion.Desk = {
            where: () => ({
                lesson: flow.lesson,
                level: flow.level,
                n: props.q.n,
                variant: props.q.variant,
                hints: hints.hints().length,
                tries: tries(),
                said: told()?.say || arrangedTold()?.say || builtTold()?.say || null,
                worked: easier() !== null,
            }),
            hint: () => {
                const had = hints.hints().length;
                hints.hint();
                return hints.hints().length > had ? (hints.hints().at(-1) ?? null) : null;
            },
            ring: (part) => {
                if (!props.q.scene || !(part in props.q.scene.boxes) || isDone()) return false;
                setRing(part);
                clearTimeout(ringing);
                ringing = window.setTimeout(() => setRing(null), companion.RING_FOR);
                acts.asked(props.q.n, "where", part);
                return true;
            },
            worked: () => {
                const e = props.state?.help(props.q.n)?.easier ?? null;
                if (!e) return null;
                setEasier(e);
                acts.asked(props.q.n, "easier", e.kind);
                return e.kind === "worked"
                    ? `A worked example is showing beside the question. It asks "${e.question.ask}", and its answer is ${answerText(e.question)}.`
                    : `An easier one like it is showing beside the question. It asks "${e.question.ask}".`;
            },
            talked: (face) => acts.asked(props.q.n, "talk", face),
        };
        flow.desks.set(props.q.n, d);
        onCleanup(() => {
            if (flow.desks.get(props.q.n) === d) flow.desks.delete(props.q.n);
        });
        return d;
    }
    /** On a sheet being looked at: the same help, shown on the sheet and recorded nowhere. */
    function lookDesk(look: Look): companion.Desk {
        return {
            where: () => ({
                lesson: look.lesson,
                level: look.level,
                n: props.q.n,
                variant: props.q.variant,
                hints: shown().length,
                tries: 0,
                said: null,
                worked: easier() !== null,
            }),
            hint: () => {
                const next = props.q.hints[shown().length];
                if (next === undefined) return null;
                setShown([...shown(), next]);
                return next;
            },
            ring: (part) => {
                if (!props.q.scene || !(part in props.q.scene.boxes)) return false;
                setRing(part);
                clearTimeout(ringing);
                ringing = window.setTimeout(() => setRing(null), companion.RING_FOR);
                return true;
            },
            worked: () => {
                const q = look.worked(props.item);
                if (!q) return null;
                setEasier({ kind: "worked", question: q });
                return `A worked example is showing beside the question. It asks "${q.ask}", and its answer is ${answerText(q)}.`;
            },
            talked: () => undefined,
        };
    }
    /** A try told, which the companion hears about if it is talking about this question. */
    const after = (state: string, say: string): void => {
        setTries((n) => n + 1);
        if (desk) companion.checked(desk, state === "right", say);
    };
    const onTyped = (t: Told): void => {
        setTold(t);
        if (t.state !== "handed-in") after(t.state, t.say);
    };
    const help = (
        <Show when={desk && (props.look || current()) && !props.closed && companion.offered()}>
            <button
                type="button"
                class="ls-companion"
                aria-label="Help with this one"
                title="Help with this one"
                onClick={(e) => {
                    if (desk) companion.ask("help", desk, e.currentTarget);
                }}
            >
                <Icon name="help" />
            </button>
        </Show>
    );
    const opened = (): string[] => hints?.hints() ?? [];
    return (
        <figure
            class="ls-q"
            classList={{
                done: isDone(),
                current: current(),
                arranged: !!arranging() || !!programming(),
            }}
            data-n={props.q.n}
            aria-current={current() ? "step" : undefined}
            ref={(el) => {
                figure = el;
                watch(el);
                // the child's own work in the question, which the sheet follows on from: a tap rather
                // than a press, since a finger that goes down on a question may be moving the paper
                for (const kind of ["input", "click", "keydown"])
                    el.addEventListener(kind, working, true);
            }}
        >
            <span class="ls-n" classList={{ worked: props.q.n === 0 }} aria-hidden="true">
                {props.q.n === 0 ? "✓" : props.q.n}
            </span>
            <Show when={isDone() && props.q.n > 0}>
                <span class="ls-tick" aria-hidden="true">
                    ✓
                </span>
            </Show>
            <span class="sr">
                {props.q.n === 0
                    ? "Worked example."
                    : `Question ${props.q.n}.${isDone() ? " Done." : current() ? " Your turn." : ""}`}
            </span>
            <Switch
                fallback={
                    // a typed question draws its own picture, since the answer may be written on it
                    <Show when={!typedHere()}>
                        <Show when={props.q.scene} fallback={<p class="ls-ask">{props.q.ask}</p>}>
                            {(scene) => (
                                <SceneTile
                                    scene={scene()}
                                    point={ring() ?? told()?.point ?? null}
                                    key={key()}
                                    coding={coding()}
                                    held={asks() && !reveal()}
                                    reveal={reveal()}
                                    here={[]}
                                    draw={props.draw}
                                />
                            )}
                        </Show>
                    </Show>
                }
            >
                <Match when={arranging()}>
                    {(a) => (
                        <ArrangedQuestion
                            scene={a().scene}
                            part={a().part}
                            hints={opened}
                            help={help}
                            point={ring()}
                            acts={arrangingActs(a().part)}
                            closed={props.closed}
                            draw={props.draw}
                            onTold={(t) => {
                                setArrangedTold(t);
                                after(t.state, t.say);
                            }}
                        />
                    )}
                </Match>
                <Match when={programming()}>
                    {(p) => (
                        <ProgramQuestion
                            scene={p().scene}
                            part={p().part}
                            hints={opened}
                            help={help}
                            acts={programActs(p().part)}
                            closed={props.closed}
                            draw={props.draw}
                            onTold={(t) => {
                                setBuiltTold(t);
                                after(t.state, t.say);
                            }}
                        />
                    )}
                </Match>
            </Switch>
            <Show when={worked()}>
                <figcaption class="ls-answer">
                    <Show
                        when={props.lookFor}
                        fallback={
                            <>
                                <span class="label">
                                    {props.dictates ? "Read aloud" : "Answer"}
                                </span>{" "}
                                {answerText(props.q)}
                                <Show when={props.q.explain}>
                                    {(words) => (
                                        <>
                                            <br />
                                            {words()}
                                        </>
                                    )}
                                </Show>
                            </>
                        }
                    >
                        {(look) => (
                            <>
                                <span class="label">Look for</span> {look()}
                                <For each={props.notice}>
                                    {(point) => (
                                        <>
                                            <br />
                                            <span class="ls-notice" aria-hidden="true">
                                                {"☐ "}
                                            </span>
                                            {point}
                                        </>
                                    )}
                                </For>
                            </>
                        )}
                    </Show>
                    <For each={props.q.n === 0 ? [] : props.q.hints}>
                        {(hint) => (
                            <>
                                <br />
                                <span class="label">Hint</span> {hint}
                            </>
                        )}
                    </For>
                </figcaption>
            </Show>
            <Show when={typedHere() && props.state}>
                {(state) => (
                    <Strip
                        q={props.q}
                        coding={coding()}
                        asks={asks()}
                        dictates={props.dictates}
                        scene={props.q.scene ?? null}
                        state={state()}
                        acts={props.acts}
                        closed={props.closed}
                        current={current()}
                        told={told()}
                        onTold={onTyped}
                        hints={opened()}
                        help={help}
                        point={ring() ?? told()?.point ?? null}
                        sceneKey={key()}
                        draw={props.draw}
                    />
                )}
            </Show>
            <Show when={props.way === "grown-up" && props.state}>
                {(state) => (
                    <HandIn
                        piece={props.piece ?? "writing"}
                        q={props.q}
                        state={state()}
                        acts={props.acts}
                        closed={props.closed}
                        told={told()}
                        onTold={setTold}
                        hints={opened()}
                        help={help}
                    />
                )}
            </Show>
            <Show when={props.look && desk && companion.offered()}>
                <div class="ls-looked-help">{help}</div>
                <ol class="ls-hints">
                    <For each={shown()}>{(h) => <li>{h}</li>}</For>
                </ol>
            </Show>
            <Show when={easier()}>{(e) => <Easier easier={e()} draw={props.draw} />}</Show>
            <Show when={props.way === "other" && props.state}>
                <p class="ls-note">{OTHER_WAY}</p>
            </Show>
        </figure>
    );
}

/**
 * A pack's scene on the paper, drawn again whenever the part to ring or the answers to write change,
 * with a pencil mark round each part named in `here`, where the answer to the question now goes.
 */
function SceneTile(props: {
    scene: Scene;
    point: string | null;
    key: Record<string, string> | null;
    here: string[];
    /** What a child writes in, laid over the exact box the scene drew for it. */
    slots?: readonly { box: Box; child: JSX.Element }[];
    /** A program or a toy the scene holds, played under it; a build is drawn elsewhere. */
    coding?: CodingTarget | null;
    /** The question asks what the program does and is not answered yet, so it is not played. */
    held?: boolean;
    /** The child's answer in words, said beside what the program did when they run it to check. */
    answered?: () => string;
    /** The sheet is read, so a played drawing may fill in what a child would otherwise write. */
    reveal?: boolean;
    draw: SceneDrawer;
}): JSX.Element {
    let tile: HTMLDivElement | undefined;
    let drawn: SVGSVGElement | undefined;
    const [times, setTimes] = createSignal(0);
    createEffect(
        on(
            () => [props.scene, props.point, props.key] as const,
            ([scene, point, key]) => {
                if (!tile) return;
                const svg = props.draw(tile, scene, {
                    ...(point === null ? {} : { point }),
                    ...(key === null ? {} : { key }),
                });
                if (drawn?.isConnected) drawn.replaceWith(svg);
                else tile.prepend(svg);
                drawn = svg;
                setTimes((n) => n + 1);
            },
        ),
    );
    /** A box of the scene as a share of it, so a mark or a place to write sits on it at any size. */
    const over = (
        id: string,
    ): { left: string; top: string; width: string; height: string } | null => {
        const [w, h] = props.scene.size;
        const b = props.scene.boxes[id];
        return b && w && h
            ? {
                  left: `${(b.x / w) * 100}%`,
                  top: `${(b.y / h) * 100}%`,
                  width: `${(b.w / w) * 100}%`,
                  height: `${(b.h / h) * 100}%`,
              }
            : null;
    };
    const marks = (): { left: string; top: string; width: string; height: string }[] =>
        props.here.flatMap((id) => {
            const at = over(id);
            return at ? [at] : [];
        });
    const written = (): {
        at: { left: string; top: string; width: string; height: string };
        child: JSX.Element;
    }[] => {
        const [w, h] = props.scene.size;
        return (props.slots ?? []).map((s) => ({
            at: {
                left: `${(s.box.x / w) * 100}%`,
                top: `${(s.box.y / h) * 100}%`,
                width: `${(s.box.w / w) * 100}%`,
                height: `${(s.box.h / h) * 100}%`,
            },
            child: s.child,
        }));
    };
    const played = (): CodingTarget | null => {
        const c = props.coding;
        return c && (c.mode === "toy" || (c.mode === "run" && c.setup)) ? c : null;
    };
    const playable = (): CodingTarget | null => (props.held ? null : played());
    return (
        <>
            <div class="scene-tile on-paper">
                <div
                    ref={(el) => {
                        tile = el;
                    }}
                    class="ls-scene"
                >
                    <For each={marks()}>
                        {(m) => <span class="ls-here" style={m} aria-hidden="true" />}
                    </For>
                    <For each={written()}>
                        {(w) => (
                            <span class="ls-inbox" style={w.at}>
                                {w.child}
                            </span>
                        )}
                    </For>
                </div>
            </div>
            <Show when={props.held && played()}>
                <div class="cr">
                    <p class="cr-said">{PREDICT_FIRST}</p>
                </div>
            </Show>
            <Show when={playable()}>
                {(c) => (
                    <CodingControls
                        scene={props.scene}
                        target={c()}
                        tile={() => tile}
                        drawn={times}
                        reveal={props.reveal ?? false}
                        {...(props.answered ? { answered: props.answered } : {})}
                    />
                )}
            </Show>
        </>
    );
}

/** The keyboard a box asks a phone for: digits for a whole number, digits and a point for a decimal. */
const keyboardOf = (answer: string): "numeric" | "decimal" | "text" =>
    /^\d+$/.test(answer) ? "numeric" : /^-?\d+([.,]\d+)?$/.test(answer) ? "decimal" : "text";

/** How long a box shows that its answer was taken, in ms. */
const TAKEN = 900;

/**
 * A question's hints: those already opened, which every sheet shows, and opening another, which only
 * a sheet with actions can do, when the companion asks for it.
 */
function hintsOn(
    q: PackQuestion,
    state: SheetState,
    acts: SheetActs | null,
): { hints: () => string[]; hint: () => void } {
    const [hints, setHints] = createSignal<string[]>(state.opened(q.n));
    return {
        hints,
        hint: () => {
            // the grown-up's setting may hold hints back until a first try
            if (!acts || !state.mayHint(q.n)) return;
            const h = acts.hint(q.n);
            if (h !== null) setHints([...hints(), h]);
        },
    };
}

/** How long a question was on the page before the child first did something with it, and whether they left the page meanwhile. */
function timingOn(): { first: () => void; now: () => Timing } {
    const shown = Date.now();
    let first = 0;
    let left = false;
    const away = (): void => {
        if (document.hidden) left = true;
    };
    document.addEventListener("visibilitychange", away);
    onCleanup(() => document.removeEventListener("visibilitychange", away));
    return {
        first: () => {
            if (!first) first = Date.now();
        },
        now: () => {
            const now = Date.now();
            return {
                k: "screen",
                toFirstInput: (first || now) - shown,
                toAnswer: now - (first || now),
                leftPage: left,
            };
        },
    };
}

/** The easier thing the companion drew beside a question: its picture, and the answer of a worked example. */
function Easier(props: { easier: NonNullable<Help["easier"]>; draw: SceneDrawer }): JSX.Element {
    return (
        <figure class="ls-easier">
            <Show
                when={props.easier.question.scene}
                fallback={<p class="ls-ask">{props.easier.question.ask}</p>}
            >
                {(scene) => (
                    <SceneTile
                        scene={scene()}
                        point={null}
                        key={props.easier.kind === "worked" ? props.easier.question.answers : null}
                        here={[]}
                        draw={props.draw}
                    />
                )}
            </Show>
            <Show when={props.easier.kind === "worked"}>
                <figcaption class="ls-answer">
                    <span class="label">Worked answer</span> {answerText(props.easier.question)}
                </figcaption>
            </Show>
        </figure>
    );
}

/**
 * The strip under a piece a grown-up reads: the child writes it on paper, since the sheet has no
 * pen yet (.docs/writing.md, "How writing is marked"), and says so once, which the sitting records
 * for the grown-up to mark.
 */
function HandIn(props: {
    piece: Piece;
    q: PackQuestion;
    state: SheetState;
    acts: SheetActs | null;
    closed: boolean;
    told: Told | null;
    onTold: (t: Told) => void;
    hints: string[];
    /** The button that asks the companion for help. */
    help: JSX.Element;
}): JSX.Element {
    const timing = timingOn();
    const done = (): boolean => (props.told?.done ?? false) || props.closed || !props.acts;
    const hand = (): void => {
        if (done()) return;
        // handed in and recorded, and the sheet reads back what the question is now
        if (!props.acts?.handIn(props.q.n, timing.now())) return;
        const t = props.state.done(props.q.n);
        if (t) props.onTold(t);
    };
    return (
        <div class="ls-strip" data-state={props.told?.state ?? ""}>
            <p class="ls-note">{ON_PAPER[props.piece].say}</p>
            <div class="ls-row">
                <button type="button" class="ls-go" disabled={done()} onClick={hand}>
                    {ON_PAPER[props.piece].done}
                </button>
                {props.help}
            </div>
            <ol class="ls-hints">
                <For each={props.hints}>{(h) => <li>{h}</li>}</For>
            </ol>
            <p class="ls-said" aria-live="polite">
                {props.told?.say ?? ""}
            </p>
        </div>
    );
}

/**
 * A question a child types or picks the answer to: its picture, and the strip under it with Check, a
 * hint and the reply line. The picture is drawn here rather than by the question, because where the
 * answer is written depends on both: a scene that draws a box for the answer holds the child's
 * writing in it, the way the printed sheet does, and there is no second box under the picture.
 */
function Strip(props: {
    q: PackQuestion;
    /** A program the question shows, played under its picture. */
    coding: CodingTarget | null;
    /** The question asks what that program does, so it is played only once answered. */
    asks: boolean;
    /** A dictation, whose sentence the device can play and a grown-up can read from their sheet. */
    dictates: boolean;
    /** The question's picture, or null where it asks in words alone. */
    scene: Scene | null;
    state: SheetState;
    acts: SheetActs | null;
    closed: boolean;
    /** The question to do now, whose box looks ready. */
    current: boolean;
    told: Told | null;
    onTold: (t: Told) => void;
    hints: string[];
    /** The button that asks the companion for help. */
    help: JSX.Element;
    /** What the drawing shows: the part a rule or the companion points at, and the answers written in once it is done. */
    point: string | null;
    sceneKey: Record<string, string> | null;
    draw: SceneDrawer;
}): JSX.Element {
    const keys = Object.keys(props.q.answers);
    const [typed, setTyped] = createSignal<Record<string, string>>(props.state.written(props.q.n));
    const [said, setSaid] = createSignal("");
    // a try was taken just now, which the box shows for a moment
    const [taken, setTaken] = createSignal(false);
    let settle = 0;
    onCleanup(() => clearTimeout(settle));
    const timing = timingOn();
    const done = (): boolean => (props.told?.done ?? false) || props.closed || !props.acts;
    const put = (k: string, v: string): void => {
        timing.first();
        setTyped({ ...typed(), [k]: v });
    };
    const check = (): void => {
        const acts = props.acts;
        if (done() || !acts) return;
        const now = typed();
        const reply = acts.typed(props.q.n, now, timing.now());
        if (!reply) {
            setSaid(acts.empty);
            return;
        }
        const t: Told = {
            state: reply.state,
            say: reply.say,
            point: reply.done ? null : reply.point,
            // the child's own answer written into the drawing when right, the answer when shown
            key: !reply.done
                ? null
                : reply.right
                  ? Object.fromEntries(
                        Object.keys(props.q.answers).map((k) => [k, now[k]?.trim() ?? ""]),
                    )
                  : props.q.answers,
            done: reply.done,
        };
        setSaid(t.say);
        setTaken(true);
        clearTimeout(settle);
        settle = window.setTimeout(() => setTaken(false), TAKEN);
        props.onTold(t);
    };
    const label = (k: string): string =>
        keys.length > 1 ? `Question ${props.q.n}, ${k}` : `Your answer to question ${props.q.n}`;
    const boxes = (): Record<string, Box> => (props.scene ? inputBoxes(props.scene) : {});
    const choices = (): Record<string, { value: string; box: Box }[]> =>
        props.scene ? choiceBoxes(props.scene) : {};
    /**
     * Whether an answer is written on the picture: the scene drew a box of its own for it, which on
     * paper is the box a child writes in. A box a scene draws round something else, a column sum's
     * grid or an equation with a blank in it, is not one of these, and its answer keeps the row.
     */
    const sceneBox = (k: string): Box | undefined => (props.acts ? boxes()[k] : undefined);
    const onScene = (k: string): boolean => !!sceneBox(k);
    const choiceOnScene = (k: string): boolean => !!props.acts && !!choices()[k]?.length;
    const letterCount = (k: string): number =>
        props.scene?.nodes.some((node) => node.id === k && node.type === "word-input")
            ? Math.round((boxes()[k]?.w ?? 0) / 2)
            : 0;
    const answerIn = (k: string): JSX.Element => (
        <input
            class="ls-in"
            type="text"
            autocomplete="off"
            spellcheck={false}
            inputMode={keyboardOf(props.q.answers[k] ?? "")}
            enterkeyhint="done"
            autocapitalize="off"
            autocorrect="off"
            placeholder={props.current && !done() ? "?" : ""}
            aria-label={label(k)}
            disabled={done()}
            value={typed()[k] ?? ""}
            onInput={(e) => put(k, e.currentTarget.value)}
            onKeyDown={(e) => {
                if (e.key === "Enter") check();
            }}
        />
    );
    // the dashed mark on the picture is for an answer written under it; a box written in is its own mark
    const here = (): string[] => (props.current && !done() ? keys.filter((k) => !onScene(k)) : []);
    /** Answers written on the picture, while there is still one to write: once done, the drawing carries it in the teacher's pen. */
    const slots = (): { box: Box; child: JSX.Element }[] =>
        done()
            ? []
            : keys.flatMap((k) => {
                  if (choiceOnScene(k))
                      return (choices()[k] ?? []).map((choice) => {
                          const option = props.state
                              .options(props.q.n, k)
                              .find((candidate) => candidate.value === choice.value);
                          return {
                              box: choice.box,
                              child: (
                                  <button
                                      type="button"
                                      class="ls-inbox-pick"
                                      aria-label={`${label(k)}: ${option?.label ?? choice.value}`}
                                      aria-pressed={typed()[k] === choice.value}
                                      onClick={() => put(k, choice.value)}
                                  />
                              ),
                          };
                      });
                  const box = sceneBox(k);
                  return box
                      ? [
                            {
                                box,
                                child: (
                                    <span
                                        class="ls-inbox-in"
                                        classList={{ taken: taken(), ready: props.current }}
                                    >
                                        {letterCount(k) > 0 ? (
                                            <LetterInputs
                                                count={letterCount(k)}
                                                value={typed()[k] ?? ""}
                                                label={label(k)}
                                                current={props.current}
                                                put={(value) => put(k, value)}
                                                check={check}
                                            />
                                        ) : (
                                            answerIn(k)
                                        )}
                                    </span>
                                ),
                            },
                        ]
                      : [];
              });
    return (
        <>
            <Show when={props.scene} fallback={<p class="ls-ask">{props.q.ask}</p>}>
                {(scene) => (
                    <SceneTile
                        scene={scene()}
                        point={props.point}
                        key={props.sceneKey}
                        here={here()}
                        slots={slots()}
                        coding={props.coding}
                        held={props.asks && !done()}
                        answered={() =>
                            props.asks
                                ? answeredWords(
                                      props.q,
                                      typed(),
                                      (k, v) =>
                                          props.state
                                              .options(props.q.n, k)
                                              .find((o) => o.value === v)?.label ?? v,
                                  )
                                : ""
                        }
                        reveal={done()}
                        draw={props.draw}
                    />
                )}
            </Show>
            <div
                class="ls-strip"
                classList={{ taken: taken(), ready: props.current }}
                data-state={props.told?.state ?? ""}
            >
                <Show when={props.dictates}>
                    <div class="ls-row">
                        <p class="ls-note">{DICTATE}</p>
                        <Show when={voice().available()}>
                            <button
                                type="button"
                                class="ls-help"
                                disabled={done()}
                                onClick={() => voice().speak(props.q.answers.answer ?? "")}
                            >
                                Hear the sentence
                            </button>
                        </Show>
                    </div>
                </Show>
                <div class="ls-row">
                    <For each={keys}>
                        {(k) => {
                            const options = props.state.options(props.q.n, k);
                            return options.length && !choiceOnScene(k) ? (
                                <fieldset class="ls-picks">
                                    <legend class="sr">{label(k)}</legend>
                                    <For each={options}>
                                        {(o) => (
                                            <button
                                                type="button"
                                                class="ls-pick"
                                                aria-pressed={typed()[k] === o.value}
                                                disabled={done()}
                                                onClick={() => put(k, o.value)}
                                            >
                                                {o.label}
                                            </button>
                                        )}
                                    </For>
                                </fieldset>
                            ) : (
                                <Show when={!onScene(k) && !choiceOnScene(k)}>
                                    <label class="ls-key">
                                        <Show when={keys.length > 1}>
                                            <span>{k}</span>
                                        </Show>
                                        {answerIn(k)}
                                    </label>
                                </Show>
                            );
                        }}
                    </For>
                    <button type="button" class="ls-go" disabled={done()} onClick={check}>
                        Check
                    </button>
                    {props.help}
                </div>
                <ol class="ls-hints">
                    <For each={props.hints}>{(h) => <li>{h}</li>}</For>
                </ol>
                <p class="ls-said" aria-live="polite">
                    {said()}
                </p>
            </div>
        </>
    );
}

const ON_PAPER_THEN =
    "This one was done on paper, so the answers are on the sheet a grown-up marked.";
const CHANGED_SINCE =
    "This lesson has changed since it was done, so the answers given then are not shown.";

/** A day as it reads on a sheet's corner: "Monday, September 7". */
export const longDay = (iso: string): string =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
    });

/**
 * A finished day's lesson as the child left it, drawn and measured for a page to lay where it wants:
 * the child looking back in their world (apps/kids/inside.tsx) and a grown-up reading the day in the
 * journal (apps/home/journal.tsx) both draw it from the same `Left` questions, which
 * `leftIn` in school/lessons.ts folds out of the lesson's own events. It is finished, with the
 * answers of the last sitting on a screen written in and ticked where they were right, and nothing
 * to type into. A lesson done on paper, or one whose file has changed since, has no answers on the
 * screen to show, and the sheet says which.
 */
export function pastSheet(o: {
    lesson: PackLesson;
    level: Level;
    left: readonly Left[];
    was: "screen" | "paper" | "changed";
    /** The child whose sheet it is, for the lines that name them. */
    child: string;
    date: string;
    /** The corner's label: what the page calls the sheet, which is that it is finished unless it says otherwise. */
    label?: string;
    width: number;
    narrow: boolean;
    draw: SceneDrawer;
    /** Where it is drawn to be measured: a page's own layer, so its drawings read the page's palette. */
    measureIn: HTMLElement;
}): Measured | null {
    const left = new Map(o.left.map((l) => [l.n, l]));
    const state = sheetState({ at: (n) => left.get(n) });
    const note =
        o.was === "paper" ? ON_PAPER_THEN : o.was === "changed" ? CHANGED_SINCE : undefined;
    return measured(o.measureIn, (ref) => (
        <LessonSheet
            lesson={o.lesson}
            level={o.level}
            strip={{ label: o.label ?? "Finished", date: longDay(o.date) }}
            width={o.width}
            narrow={o.narrow}
            limits={{ sheets: "open", state, child: o.child }}
            draw={o.draw}
            finished
            {...(note ? { note } : {})}
            ref={ref}
        />
    ));
}

/**
 * A lesson's sheet as written, drawn and measured for a page to lay where it wants, as `pastSheet`
 * draws a finished one: for looking, at a level, with the answers, the hints and the notes for
 * grown-ups when `key` is on, and as a child has it, with nothing filled in, when it is off. The
 * grown-ups' map draws every sheet of a world this way, and so does the overlay a lesson page opens.
 */
export function lookSheet(o: {
    lesson: PackLesson;
    level: Level;
    /** The corner's label: what the page calls the sheet, such as its subject. */
    label: string;
    /** The corner's day, for a sheet shown on the day it is for (the site's sample roll); none by default. */
    date?: string;
    key: boolean;
    width: number;
    narrow: boolean;
    draw: SceneDrawer;
    /** Where it is drawn to be measured: a page's own layer, so its drawings read the page's palette. */
    measureIn: HTMLElement;
}): Measured | null {
    return measured(o.measureIn, (ref) => (
        <LessonSheet
            lesson={o.lesson}
            level={o.level}
            strip={{ label: o.label, date: o.date ?? null }}
            width={o.width}
            narrow={o.narrow}
            limits={{ sheets: "look", key: o.key }}
            draw={o.draw}
            ref={ref}
        />
    ));
}

/** A sheet drawn for a page to lay where it wants: the element, the height it measured, and how to let it go. */
export interface Measured {
    el: HTMLElement;
    height: number;
    dispose: () => void;
}

/** Draws a sheet in a layer of `measureIn`, out of sight, measures it and takes it off the page for the caller to lay. */
function measured(
    measureIn: HTMLElement,
    sheet: (ref: (el: HTMLElement) => void) => JSX.Element,
): Measured | null {
    const layer = document.createElement("div");
    layer.className = "ls-measure";
    measureIn.append(layer);
    let el: HTMLElement | undefined;
    const dispose = render(
        () =>
            sheet((node) => {
                el = node;
            }),
        layer,
    );
    const drawn = el;
    const height = drawn?.offsetHeight ?? 0;
    drawn?.remove();
    layer.remove();
    return drawn ? { el: drawn, height, dispose } : null;
}

/** Separate writing spaces, with one canonical word for checking and saved answer state. */
function LetterInputs(props: {
    count: number;
    value: string;
    label: string;
    current: boolean;
    put: (value: string) => void;
    check: () => void;
}): JSX.Element {
    const fields: HTMLInputElement[] = [];
    const focus = (index: number): void => {
        fields[index]?.focus({ preventScroll: true });
        fields[index]?.select();
    };
    const write = (index: number, text: string): void => {
        const letters = Array.from(text.normalize("NFC")).filter((c) => !/\s/.test(c));
        const next = Array.from(
            { length: props.count },
            (_, i) => Array.from(props.value)[i] ?? " ",
        );
        if (!letters.length) next[index] = " ";
        else
            letters.slice(0, props.count - index).forEach((letter, offset) => {
                next[index + offset] = letter;
            });
        props.put(next.join(""));
        // Also normalise the edited DOM value when excess pasted letters leave state unchanged.
        fields.forEach((field, i) => {
            field.value = (next[i] ?? "").trim();
        });
        if (letters.length) focus(Math.min(props.count - 1, index + letters.length));
    };
    return (
        <span class="ls-letter-boxes">
            <For each={Array.from({ length: props.count }, (_, i) => i)}>
                {(index) => (
                    <input
                        ref={(el) => {
                            fields[index] = el;
                        }}
                        class="ls-in"
                        type="text"
                        autocomplete="off"
                        spellcheck={false}
                        autocapitalize="off"
                        autocorrect="off"
                        inputMode="text"
                        enterkeyhint={index === props.count - 1 ? "done" : "next"}
                        aria-label={`${props.label}, letter ${index + 1} of ${props.count}`}
                        placeholder={props.current ? "?" : ""}
                        value={(Array.from(props.value)[index] ?? "").trim()}
                        onFocus={(e) => e.currentTarget.select()}
                        onInput={(e) => {
                            if (!e.isComposing) write(index, e.currentTarget.value);
                        }}
                        onCompositionEnd={(e) => write(index, e.currentTarget.value)}
                        onPaste={(e) => {
                            e.preventDefault();
                            write(index, e.clipboardData?.getData("text") ?? "");
                        }}
                        onKeyDown={(e) => {
                            if (e.isComposing) return;
                            if (e.key === "Enter") {
                                e.preventDefault();
                                if (index < props.count - 1) focus(index + 1);
                                else props.check();
                            } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                                e.preventDefault();
                                focus(
                                    Math.max(
                                        0,
                                        Math.min(
                                            props.count - 1,
                                            index + (e.key === "ArrowLeft" ? -1 : 1),
                                        ),
                                    ),
                                );
                            } else if (
                                e.key === "Backspace" &&
                                !e.currentTarget.value &&
                                index > 0
                            ) {
                                e.preventDefault();
                                write(index - 1, "");
                                focus(index - 1);
                            }
                        }}
                    />
                )}
            </For>
        </span>
    );
}
