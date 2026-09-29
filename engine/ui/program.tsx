// A program a child builds on a sheet (lesson.tsx), for a question a `coding.builds` check marks. The
// scene is drawn as it prints, through the sheet's drawer, and the pad is drawn again with the child's
// blocks in its slots. Under it are the blocks to add, the slots as buttons to choose a block by, the
// tools that change the chosen block and any of its numbers, and Run it, which plays the program on
// every drawing it touches through the player (code-runner.ts) and says what it did; Step plays it a
// frame at a time and records nothing. The program model and the interpreter are engine/coding.ts,
// the pad's rules are blocks.ts, and what a run records is the page's, through `Programming`.

import "./program.css";
import type { SceneDrawer } from "./scene";
import { createSignal, For, Index, onCleanup, onMount, Show, type JSX } from "solid-js";
import type { ProgramLine, Timing } from "../answer";
import { writeLines } from "../coding";
import { setupOf } from "../parts/coding/setup";
import { valuesOf, type Scene } from "../scene";
import {
    add,
    can,
    count,
    deepen,
    EMPTY,
    figuresOf,
    move,
    placedFrom,
    remove,
    setCount,
    slotWords,
    type Build,
    type Changed,
    type Pad,
} from "./blocks";
import { player, redrawNode } from "./code-runner";
import { Said } from "./code-controls";
import { loadDrawings } from "./drawings";

/** What a run told the child, and the program the pad shows: theirs, or a program that works once the last try is used. */
export interface Built {
    state: "right" | "again" | "shown";
    say: string;
    lines: ProgramLine[];
    done: boolean;
}

/** A program built from a pad's blocks, as the sheet draws it: the pad, the drawing it runs in, and where it was left. */
export interface ProgramPad {
    /** The pad's id in the scene. */
    pad: string;
    /** The id of the drawing the program runs in. */
    world: string;
    /** Whether a program reaches what the question's check asks for, run in the drawing the pad names. */
    runs(lines: readonly ProgramLine[]): boolean;
    /** A program that works, from the question's own answer, drawn once the last try is over. */
    key: ProgramLine[];
    /** Where the question was left, for a sitting picked up again. */
    told: Built | null;
}

/** What a child may do with that pad: each run judged and recorded, and the hints. A sheet drawn to be read has none. */
export interface Programming {
    tried(lines: ProgramLine[], timing: Timing): Built;
    mayHint(): boolean;
    hint(): string | null;
}

const strings = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

const whole = (v: unknown, or: number): number =>
    typeof v === "number" && Number.isFinite(v) ? Math.max(1, Math.round(v)) : or;

