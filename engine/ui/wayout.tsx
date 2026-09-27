// The lesson roll's way back to the overworld, visible on interaction or keyboard focus.

import "./wayout.css";
import { createEffect, createSignal, on, onCleanup, onMount, Show, type JSX } from "solid-js";

export interface WayOutProps {
    /** The canvas the hand moves over, whose pointer events show the way. */
    over: () => HTMLElement | undefined;
    /** Whether the camera is moving, while which the way stays out of sight. */
    moving: () => boolean;
    /** Goes out. */
    out: () => void;
    /** The words on it. */
    label: string;
    alternative?: { label: string; change: () => void };
}

/** How long the way stays shown after the hand last moved or lifted, in ms. */
export const WAY_SHOWN = 4_000;

export function WayOut(props: WayOutProps): JSX.Element {
    const [wanted, setWanted] = createSignal(false);
    let timer = 0;
    /** The hand did something: the way shows now, or once the paper rests, and goes again after a while. */
    const ask = (): void => {
        clearTimeout(timer);
        setWanted(true);
        timer = window.setTimeout(() => setWanted(false), WAY_SHOWN);
    };
    /** A mouse moving over the canvas asks for it; a finger or a pen asks on lifting, below. */
    const onMove = (e: PointerEvent): void => {
        if (e.pointerType === "mouse") ask();
    };
    const onLift = (): void => ask();
    // the paper coming to rest after a finger lifted is when the way shows, so its time starts then
    createEffect(
        on(
            () => props.moving(),
            (moving) => {
                if (!moving && wanted()) ask();
            },
            { defer: true },
        ),
    );
    onMount(() => {
        const el = props.over();
        if (!el) return;
        el.addEventListener("pointermove", onMove);
        el.addEventListener("pointerup", onLift);
        el.addEventListener("pointercancel", onLift);
        onCleanup(() => {
            el.removeEventListener("pointermove", onMove);
            el.removeEventListener("pointerup", onLift);
            el.removeEventListener("pointercancel", onLift);
        });
    });
    onCleanup(() => clearTimeout(timer));
    return (
        <div class="wo-tools" classList={{ on: wanted() && !props.moving() }}>
            <button type="button" class="wo" onClick={() => props.out()}>
                {props.label}
            </button>
            <Show when={props.alternative}>
                <button type="button" class="wo" onClick={() => props.alternative?.change()}>
                    {props.alternative?.label}
                </button>
            </Show>
        </div>
    );
}
