// A program a sheet shows, played under its scene: Run, Step and Start again for a drawing that runs
// a program or a listing that can be read, and a button for each lamp, pair of cards, cup or bridge
// of the four algorithm toys. Nothing here records or marks anything: the question's own answer is
// still what is checked, and Start again, a new scene or a print puts every drawing back as the
// sheet drew it (.docs/coding-migration.md, decisions 1 and 3).

import "./code-controls.css";
import { createEffect, createSignal, Index, on, onCleanup, Show, type JSX } from "solid-js";
import type { Scene } from "../scene";
import { pressToy, toyButtons, toyOf, type CodingTarget, type Toy } from "./coding";
import { player, redrawNode } from "./code-runner";
import { loadDrawings } from "./drawings";
import { render } from "./svg";

/** What the program says, in a speech bubble off the shelf, with the words for a screen reader. */
export function Said(props: { said: string }): JSX.Element {
    let host: HTMLSpanElement | undefined;
    createEffect(() => {
        const said = props.said;
        if (!host || !said) return;
        void loadDrawings(["bubble"]).then((shelf) => {
            const d = shelf.drawing("bubble");
            if (!d || !host || said !== props.said) return;
            const words = said.length > 60 ? `${said.slice(0, 57)}...` : said;
            const r = render(
                d,
                {
                    lines: [words],
                    width: Math.max(4, Math.min(16, Math.ceil(words.length * 0.5) + 2)),
                    // the tail points back along the row, towards the controls that made it speak
                    tail: [-16, 40],
                },
                { host },
            );
            r.svg.removeAttribute("style");
            r.svg.setAttribute("overflow", "visible");
            r.svg.setAttribute("aria-hidden", "true");
            host.replaceChildren(r.svg);
        });
    });
    return (
        <Show when={props.said}>
            <span class="cr-bubble">
                <span
                    ref={(el) => {
                        host = el;
                    }}
                />
                <span class="sr">It says {props.said}.</span>
            </span>
        </Show>
    );
}

export function CodingControls(props: {
    scene: Scene;
    target: CodingTarget;
    /** The element the scene is drawn in. */
    tile: () => Element | undefined;
    /** Counts each time the scene is drawn again from scratch, which ends a play or a toy's changes. */
    drawn: () => number;
    reveal: boolean;
    /** The child's answer in words, said before what a finished play did, for a question predicted first. */
    answered?: () => string;
}): JSX.Element {
    const [said, setSaid] = createSignal("");
    const [spoken, setSpoken] = createSignal("");
    const [busy, setBusy] = createSignal(false);
    const [toy, setToy] = createSignal<Toy>(toyOf(props.target.node));
    const [changed, setChanged] = createSignal(false);
    const p = player({
        tile: props.tile,
        scene: props.scene,
        target: props.target,
        reveal: props.reveal,
        say: setSaid,
        speak: setSpoken,
        onPlaying: setBusy,
        onEnd: () => {
            const mine = props.answered?.() ?? "";
            if (mine) setSaid((ended) => `${mine} ${ended}`);
        },
    });
    const startAgain = (): void => {
        if (props.target.mode === "toy") {
            const tile = props.tile();
            if (tile) redrawNode(tile, props.scene, props.target.node, {});
            setToy(toyOf(props.target.node));
            setSaid("");
        } else p.reset();
        setChanged(false);
    };
    const press = (i: number): void => {
        const next = pressToy(props.target.node, toy(), i);
        const tile = props.tile();
        if (tile) redrawNode(tile, props.scene, props.target.node, next.settings);
        setToy(next);
        setSaid(next.said);
        setChanged(true);
    };
    createEffect(
        on(
            props.drawn,
            () => {
                p.forget();
                setToy(toyOf(props.target.node));
                setSaid("");
                setChanged(false);
            },
            { defer: true },
        ),
    );
    // paper shows the question as it was set, whatever was played on it
    const printing = (): void => {
        if (changed()) startAgain();
    };
    window.addEventListener("beforeprint", printing);
    onCleanup(() => {
        window.removeEventListener("beforeprint", printing);
        p.forget();
    });
    const run = (): void => {
        setChanged(true);
        p.run();
    };
    const step = (): void => {
        setChanged(true);
        p.step();
    };
    return (
        <div class="cr" data-mode={props.target.mode}>
            <div class="cr-row">
                <Show
                    when={props.target.mode === "toy"}
                    fallback={
                        <>
                            <button type="button" class="cr-go" disabled={busy()} onClick={run}>
                                Run
                            </button>
                            <button type="button" disabled={busy()} onClick={step}>
                                Step
                            </button>
                        </>
                    }
                >
                    <Index each={toyButtons(props.target.node, toy())}>
                        {(b, i) => (
                            <button
                                type="button"
                                aria-pressed={b().pressed}
                                onClick={() => press(i)}
                            >
                                {b().label}
                            </button>
                        )}
                    </Index>
                </Show>
                <button type="button" disabled={!changed()} onClick={startAgain}>
                    Start again
                </button>
                <Said said={spoken()} />
            </div>
            <p class="cr-said" aria-live="polite">
                {said()}
            </p>
        </div>
    );
}
