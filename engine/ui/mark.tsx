// The logo in a bar: the guide who is a paper bird, idling, beside the word.

import "./mark.css";
import { isServer } from "solid-js/web";
import { Show, type JSX } from "solid-js";
import { drawBird } from "./art";
import { Logo } from "./logo";
import { Near } from "./viewport";

/**
 * The logo as a bar shows it: the guide who is a paper bird, idling and facing into the page, beside
 * the word. Given `href`, the whole of it is one link, named "lumischool site", or `label` where it
 * goes somewhere in the app, which `go` does without a page load; without one it leads nowhere. The
 * bird comes through the loader and needs only its own drawing, so it is drawn before any heavier picture, into a box sized first, and it stops
 * under reduced motion.
 */
export function Mark(props: { href?: string; label?: string; go?: () => void }): JSX.Element {
    const inner = (): JSX.Element => (
        <>
            {isServer ? (
                <img class="bar-mark-bird" src="/favicon.svg" alt="" />
            ) : (
                <Near class="bar-mark-bird" draw={drawBird} />
            )}
            <Logo kind="word" />
        </>
    );
    return (
        <Show when={props.href} fallback={<span class="bar-mark">{inner()}</span>}>
            {(href) => (
                <a
                    class="bar-mark"
                    href={href()}
                    rel={props.go ? undefined : "external"}
                    aria-label={props.label ?? "lumischool site"}
                    onClick={(e) => {
                        const go = props.go;
                        if (!go || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
                        e.preventDefault();
                        go();
                    }}
                >
                    {inner()}
                </a>
            )}
        </Show>
    );
}
