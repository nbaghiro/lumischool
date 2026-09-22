// A program a child builds on a sheet (lesson.tsx), for a question a `coding.builds` check marks. The
// scene is drawn as it prints, through the sheet's drawer, and the pad is drawn again with the child's
// blocks in its slots. Under it are the blocks to add, the slots as buttons to choose a block by, the
// tools that change the chosen block, and Run it, which plays the program on the drawing a step at a
// time and says what it did. The program model and the interpreter are engine/coding.ts, the pad's
// rules are blocks.ts, and what a run records is the page's, through `Programming`.

import "./program.css";
import type { SceneDrawer } from "./scene";
import { createSignal, For, onCleanup, onMount, Show, type JSX } from "solid-js";
import type { ProgramLine, Timing } from "../answer";
import { keyOf, parse, run, shapeOf, writeLines, type Run } from "../coding";
import { U } from "../paper";
import { RUNS, setupOf, type Setup } from "../parts/coding/setup";
import { valuesOf, type Scene, type SceneNode } from "../scene";
import {
    add,
    can,
    count,
    deepen,
    EMPTY,
    move,
    placedFrom,
    remove,
    slotWords,
    type Build,
    type Changed,
    type Pad,
} from "./blocks";
import { loadDrawings, type Shelf } from "./drawings";
import { render } from "./svg";

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

/** Seconds a step of the program takes to play. */
const STEP = 0.4;

const strings = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

const whole = (v: unknown, or: number): number =>
    typeof v === "number" && Number.isFinite(v) ? Math.max(1, Math.round(v)) : or;

/** What a program did, in words, once it has run. */
function ranWords(r: Run, s: Setup): string {
    if (r.problems.length) return `The program has a problem: ${r.problems[0] ?? ""}.`;
    const last = r.frames.at(-1);
    if (r.stopped === "bump")
        return `It bumped into ${last?.bump?.why === "edge" ? "the edge" : "a rock"} on line ${last?.line ?? 0}.`;
    if (r.stopped === "limit") return "It kept going and never stopped, so it was stopped.";
    const w = s.world,
        end = r.end;
    if (w.flag !== null && keyOf(w, end.col, end.row) === w.flag)
        return `It reached the flag${w.gems.size ? `, with ${end.got.length} of ${w.gems.size} gems` : ""}.`;
    if (s.type === "turtle") {
        const shape = shapeOf(r.segments, r.start);
        if (shape === "none") return "It drew nothing.";
        if (shape === "open") return "It drew a line that does not come back to the start.";
        return `It drew a ${shape === "closed" ? "closed shape" : shape} and came back to the start.`;
    }
    if (s.type === "maze") return `It stopped on column ${end.col}, row ${end.row}.`;
    return "That is the whole program.";
}

