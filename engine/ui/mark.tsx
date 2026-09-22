// The logo in a bar: the guide who is a paper bird, idling, beside the word.

import "./mark.css";
import { Show, type JSX } from "solid-js";
import { drawBird } from "./art";
import { Logo } from "./logo";
import { Near } from "./viewport";

/**
 * The logo as a bar shows it: the guide who is a paper bird, idling and facing into the page, beside
 * the word. Given `href`, the whole of it is one link, named "lumischool site"; without one it leads
 * nowhere, as in a children's view. The bird comes through the loader and needs only
 * its own drawing, so it is drawn before any heavier picture, into a box sized first, and it stops
 * under reduced motion.
 */
export function Mark(props: { href?: string }): JSX.Element {
    const inner = (): JSX.Element => (
        <>
            <Near class="bar-mark-bird" draw={drawBird} />
            <Logo kind="word" />
        </>
    );
    return (
        <Show when={props.href} fallback={<span class="bar-mark">{inner()}</span>}>
            {(href) => (
                <a class="bar-mark" href={href()} rel="external" aria-label="lumischool site">
                    {inner()}
                </a>
            )}
        </Show>
    );
}
