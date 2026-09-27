import {
    createEffect,
    createMemo,
    createSignal,
    For,
    Match,
    onCleanup,
    Show,
    Switch,
    type JSX,
} from "solid-js";
import {
    type TeachingAction,
    type TeachingPreferences,
    type TeachingState,
    type TeachingView,
    type TeachingVisual,
} from "../teaching";
import type { Scene } from "../scene";
import type { SceneDrawer } from "./scene";
import { Drawing } from "./art";
import { Button } from "./form";
import { Guide } from "./tutor";
import { voice } from "./voice";
import "./teaching.css";

/** What the child is asked to do at this moment: move something, or answer. */
type Beat = "do" | "check";

/** How many touches finish the doing part, or 0 where the picture asks for none. */
function touchesNeeded(view: TeachingView): number {
    if (view.sight.kind === "question") return 0;
    const v = view.sight.visual;
    if (v.kind === "counters")
        return v.extra === 0 ? 0 : Math.max(1, Math.min(v.extra, 10 - v.first));
    if (v.kind === "passage") return v.focus ? 1 : 0;
    return v.highlight >= 0 ? 0 : 1;
}

/** Shared by a small question-help card and the full lesson teaching surface. */
export function TeachingBoard(props: {
    view: TeachingView;
    /** The question's own picture and how to draw it, where the tutor teaches a question. */
    question?: { scene: Scene; draw: SceneDrawer };
    state: TeachingState;
    preferences: TeachingPreferences;
    busy?: boolean;
    message?: string;
    onAction: (action: TeachingAction, answer?: string) => void;
    onExpand: () => void;
    onPause: () => void;
    onRead?: () => void;
    /** False where the board sits in a dialog, whose own close is the one way out. */
    wayOut?: boolean;
    /** False where this moment has no other way to offer, as a tutor's own move does not. */
    another?: boolean;
}): JSX.Element {
    const view = () => props.view;
    const prepared = (): TeachingVisual | null => {
        const sight = view().sight;
        return sight.kind === "prepared" ? sight.visual : null;
    };
    const [moved, setMoved] = createSignal(0);
    const [focus, setFocus] = createSignal(-1);
    const [touched, setTouched] = createSignal(0);
    const [more, setMore] = createSignal(false);
    const needed = createMemo(() => touchesNeeded(view()));
    const beat = createMemo<Beat>(() => {
        if (!view().check) return "do";
        return needed() > 0 && touched() < needed() ? "do" : "check";
    });
    createEffect(() => {
        void view().caption;
        setMoved(0);
        setFocus(-1);
        setTouched(0);
        setMore(false);
        voice().stop();
    });
    onCleanup(() => voice().stop());
    const read = () => {
        if (props.onRead) props.onRead();
        else {
            voice().touched();
            voice().speak(view().spoken);
        }
    };
    const touch = () => setTouched((t) => t + 1);
    const ended = () => props.state.status === "ended";
    // The caption carries the question once the doing is done, so one instruction stands at a time.
    const line = () => {
        const q = view().check;
        return beat() === "check" && q && !ended() ? q.prompt : view().caption;
    };
    return (
        <section
            class="teaching"
            classList={{ "teaching-compact": !props.state.expanded }}
            aria-label={view().title}
        >
            <Show
                when={props.state.status !== "paused"}
                fallback={
                    <div class="teaching-paper">
                        <div class="teaching-rest">
                            <p>Take your time.</p>
                            <Button onClick={props.onPause}>Continue together</Button>
                        </div>
                    </div>
                }
            >
                <div class="teaching-paper">
                    <header class="teaching-head">
                        <h2>{view().title}</h2>
                        <Show when={view().place}>
                            {(p) => (
                                <p class="teaching-steps">
                                    Step {p().at} of {p().of}
                                </p>
                            )}
                        </Show>
                        <Show when={props.wayOut !== false}>
                            <button class="teaching-out" onClick={() => props.onAction("return")}>
                                Back to work
                            </button>
                        </Show>
                    </header>
                    <div class="teaching-visual" aria-label="Teaching illustration">
                        <Show when={view().sight.kind === "question" && props.question}>
                            {(q) => {
                                const ring = (): readonly string[] => {
                                    const sight = view().sight;
                                    return sight.kind === "question" ? sight.ring : [];
                                };
                                let tile: HTMLDivElement | undefined;
                                createEffect(() => {
                                    const marks = ring();
                                    if (!tile) return;
                                    const svg = q().draw(tile, q().scene, { ring: marks });
                                    // one picture at a time, however often the tutor moves the loop
                                    tile.replaceChildren(svg);
                                });
                                return (
                                    <div
                                        class="teaching-scene"
                                        ref={(el) => {
                                            tile = el;
                                        }}
                                    />
                                );
                            }}
                        </Show>
                        <Switch>
                            <Match when={prepared()?.kind === "counters"}>
                                {(() => {
                                    const v = prepared();
                                    if (v?.kind !== "counters") return null;
                                    const room = () => Math.max(0, 10 - v.first);
                                    const live = (n: number) =>
                                        beat() === "do" && !ended() && n >= moved() && n < room();
                                    return (
                                        <div class="teaching-counting">
                                            <Show
                                                when={
                                                    view().phase === "notice" ||
                                                    view().phase === "recap"
                                                }
                                            >
                                                <p class="teaching-equation">
                                                    {v.first} + {v.extra}
                                                </p>
                                            </Show>
                                            <Show
                                                when={!v.numberLine}
                                                fallback={
                                                    <ol
                                                        class="teaching-numberline"
                                                        aria-label="Number line from zero to twenty"
                                                    >
                                                        <For
                                                            each={Array.from(
                                                                { length: 21 },
                                                                (_, i) => i,
                                                            )}
                                                        >
                                                            {(n) => (
                                                                <li
                                                                    classList={{
                                                                        reached:
                                                                            n === v.first + moved(),
                                                                    }}
                                                                >
                                                                    {n}
                                                                </li>
                                                            )}
                                                        </For>
                                                    </ol>
                                                }
                                            >
                                                <div
                                                    class="teaching-ten"
                                                    aria-label={`${Math.min(10, v.first + moved())} counters in a ten frame`}
                                                >
                                                    <Drawing
                                                        seed={7}
                                                        class="drawing"
                                                        id="tenframe"
                                                        params={{
                                                            count: Math.min(10, v.first + moved()),
                                                            color: "berry",
                                                        }}
                                                    />
                                                </div>
                                            </Show>
                                            <Show when={v.extra > 0}>
                                                <ul
                                                    class="teaching-tray"
                                                    aria-label="Counters waiting"
                                                >
                                                    <For
                                                        each={Array.from(
                                                            { length: v.extra },
                                                            (_, i) => i,
                                                        )}
                                                    >
                                                        {(n) => (
                                                            <li
                                                                classList={{
                                                                    gone: n < moved(),
                                                                    later: n >= room(),
                                                                }}
                                                            >
                                                                <Show
                                                                    when={live(n)}
                                                                    fallback={
                                                                        <span class="teaching-counter">
                                                                            <Drawing
                                                                                seed={7}
                                                                                class="drawing"
                                                                                id="array"
                                                                                params={{
                                                                                    rows: 1,
                                                                                    cols: 1,
                                                                                    color: "berry",
                                                                                }}
                                                                            />
                                                                        </span>
                                                                    }
                                                                >
                                                                    <button
                                                                        class="teaching-counter"
                                                                        aria-label={`Move counter ${n + 1} into the ten frame`}
                                                                        onClick={() => {
                                                                            setMoved((m) =>
                                                                                Math.min(
                                                                                    room(),
                                                                                    m + 1,
                                                                                ),
                                                                            );
                                                                            touch();
                                                                        }}
                                                                    >
                                                                        <Drawing
                                                                            seed={7}
                                                                            class="drawing"
                                                                            id="array"
                                                                            params={{
                                                                                rows: 1,
                                                                                cols: 1,
                                                                                color: "berry",
                                                                            }}
                                                                        />
                                                                    </button>
                                                                </Show>
                                                            </li>
                                                        )}
                                                    </For>
                                                </ul>
                                            </Show>
                                        </div>
                                    );
                                })()}
                            </Match>
                            <Match when={prepared()?.kind === "passage"}>
                                {(() => {
                                    const v = prepared();
                                    if (v?.kind !== "passage") return null;
                                    return (
                                        <div class="teaching-reading">
                                            <Drawing
                                                seed={7}
                                                class="drawing"
                                                id="crabs"
                                                params={{ count: 1 }}
                                            />
                                            <div class="teaching-passage">
                                                <For each={v.text.split(/(?<=[.!?])\s+/)}>
                                                    {(sentence, i) => (
                                                        <button
                                                            classList={{
                                                                chosen: focus() === i(),
                                                                clue:
                                                                    !!v.focus &&
                                                                    sentence.includes(v.focus),
                                                            }}
                                                            disabled={beat() === "check" || ended()}
                                                            onClick={() => {
                                                                setFocus(i());
                                                                touch();
                                                            }}
                                                        >
                                                            {sentence}
                                                        </button>
                                                    )}
                                                </For>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </Match>
                            <Match when={prepared()?.kind === "chain"}>
                                {(() => {
                                    const v = prepared();
                                    if (v?.kind !== "chain") return null;
                                    return (
                                        <ol class="teaching-chain">
                                            <For each={v.names}>
                                                {(name, i) => (
                                                    <li>
                                                        <button
                                                            classList={{
                                                                chosen:
                                                                    focus() === i() ||
                                                                    v.highlight === i(),
                                                            }}
                                                            disabled={beat() === "check" || ended()}
                                                            onClick={() => {
                                                                setFocus(i());
                                                                touch();
                                                            }}
                                                        >
                                                            <Show when={name === "Crab"}>
                                                                <Drawing
                                                                    seed={7}
                                                                    class="drawing"
                                                                    id="crabs"
                                                                    params={{ count: 1 }}
                                                                />
                                                            </Show>
                                                            <Show when={name === "Gull"}>
                                                                <Drawing
                                                                    seed={7}
                                                                    class="drawing"
                                                                    id="gull"
                                                                    params={{ flying: 0 }}
                                                                />
                                                            </Show>
                                                            <strong>{name}</strong>
                                                        </button>
                                                        <Show when={i() < v.names.length - 1}>
                                                            <span aria-label="is eaten by">→</span>
                                                        </Show>
                                                    </li>
                                                )}
                                            </For>
                                        </ol>
                                    );
                                })()}
                            </Match>
                        </Switch>
                    </div>
                    <div class="teaching-caption">
                        <Show when={props.preferences.guide !== "none"}>
                            <Guide
                                id={
                                    props.preferences.guide === "world"
                                        ? "bird"
                                        : props.preferences.guide
                                }
                                px={72}
                                pose="point"
                                aim={[50, 25]}
                                quiet
                            />
                        </Show>
                        <p aria-live="polite">
                            {ended()
                                ? view().phase === "recap"
                                    ? "Ready to try it in your lesson."
                                    : "We can come back to this. Take a break, or return to your work."
                                : line()}
                        </p>
                        <Show when={props.preferences.audio !== "off"}>
                            <button
                                class="teaching-link teaching-read"
                                onClick={read}
                                aria-label="Read it aloud"
                            >
                                Read it
                            </button>
                        </Show>
                    </div>
                    <div class="teaching-response" aria-busy={props.busy}>
                        <Show when={!ended()}>
                            <Switch>
                                <Match when={beat() === "check" && view().check}>
                                    {(q) => (
                                        <div class="teaching-choices">
                                            <For each={q().choices}>
                                                {(choice) => (
                                                    <Button
                                                        second
                                                        busy={props.busy}
                                                        onClick={() =>
                                                            props.onAction("answer", choice)
                                                        }
                                                    >
                                                        {choice}
                                                    </Button>
                                                )}
                                            </For>
                                        </div>
                                    )}
                                </Match>
                                <Match when={view().check}>
                                    <Button busy={props.busy} onClick={() => setTouched(needed())}>
                                        I am ready
                                    </Button>
                                </Match>
                                <Match when={!view().check}>
                                    <Button
                                        busy={props.busy}
                                        onClick={() => props.onAction("continue")}
                                    >
                                        Continue
                                    </Button>
                                </Match>
                            </Switch>
                        </Show>
                        <Show when={props.message}>
                            <output class="teaching-note">{props.message}</output>
                        </Show>
                        <div class="teaching-more">
                            <button
                                class="teaching-link"
                                aria-expanded={more()}
                                onClick={() => setMore((m) => !m)}
                            >
                                I need something else
                            </button>
                            <Show when={more()}>
                                <div class="teaching-else">
                                    <Show when={!ended() && props.another !== false}>
                                        <button
                                            class="teaching-link"
                                            disabled={props.busy}
                                            onClick={() => props.onAction("another")}
                                        >
                                            Another way
                                        </button>
                                    </Show>
                                    <Show when={!ended()}>
                                        <button
                                            class="teaching-link"
                                            disabled={props.busy}
                                            onClick={() => props.onAction("handoff")}
                                        >
                                            Ask a grown-up
                                        </button>
                                        <button class="teaching-link" onClick={props.onPause}>
                                            Pause
                                        </button>
                                    </Show>
                                    <button class="teaching-link" onClick={props.onExpand}>
                                        {props.state.expanded ? "Smaller" : "Open board"}
                                    </button>
                                </div>
                            </Show>
                        </div>
                    </div>
                </div>
            </Show>
        </section>
    );
}