/** A part's nested drawing inside the scene, found by what it is and where the scene put it. */
function drawnAt(tile: HTMLElement, node: SceneNode, scene: Scene): SVGSVGElement | null {
    const box = scene.boxes[node.id];
    const all = [
        ...tile.querySelectorAll<SVGSVGElement>(`svg.scene-svg svg[data-visual="${node.type}"]`),
    ];
    return (
        all.find((s) => box && Math.abs(Number(s.getAttribute("x")) - box.x * U) < 0.5) ??
        all[0] ??
        null
    );
}

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
    const worldValues = worldNode ? valuesOf(worldNode.v) : {};
    const pad: Pad = {
        tray: strings(padValues.tray),
        slots: whole(padValues.lines, 5),
        once: padValues.once === true,
    };
    const setup = worldNode ? setupOf(worldNode.type, worldValues) : null;
    const told0 = props.part.told;
    const [build, setBuild] = createSignal<Build>(
        told0 ? { blocks: placedFrom(told0.lines, pad), chosen: -1 } : EMPTY,
    );
    const [told, setTold] = createSignal<Built | null>(told0);
    const [said, setSaid] = createSignal(told0?.say ?? "");
    const [playing, setPlaying] = createSignal(false);
    const [hints, setHints] = createSignal<string[]>(props.opened);
    const [hintable, setHintable] = createSignal(props.acts?.mayHint() ?? false);
    const past: Build[] = [];
    const [undoable, setUndoable] = createSignal(false);
    const keep = (b: Build): void => {
        past.push(b);
        if (past.length > 60) past.shift();
        setUndoable(true);
    };
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const done = (): boolean => (told()?.done ?? false) || props.closed;
    const locked = (): boolean => done() || playing();
    const shown = Date.now();
    let first = 0;
    let left = false;
    let tile: HTMLDivElement | undefined;
    let shelf: Shelf | null = null;
    let timer = 0;
    let running = 0;
    const away = (): void => {
        if (document.hidden) left = true;
    };
    document.addEventListener("visibilitychange", away);
    onCleanup(() => {
        document.removeEventListener("visibilitychange", away);
        clearTimeout(timer);
    });

    /** A part drawn again with some settings changed, where the scene put it. */
    function redraw(
        node: SceneNode | undefined,
        changes: Record<string, unknown>,
        values: Record<string, unknown>,
    ): void {
        const d = node && shelf?.drawing(node.type);
        const box = node && props.scene.boxes[node.id];
        const was = node && tile ? drawnAt(tile, node, props.scene) : null;
        if (!d || !box || !was || !tile) return;
        const svg = render(
            d,
            { ...(d.params as object), ...values, ...changes },
            { host: tile },
        ).svg;
        svg.removeAttribute("class");
        svg.removeAttribute("style");
        for (const [k, v] of Object.entries({
            x: box.x * U,
            y: box.y * U,
            width: box.w * U,
            height: box.h * U,
        }))
            svg.setAttribute(k, String(v));
        was.replaceWith(svg);
    }
    const drawPad = (): void => {
        const b = build();
        redraw(
            padNode,
            {
                placed: writeLines([...b.blocks]),
                sel: b.chosen + 1,
                used: pad.once ? b.blocks.map((x) => x.from) : [],
                run: running,
            },
            padValues,
        );
    };
    /** The drawing the program runs in, with `upto` of its steps run, or as the scene has it. */
    const drawWorld = (code: string[] | null, upto: number): void => {
        const key = worldNode ? RUNS[worldNode.type] : undefined;
        if (!key) return;
        redraw(worldNode, code === null ? {} : { [key]: code, upto }, worldValues);
    };

    onMount(() => {
        if (!tile) return;
        tile.replaceChildren(props.draw(tile, props.scene, {}));
        const types = [padNode?.type, worldNode?.type].filter((t): t is string => !!t);
        void loadDrawings(types).then((s) => {
            shelf = s;
            drawPad();
            const t = told();
            if (t?.done) drawWorld(writeLines(t.lines), -1);
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
        drawWorld(null, -1);
    };
    const choose = (i: number): void => {
        const b = build();
        if (!b.blocks[i]) return;
        setBuild({ ...b, chosen: i });
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
    };
    const clear = (): void => {
        if (!build().blocks.length) return;
        keep(build());
        setBuild(EMPTY);
        setSaid("The slots are empty.");
        drawPad();
        drawWorld(null, -1);
    };
    const hint = (): void => {
        const acts = props.acts;
        const h = acts?.hint();
        if (!acts || h === null || h === undefined) return;
        setHints([...hints(), h]);
        setHintable(acts.mayHint());
    };

    /** Plays the program a step at a time, lighting the running slot, then judges it. */
    const runIt = (): void => {
        if (locked()) return;
        const blocks = build().blocks.map((b) => ({ text: b.text, depth: b.depth }));
        if (!blocks.length) {
            setSaid("Put some blocks in the slots first.");
            return;
        }
        const now = Date.now();
        const timing: Timing = {
            k: "screen",
            toFirstInput: (first || now) - shown,
            toAnswer: now - (first || now),
            leftPage: left,
        };
        const code = writeLines(blocks);
        const r = setup
            ? run(parse(code), setup.world, { event: setup.event, vars: setup.vars })
            : null;
        const acts = props.acts;
        const finish = (): void => {
            running = 0;
            setPlaying(false);
            if (!acts) return;
            const b = acts.tried(blocks, timing);
            const words = r && setup ? `${ranWords(r, setup)} ` : "";
            setTold(b);
            setSaid(`${words}${b.say}`);
            setHintable(acts.mayHint());
            if (b.done) setBuild({ blocks: placedFrom(b.lines, pad), chosen: -1 });
            drawPad();
            drawWorld(b.done ? writeLines(b.lines) : code, -1);
            props.onTold?.(b);
        };
        if (!r || reduced || !r.frames.length) {
            finish();
            return;
        }
        setPlaying(true);
        setSaid("Running.");
        let k = 0;
        const step = (): void => {
            k++;
            const f = r.frames[k - 1];
            running = f?.line ?? 0;
            drawWorld(code, k);
            drawPad();
            if (k >= r.frames.length) {
                timer = window.setTimeout(finish, STEP * 1000);
                return;
            }
            timer = window.setTimeout(step, STEP * 1000);
        };
        drawWorld(code, 0);
        timer = window.setTimeout(step, STEP * 500);
    };

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
            "+": () => change(count(b, pad, 1)),
            "=": () => change(count(b, pad, 1)),
            "-": () => change(count(b, pad, -1)),
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
                <button
                    type="button"
                    disabled={locked() || !tools().count}
                    onClick={() => change(count(build(), pad, -1))}
                >
                    Fewer
                </button>
                <button
                    type="button"
                    disabled={locked() || !tools().count}
                    onClick={() => change(count(build(), pad, 1))}
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