export function ProgramQuestion(props: {
    scene: Scene;
    part: ProgramPad;
    /** The hints opened on it already, in order. */
    opened: string[];
    /** What a child may do with it; without it the program is read and nothing is taken. */
    acts?: Programming;
    /** The sheet is finished, or the question was answered on another visit: nothing more is taken. */
    closed: boolean;
    draw: SceneDrawer;
    onTold?: (b: Built) => void;
}): JSX.Element {
    const padNode = props.scene.nodes.find((n) => n.id === props.part.pad);
    const worldNode = props.scene.nodes.find((n) => n.id === props.part.world);
    const padValues = padNode ? valuesOf(padNode.v) : {};
    const setup = worldNode ? setupOf(worldNode.type, valuesOf(worldNode.v)) : null;
    const pad: Pad = {
        tray: strings(padValues.tray),
        slots: whole(padValues.lines, 5),
        once: padValues.once === true,
        most: setup ? Math.max(setup.world.cols, setup.world.rows) : 20,
    };
    const told0 = props.part.told;
    const [build, setBuild] = createSignal<Build>(
        told0 ? { blocks: placedFrom(told0.lines, pad), chosen: -1 } : EMPTY,
    );
    const [told, setTold] = createSignal<Built | null>(told0);
    const [said, setSaid] = createSignal(told0?.say ?? "");
    const [spoken, setSpoken] = createSignal("");
    const [playing, setPlaying] = createSignal(false);
    const [hints, setHints] = createSignal<string[]>(props.opened);
    const [hintable, setHintable] = createSignal(props.acts?.mayHint() ?? false);
    /** Which number of the chosen block the number tools change, from 0. */
    const [which, setWhich] = createSignal(0);
    const past: Build[] = [];
    const [undoable, setUndoable] = createSignal(false);
    const keep = (b: Build): void => {
        past.push(b);
        if (past.length > 60) past.shift();
        setUndoable(true);
    };
    const done = (): boolean => (told()?.done ?? false) || props.closed;
    const locked = (): boolean => done() || playing();
    const shown = Date.now();
    let first = 0;
    let left = false;
    let tile: HTMLDivElement | undefined;
    let loaded = false;
    let running = 0;
    const away = (): void => {
        if (document.hidden) left = true;
    };
    document.addEventListener("visibilitychange", away);

    const drawPad = (): void => {
        const b = build();
        if (!tile || !padNode || !loaded) return;
        redrawNode(tile, props.scene, padNode, {
            placed: writeLines([...b.blocks]),
            sel: b.chosen + 1,
            used: pad.once ? b.blocks.map((x) => x.from) : [],
            run: running,
        });
    };
    /** The blocks in the slots, as lines of a program. */
    const lines = (): ProgramLine[] =>
        build().blocks.map((b) => ({ text: b.text, depth: b.depth }));
    let timing: Timing | null = null;
    const played = worldNode
        ? player({
              tile: () => tile,
              scene: props.scene,
              target: { mode: "build", node: worldNode, setup, listing: null },
              reveal: false,
              say: setSaid,
              speak: setSpoken,
              onLine: (line) => {
                  running = line;
                  drawPad();
              },
              onPlaying: setPlaying,
              onEnd: (play, by) => {
                  const acts = props.acts;
                  const t = timing;
                  timing = null;
                  if (by !== "run" || !acts || !t) return;
                  const blocks = lines();
                  const b = acts.tried(blocks, t);
                  // a program that draws random numbers is judged on every number they could be,
                  // and this run showed one of them
                  const chance =
                      play.draws.length && b.state !== "right"
                          ? " It has to work for every number random could give."
                          : "";
                  setTold(b);
                  setSaid(`${said()} ${b.say}${chance}`.trim());
                  setHintable(acts.mayHint());
                  if (b.done) {
                      setBuild({ blocks: placedFrom(b.lines, pad), chosen: -1 });
                      if (b.state !== "right") played?.show(writeLines(b.lines));
                  }
                  drawPad();
                  props.onTold?.(b);
              },
          })
        : null;
    onCleanup(() => {
        document.removeEventListener("visibilitychange", away);
        played?.forget();
    });

    onMount(() => {
        if (!tile) return;
        tile.replaceChildren(props.draw(tile, props.scene, {}));
        const types = [padNode?.type, worldNode?.type].filter((t): t is string => !!t);
        void loadDrawings(types).then(() => {
            loaded = true;
            drawPad();
            const t = told();
            if (t?.done) played?.show(writeLines(t.lines));
        });
        if (!told0)
            setSaid("Tap a block to add it to the slots, then press Run it to see what it does.");
    });

    const change = (c: Changed): void => {
        if (!first) first = Date.now();
        setSaid(c.said);
        if (!c.build) return;
        keep(build());
        setBuild(c.build);
        drawPad();
        played?.reset();
        setSaid(c.said);
    };
    const choose = (i: number): void => {
        const b = build();
        if (!b.blocks[i]) return;
        setBuild({ ...b, chosen: i });
        setWhich(0);
        setSaid(`${slotWords(b, i)}. Change it with the buttons, or with the arrow keys.`);
        drawPad();
    };
    const undo = (): void => {
        const was = past.pop();
        setUndoable(past.length > 0);
        if (!was) return;
        setBuild(was);
        setSaid("Undone.");
        drawPad();
        played?.reset();
        setSaid("Undone.");
    };
    const clear = (): void => {
        if (!build().blocks.length) return;
        keep(build());
        setBuild(EMPTY);
        drawPad();
        played?.reset();
        setSaid("The slots are empty.");
    };
    const hint = (): void => {
        const acts = props.acts;
        const h = acts?.hint();
        if (!acts || h === null || h === undefined) return;
        setHints([...hints(), h]);
        setHintable(acts.mayHint());
    };

    /** Plays the program on the drawing, lighting the running slot, then judges it. */
    const runIt = (): void => {
        if (locked()) return;
        if (!build().blocks.length) {
            setSaid("Put some blocks in the slots first.");
            return;
        }
        const now = Date.now();
        timing = {
            k: "screen",
            toFirstInput: (first || now) - shown,
            toAnswer: now - (first || now),
            leftPage: left,
        };
        played?.run(writeLines(lines()));
    };
    /** One frame of the program, which is looking and not an answer. */
    const stepIt = (): void => {
        if (locked()) return;
        if (!build().blocks.length) {
            setSaid("Put some blocks in the slots first.");
            return;
        }
        if (!first) first = Date.now();
        played?.step(writeLines(lines()));
    };
    /** The chosen block's numbers, and the one the number tools change. */
    const figures = (): ReturnType<typeof figuresOf> => {
        const here = build().blocks[build().chosen];
        return here && !pad.once ? figuresOf(here.text, pad) : [];
    };
    const figure = (): ReturnType<typeof figuresOf>[number] | undefined =>
        figures()[Math.min(which(), figures().length - 1)];

    const keys = (e: KeyboardEvent, i: number): void => {
        if (locked()) return;
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
            e.preventDefault();
            undo();
            return;
        }
        const b = { ...build(), chosen: i };
        const acts: Record<string, () => void> = {
            ArrowUp: () =>
                e.altKey || e.shiftKey ? change(move(b, -1)) : choose(Math.max(0, i - 1)),
            ArrowDown: () =>
                e.altKey || e.shiftKey
                    ? change(move(b, 1))
                    : choose(Math.min(b.blocks.length - 1, i + 1)),
            ArrowRight: () => change(deepen(b, 1)),
            ArrowLeft: () => change(deepen(b, -1)),
            "+": () => change(count(b, pad, 1, which())),
            "=": () => change(count(b, pad, 1, which())),
            "-": () => change(count(b, pad, -1, which())),
            "]": () => setWhich(Math.min(figures().length - 1, which() + 1)),
            "[": () => setWhich(Math.max(0, which() - 1)),
            Delete: () => change(remove(b)),
            Backspace: () => change(remove(b)),
        };
        const act = acts[e.key];
        if (!act) return;
        e.preventDefault();
        act();
        const to = build().chosen;
        if (to >= 0) slotButtons[to]?.focus();
    };
    const slotButtons: HTMLButtonElement[] = [];
    const tools = (): ReturnType<typeof can> => can(build(), pad);
    const at = (): number => {
        const b = build();
        return b.chosen < 0 ? b.blocks.length : b.chosen + 1;
    };

    return (
        <div class="ls-strip pg" data-state={told()?.state ?? ""}>
            <div
                ref={(el) => {
                    tile = el;
                }}
                class="scene-tile on-paper pg-tile"
            />
            <fieldset class="pg-tray">
                <legend class="sr">Blocks to add</legend>
                <For each={pad.tray}>
                    {(text, i) => (
                        <button
                            type="button"
                            class="pg-block"
                            disabled={
                                locked() || (pad.once && build().blocks.some((b) => b.from === i()))
                            }
                            onClick={() => change(add(build(), pad, i(), at()))}
                        >
                            <span class="sr">Add </span>
                            {text}
                        </button>
                    )}
                </For>
            </fieldset>
            <ol class="pg-slots" aria-label="Your program">
                <For each={Array.from({ length: pad.slots }, (_, i) => i)}>
                    {(i) => (
                        <li>
                            <button
                                type="button"
                                class="pg-slot"
                                ref={(el) => {
                                    slotButtons[i] = el;
                                }}
                                aria-pressed={build().chosen === i}
                                aria-label={slotWords(build(), i)}
                                disabled={locked() || !build().blocks[i]}
                                style={{ "--depth": String(build().blocks[i]?.depth ?? 0) }}
                                onClick={() => choose(i)}
                                onKeyDown={(e) => keys(e, i)}
                            >
                                <span class="pg-n" aria-hidden="true">
                                    {i + 1}
                                </span>
                                <span class="pg-words" aria-hidden="true">
                                    {build().blocks[i]?.text ?? ""}
                                </span>
                            </button>
                        </li>
                    )}
                </For>
            </ol>
            <fieldset class="pg-tools">
                <legend class="sr">Change the chosen block</legend>
                <button
                    type="button"
                    disabled={locked() || !tools().up}
                    onClick={() => change(move(build(), -1))}
                >
                    Move up
                </button>
                <button
                    type="button"
                    disabled={locked() || !tools().down}
                    onClick={() => change(move(build(), 1))}
                >
                    Move down
                </button>
                <button
                    type="button"
                    disabled={locked() || !tools().in}
                    onClick={() => change(deepen(build(), 1))}
                >
                    In
                </button>
                <button
                    type="button"
                    disabled={locked() || !tools().out}
                    onClick={() => change(deepen(build(), -1))}
                >
                    Out
                </button>
                <Show when={figures().length > 1}>
                    <Index each={figures()}>
                        {(f, i) => (
                            <button
                                type="button"
                                class="pg-figure"
                                aria-pressed={i === which()}
                                aria-label={`Number ${i + 1} of ${figures().length}: ${f().value}, ${f().what}`}
                                disabled={locked()}
                                onClick={() => setWhich(i)}
                            >
                                {f().value}
                            </button>
                        )}
                    </Index>
                </Show>
                <button
                    type="button"
                    disabled={locked() || !tools().count}
                    onClick={() => change(count(build(), pad, -1, which()))}
                >
                    Fewer
                </button>
                <Show when={figure()}>
                    {(f) => (
                        <input
                            class="pg-number"
                            type="number"
                            inputmode="numeric"
                            aria-label={`The ${f().what}, from ${f().lo} to ${f().hi}`}
                            min={f().lo}
                            max={f().hi}
                            value={f().value}
                            disabled={locked()}
                            onChange={(e) => {
                                const to = Number(e.currentTarget.value);
                                const c = setCount(build(), pad, which(), to);
                                change(c);
                                e.currentTarget.value = String(figure()?.value ?? to);
                            }}
                        />
                    )}
                </Show>
                <button
                    type="button"
                    disabled={locked() || !tools().count}
                    onClick={() => change(count(build(), pad, 1, which()))}
                >
                    More
                </button>
                <button
                    type="button"
                    disabled={locked() || !tools().take}
                    onClick={() => change(remove(build()))}
                >
                    Take out
                </button>
                <button type="button" disabled={locked() || !undoable()} onClick={undo}>
                    Undo
                </button>
                <button type="button" disabled={locked() || !build().blocks.length} onClick={clear}>
                    Clear all
                </button>
            </fieldset>
            <div class="ls-row">
                <button type="button" class="ls-go" disabled={locked()} onClick={runIt}>
                    Run it
                </button>
                <button type="button" class="pg-step" disabled={locked()} onClick={stepIt}>
                    Step
                </button>
                <Said said={spoken()} />
                <Show when={hintable()}>
                    <button type="button" class="ls-hint" disabled={props.closed} onClick={hint}>
                        A hint
                    </button>
                </Show>
            </div>
            <ol class="ls-hints">
                <For each={hints()}>{(h) => <li>{h}</li>}</For>
            </ol>
            <p class="ls-said" aria-live="polite">
                {said()}
            </p>
        </div>
    );
}
