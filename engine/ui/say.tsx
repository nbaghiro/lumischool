// Saying things on a page: a line on the sheet for what went wrong, or for what is merely so, the
// page's live regions, which read each such line to a screen reader as it appears, and moving focus
// to what a new step says.

import "./form.css";
import { createEffect, createSignal, Show, type JSX } from "solid-js";
import { Button } from "./form";

const [polite, setPolite] = createSignal("");
const [urgent, setUrgent] = createSignal("");

/** Says a line to a screen reader; `urgent` interrupts, for what went wrong. */
export function announce(text: string, o: { urgent?: boolean } = {}): void {
    const set = o.urgent ? setUrgent : setPolite;
    set("");
    // cleared first and set a frame later, so the same line said twice is heard twice
    requestAnimationFrame(() => set(text));
}

/** How many frames an element a step made may take to reach the page before its focus is dropped. */
const FRAMES = 120;

/**
 * Moves focus to what a new step has made, once it is on the page, and keeps it there while the rest
 * of the screen arrives. A step's elements are made before they are attached, and a screen waiting on
 * a request is attached later still, so focusing them straight away does nothing; a screen that is put
 * back on the page after such a wait moves what it holds, and moving an element takes focus off it,
 * which is why this keeps taking focus back until the screen settles. Focus that is on something else
 * on the page stays there, and ends this: the first of two steps' elements keeps it, and so does a
 * person who has moved on, whose next step (a card lifted over the page, say) then has the keyboard
 * to give back where it likes.
 */
export function focusOnceShown(el: HTMLElement): void {
    let frames = 0;
    const attempt = (): void => {
        const now = document.activeElement;
        if (now && now !== document.body && now !== el) return;
        // only ever taken from the body, so the line takes focus back the moment a screen being
        // rebuilt drops it, and never from anything else
        if (now !== el && el.isConnected) el.focus({ preventScroll: true });
        if (++frames < FRAMES) requestAnimationFrame(attempt);
    };
    requestAnimationFrame(attempt);
}

/** The page's two live regions, which the Page puts on every page once. */
export function Announcer(): JSX.Element {
    return (
        <>
            <p class="sr" aria-live="polite">
                {polite()}
            </p>
            <p class="sr" aria-live="assertive">
                {urgent()}
            </p>
        </>
    );
}

/**
 * A line on the sheet, read out as it appears, with the one thing that answers it, if there is one.
 * Ordinary notices can be dismissed; focus and recovery messages stay unless explicitly enabled.
 * New text makes a dismissed notice visible again. With `focus` it also takes focus, for a line that is the whole of what a step has to say.
 */
export function Say(props: {
    text: string;
    tone?: "success" | "info" | "error" | "warning";
    focus?: boolean;
    action?: { label: string; run: () => void };
    dismissible?: boolean;
    onDismiss?: () => void;
}): JSX.Element {
    const [dismissed, setDismissed] = createSignal(false);
    createEffect(() => {
        announce(props.text, {
            urgent: props.tone === undefined || props.tone === "error" || props.tone === "warning",
        });
        setDismissed(false);
    });
    return (
        <Show when={!dismissed()}>
            <div
                class={`say ${props.tone ?? "error"}`}
                classList={{ dismissible: props.dismissible ?? (!props.action && !props.focus) }}
                tabindex={props.focus ? -1 : undefined}
                ref={(el) => {
                    if (props.focus) focusOnceShown(el);
                }}
            >
                <p>{props.text}</p>
                <Show when={props.dismissible ?? (!props.action && !props.focus)}>
                    <button
                        type="button"
                        class="say-dismiss"
                        aria-label="Dismiss message"
                        onClick={() => {
                            setDismissed(true);
                            props.onDismiss?.();
                        }}
                    >
                        <span aria-hidden="true">×</span>
                    </button>
                </Show>
                <Show when={props.action}>
                    {(a) => (
                        <div class="acts">
                            <Button second onClick={() => a().run()}>
                                {a().label}
                            </Button>
                        </div>
                    )}
                </Show>
            </div>
        </Show>
    );
}
