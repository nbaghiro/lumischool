import "./round-end.css";
import { For, onCleanup, onMount, Show, type JSX } from "solid-js";
import { Icon } from "./icon";
import { END_ACTION, titleOf, type EndAction } from "./round-end-rules";

/**
 * The card a round ends on, won or not: the game's own sentence and what to do next, with the
 * first action focused so Enter takes it. It covers only the lower middle of the field, so the
 * board it ended on stays in sight.
 */
export function RoundEndCard(props: {
    won: boolean;
    words: string;
    actions: readonly EndAction[];
    /** The game's picture, beside the heading. */
    art?: JSX.Element;
    /** Inside a lesson's card: smaller, with no picture. */
    compact?: boolean;
    onAct: (a: EndAction) => void;
    onClose?: () => void;
}): JSX.Element {
    let first: HTMLButtonElement | undefined;
    let box: HTMLElement | undefined;
    onMount(() => {
        first?.focus({ preventScroll: true });
        const close = (e: KeyboardEvent): void => {
            if (e.key !== "Escape" || !props.onClose) return;
            e.preventDefault();
            e.stopPropagation();
            props.onClose();
        };
        box?.addEventListener("keydown", close);
        onCleanup(() => box?.removeEventListener("keydown", close));
    });
    return (
        <section
            ref={(el) => {
                box = el;
            }}
            class="round-end"
            classList={{ won: props.won, compact: props.compact === true }}
            aria-label={titleOf(props.won)}
            data-round-end={props.won ? "won" : "not-won"}
        >
            <Show when={props.won}>
                <div class="round-end-confetti" aria-hidden="true">
                    <For each={[0, 1, 2, 3, 4, 5, 6, 7]}>
                        {(i) => <i style={{ "--i": String(i) }} />}
                    </For>
                </div>
            </Show>
            <div class="round-end-head">
                <Show when={!props.compact && props.art}>
                    <div class="round-end-art">{props.art}</div>
                </Show>
                <div>
                    <h2>{titleOf(props.won)}</h2>
                    <p data-game="end-words">{props.words}</p>
                </div>
                <Show when={props.onClose}>
                    <button
                        class="game-icon round-end-close"
                        type="button"
                        aria-label="Close and look at the board"
                        title="Close and look at the board"
                        onClick={() => props.onClose?.()}
                    >
                        <Icon name="back" />
                    </button>
                </Show>
            </div>
            <div class="round-end-actions">
                <For each={props.actions}>
                    {(a, i) => (
                        <button
                            type="button"
                            class="round-end-action"
                            classList={{ primary: i() === 0 }}
                            data-end={a}
                            ref={(el) => {
                                if (i() === 0) first = el;
                            }}
                            onClick={() => props.onAct(a)}
                        >
                            <span class="round-end-icon">
                                <Icon name={END_ACTION[a].icon} />
                            </span>
                            <span>{END_ACTION[a].label}</span>
                        </button>
                    )}
                </For>
            </div>
        </section>
    );
}
