import "./game-tools.css";
import { createSignal, For, onCleanup, Show, type JSX } from "solid-js";
import { render } from "solid-js/web";
import { resetKnobs, turn, turned } from "../motion/tune";
import type { Sprite } from "../motion/scene";
import type { Probe } from "./game-host";
import {
    bytesText,
    inkOf,
    pick,
    readTapeText,
    spriteRows,
    tapeText,
    TOOLS,
    withInk,
    worldsIn,
    type Tool,
} from "./game-tools";

/** Puts the developer's tools on the page for the game `probe` gives, and returns what takes them off. */
export function mountTools(
    host: HTMLElement,
    o: { probe: () => Probe | null; open: readonly Tool[] },
): () => void {
    const el = document.createElement("div");
    host.append(el);
    const dispose = render(() => <Panel probe={o.probe} open={o.open} />, el);
    return () => {
        dispose();
        el.remove();
    };
}

function Rows(props: { rows: [string, string][] }): JSX.Element {
    return (
        <dl class="tools-rows">
            <For each={props.rows}>
                {([k, v]) => (
                    <>
                        <dt>{k}</dt>
                        <dd>{v}</dd>
                    </>
                )}
            </For>
        </dl>
    );
}

function Panel(props: { probe: () => Probe | null; open: readonly Tool[] }): JSX.Element {
    const tabs = TOOLS.filter((t) => props.open.includes(t.id));
    const [tab, setTab] = createSignal<Tool>(tabs[0]?.id ?? "perf");
    const [tick, setTick] = createSignal(0);
    const [ink, setInk] = createSignal(true);
    const [picked, setPicked] = createSignal<Sprite | null>(null);
    const [tapeWords, setTapeWords] = createSignal("");
    const [tapeProblem, setTapeProblem] = createSignal("");
    let inked: Probe | null = null;

    const probe = (): Probe | null => {
        tick();
        return props.probe();
    };
    // the inspector's ink goes on whichever game is open, and comes off the one it was on
    const paint = (): void => {
        const p = props.probe();
        const on = props.open.includes("inspect") && ink() ? p : null;
        if (inked && inked !== on) inked.overlay(null);
        if (on && inked !== on)
            on.overlay((f) =>
                withInk(
                    f,
                    inkOf(
                        worldsIn(on.state()).map((w) => w.survey()),
                        picked(),
                    ),
                ),
            );
        inked = on;
    };
    const every = setInterval(() => {
        setTick((n) => n + 1);
        paint();
    }, 250);
    const hover = (e: PointerEvent): void => {
        const p = props.probe();
        if (!p || !(e.target instanceof Element) || !e.target.closest(".field-gl")) return;
        setPicked(pick(p.frame(), p.toWorld(e.clientX, e.clientY)));
    };
    document.addEventListener("pointermove", hover);
    onCleanup(() => {
        clearInterval(every);
        document.removeEventListener("pointermove", hover);
        inked?.overlay(null);
    });

    const census = (p: Probe): { moving: number; awake: number } =>
        worldsIn(p.state()).reduce(
            (a, w) => {
                const c = w.census();
                return { moving: a.moving + c.moving, awake: a.awake + c.awake };
            },
            { moving: 0, awake: 0 },
        );

    const save = (p: Probe): void => {
        const url = URL.createObjectURL(
            new Blob([tapeText(p.tape())], { type: "application/json" }),
        );
        const a = document.createElement("a");
        a.href = url;
        a.download = `tape-level-${p.level + 1}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };
    const load = (p: Probe, text: string): void => {
        const t = readTapeText(text);
        if (typeof t === "string") setTapeProblem(t);
        else {
            setTapeProblem("");
            p.load(t);
        }
    };

    return (
        <aside class="game-tools" aria-label="Developer tools">
            <div class="tools-tabs" role="tablist">
                <For each={tabs}>
                    {(t) => (
                        <button
                            type="button"
                            role="tab"
                            aria-selected={tab() === t.id}
                            onClick={() => setTab(t.id)}
                        >
                            {t.label}
                        </button>
                    )}
                </For>
            </div>
            <Show when={probe()} fallback={<p class="tools-note">Open an action game.</p>}>
                {(p) => {
                    // the probe is the same object from tick to tick, so what it says is read again on each tick
                    const q = (): Probe => {
                        tick();
                        return p();
                    };
                    return (
                        <>
                            <Show when={tab() === "inspect"}>
                                <section class="tools-body">
                                    <label class="tools-check">
                                        <input
                                            type="checkbox"
                                            checked={ink()}
                                            onChange={(e) => {
                                                setInk(e.currentTarget.checked);
                                                paint();
                                            }}
                                        />
                                        Draw bodies and joints
                                    </label>
                                    <p class="tools-note">
                                        Heavy is awake, dashed is asleep, faint is fixed, red is a
                                        sensor.
                                    </p>
                                    <Rows
                                        rows={(() => {
                                            const c = census(q());
                                            const o = q().objectives();
                                            return [
                                                ["bodies that move", String(c.moving)],
                                                ["of those awake", String(c.awake)],
                                                [
                                                    "goal",
                                                    o
                                                        ? `${o.completed} of ${o.total}`
                                                        : "not counted",
                                                ],
                                            ];
                                        })()}
                                    />
                                    <h3>Under the pointer</h3>
                                    <Show
                                        when={picked()}
                                        fallback={<p class="tools-note">Point at the field.</p>}
                                    >
                                        {(sp) => <Rows rows={spriteRows(sp())} />}
                                    </Show>
                                    <h3>Events</h3>
                                    <Show
                                        when={q().events().length}
                                        fallback={<p class="tools-note">None yet.</p>}
                                    >
                                        <ol class="tools-events">
                                            <For each={[...q().events()].reverse()}>
                                                {(e) => (
                                                    <li>
                                                        step {e.step}: {e.kind}
                                                        {e.value !== undefined ? ` ${e.value}` : ""}
                                                    </li>
                                                )}
                                            </For>
                                        </ol>
                                    </Show>
                                </section>
                            </Show>
                            <Show when={tab() === "tune"}>
                                <section class="tools-body">
                                    <Show
                                        when={q().tuning}
                                        fallback={
                                            <p class="tools-note">This game has no tuning table.</p>
                                        }
                                    >
                                        {(t) => (
                                            <>
                                                <p class="tools-note">
                                                    {(tick(), turned(t()).length)} turned. A knob
                                                    read every step takes hold at once; one read
                                                    when a level is laid out takes hold at Start
                                                    again.
                                                </p>
                                                <For each={Object.entries(t())}>
                                                    {([name, k]) => (
                                                        <label class="tools-knob">
                                                            <span>
                                                                {name}{" "}
                                                                <output>
                                                                    {(tick(), k.value)} {k.unit}
                                                                </output>
                                                            </span>
                                                            <input
                                                                type="range"
                                                                min={k.min}
                                                                max={k.max}
                                                                step={k.step}
                                                                value={(tick(), k.value)}
                                                                onInput={(e) => {
                                                                    turn(
                                                                        k,
                                                                        e.currentTarget
                                                                            .valueAsNumber,
                                                                    );
                                                                    setTick((n) => n + 1);
                                                                }}
                                                            />
                                                            <small>{k.why}</small>
                                                        </label>
                                                    )}
                                                </For>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        resetKnobs(t());
                                                        setTick((n) => n + 1);
                                                    }}
                                                >
                                                    Put every knob back
                                                </button>
                                            </>
                                        )}
                                    </Show>
                                </section>
                            </Show>
                            <Show when={tab() === "replay"}>
                                <section class="tools-body">
                                    <p class="tools-note">
                                        {q().viewing() === null
                                            ? `Playing, ${q().tape().steps} steps in.`
                                            : `Held on step ${q().viewing()} of ${q().tape().steps}.`}
                                    </p>
                                    <input
                                        class="tools-scrub"
                                        type="range"
                                        aria-label="Step"
                                        min={0}
                                        max={q().tape().steps}
                                        step={1}
                                        value={q().viewing() ?? q().tape().steps}
                                        onInput={(e) => {
                                            q().view(e.currentTarget.valueAsNumber);
                                            setTick((n) => n + 1);
                                        }}
                                    />
                                    <div class="tools-buttons">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                q().view((q().viewing() ?? q().tape().steps) - 1)
                                            }
                                        >
                                            Step back
                                        </button>
                                        <button
                                            type="button"
                                            disabled={q().viewing() === null}
                                            onClick={() => {
                                                const at = q().viewing();
                                                if (at !== null) q().view(at + 1);
                                            }}
                                        >
                                            Step on
                                        </button>
                                        <button
                                            type="button"
                                            disabled={q().viewing() === null}
                                            onClick={() => q().cut()}
                                        >
                                            Cut here
                                        </button>
                                        <button
                                            type="button"
                                            disabled={q().viewing() === null}
                                            onClick={() => q().view(null)}
                                        >
                                            Back to playing
                                        </button>
                                        <button type="button" onClick={() => q().watch()}>
                                            Play from the start
                                        </button>
                                    </div>
                                    <h3>The tape as JSON</h3>
                                    <textarea
                                        class="tools-tape"
                                        aria-label="Tape"
                                        rows={4}
                                        value={tapeWords()}
                                        onInput={(e) => setTapeWords(e.currentTarget.value)}
                                    />
                                    <Show when={tapeProblem()}>
                                        <p class="tools-problem" role="alert">
                                            {tapeProblem()}
                                        </p>
                                    </Show>
                                    <div class="tools-buttons">
                                        <button
                                            type="button"
                                            onClick={() => setTapeWords(tapeText(q().tape()))}
                                        >
                                            Copy out
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => load(q(), tapeWords())}
                                        >
                                            Load
                                        </button>
                                        <button type="button" onClick={() => save(q())}>
                                            Save a file
                                        </button>
                                        <label class="tools-file">
                                            Open a file
                                            <input
                                                type="file"
                                                accept="application/json,.json"
                                                onChange={(e) => {
                                                    const file = e.currentTarget.files?.[0];
                                                    if (file)
                                                        void file.text().then((text) => {
                                                            setTapeWords(text);
                                                            load(q(), text);
                                                        });
                                                }}
                                            />
                                        </label>
                                    </div>
                                </section>
                            </Show>
                            <Show when={tab() === "perf"}>
                                <section class="tools-body">
                                    <Rows
                                        rows={(() => {
                                            const f = q().perf();
                                            const c = census(q());
                                            return [
                                                ["frames a second", f.fps.toFixed(0)],
                                                ["game step", `${f.stepMs.toFixed(2)} ms`],
                                                [
                                                    "step and drawing",
                                                    `${f.frameMs.toFixed(2)} ms a frame`,
                                                ],
                                                ["sprites drawn", String(f.sprites)],
                                                ["looks drawn", String(f.drawings)],
                                                ["pen time", `${f.drawMs.toFixed(0)} ms in all`],
                                                ["atlas pages", String(f.pages)],
                                                ["atlas memory", bytesText(f.bytes)],
                                                ["bodies awake", `${c.awake} of ${c.moving}`],
                                            ];
                                        })()}
                                    />
                                </section>
                            </Show>
                        </>
                    );
                }}
            </Show>
        </aside>
    );
}
