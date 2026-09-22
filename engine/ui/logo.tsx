// The logo on a page: the paper bird from engine/parts/brand.ts, drawn inline so it needs no file
// and no font, with its loop (.docs/brand.md, "Motion"). It is written into the page once and never
// redrawn; after that only its animations' timing changes, so nothing ever flashes.

import "./logo.css";
import { createEffect, on, onCleanup, onMount, type JSX } from "solid-js";
import { BIRD, lockup, markArt, motionCss, svgFile, wordArt, type Art } from "../parts/brand";

type LogoKind = "horizontal" | "stacked" | "mark" | "word";

/** Each kind's drawing, and whether it carries the loop, which only the mark does. */
const KINDS: Record<LogoKind, { art: () => Art; moves: boolean }> = {
    horizontal: { art: () => lockup(BIRD, "horizontal", { moving: true }), moves: true },
    stacked: { art: () => lockup(BIRD, "stacked", { moving: true }), moves: true },
    mark: { art: () => markArt(BIRD, { moving: true }), moves: true },
    word: { art: () => wordArt(BIRD), moves: false },
};

/** One more loop from rest, once the last has finished, keeping each part's lag behind the first. */
function replay(host: Element): void {
    const anims = host.getAnimations({ subtree: true });
    if (anims.length === 0 || anims.some((a) => a.playState !== "finished")) return;
    const delay = (a: Animation): number => Number(a.effect?.getTiming().delay ?? 0);
    const first = Math.min(...anims.map(delay));
    for (const a of anims) {
        a.effect?.updateTiming({ iterations: 1, delay: delay(a) - first });
        a.currentTime = 0;
        a.play();
    }
}

/** Lets the loop run on, or has it finish the loop it is in and rest as drawn, rather than cut. */
function keepLooping(host: Element, running: boolean): void {
    for (const a of host.getAnimations({ subtree: true })) {
        if (running) {
            a.effect?.updateTiming({ iterations: Infinity });
            a.play();
        } else {
            const now = a.effect?.getComputedTiming().currentIteration ?? 0;
            a.effect?.updateTiming({ iterations: now + 1 });
        }
    }
}

/**
 * The horizontal lockup, the stacked one, the mark alone or the word alone, named for a screen
 * reader. In a top bar its loop plays twice a moment after the page opens and then rests, and a
 * pointer over it plays one more loop from rest. Given `loading`, it loops while that is true, as on
 * a loading screen, and finishes the loop it is in when it turns false. Under reduced motion and in
 * print it never moves, which the loop's own stylesheet sees to. Its height is 34 px unless a class
 * says otherwise.
 */
export function Logo(props: {
    kind?: LogoKind;
    label?: string;
    class?: string;
    loading?: boolean;
}): JSX.Element {
    const kind = props.kind ?? "horizontal";
    const label = props.label ?? "lumischool";
    const { art, moves } = KINDS[kind];
    const markup = svgFile(art(), { title: label, style: moves ? motionCss(BIRD) : undefined });
    const loading = props.loading;
    let host: HTMLSpanElement | undefined;

    onMount(() => {
        const el = host;
        if (!el) return;
        el.querySelector("svg")?.setAttribute("aria-label", label);
        if (loading !== undefined) return;
        const again = (): void => replay(el);
        el.addEventListener("pointerenter", again);
        onCleanup(() => el.removeEventListener("pointerenter", again));
    });

    createEffect(
        on(
            () => props.loading,
            (now) => {
                if (host && now !== undefined) keepLooping(host, now);
            },
            { defer: true },
        ),
    );

    return (
        <span
            ref={(el) => {
                host = el;
            }}
            class={props.class === undefined ? "logo" : `logo ${props.class}`}
            style={{
                "--b-runs": loading === undefined ? "2" : loading ? "infinite" : "1",
                "--b-delay": loading === undefined ? "1.4s" : ".6s",
            }}
            innerHTML={markup}
        />
    );
}
