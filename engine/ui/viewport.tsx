// Where the page is in the window: a picture drawn only once it comes near, so what is far below the
// first screen costs nothing until the reader scrolls toward it, and whether the page has left the top.

import { createSignal, onCleanup, onMount, type Accessor, type JSX } from "solid-js";

/** Runs `then` once, the first time `el` comes within `margin` of the window, one window's height by default; what it returns gives up waiting. */
export function whenNear(el: Element, then: () => void, margin = "100% 0px"): () => void {
    const io = new IntersectionObserver(
        (seen) => {
            if (!seen.some((e) => e.isIntersecting)) return;
            io.disconnect();
            then();
        },
        { rootMargin: margin },
    );
    io.observe(el);
    return () => io.disconnect();
}

/**
 * A box a picture is drawn into the first time it comes within `margin` of the window. The box is
 * sized by its class before anything is drawn, so a picture arriving never moves the page. It is
 * hidden from assistive technology and takes no focus, since a caption beside it says what it shows.
 */
export function Near(props: {
    class: string;
    draw: (host: HTMLElement) => Promise<void>;
    margin?: string;
}): JSX.Element {
    const [host, setHost] = createSignal<HTMLDivElement>();
    onMount(() => {
        const el = host();
        if (!el) return;
        onCleanup(whenNear(el, () => void props.draw(el), props.margin));
    });
    return <div ref={setHost} class={props.class} aria-hidden="true" inert />;
}

/** Whether a media query matches, kept up to date as the window changes. */
export function matches(query: string): Accessor<boolean> {
    const list = matchMedia(query);
    const [on, setOn] = createSignal(list.matches);
    const change = (): void => {
        setOn(list.matches);
    };
    list.addEventListener("change", change);
    onCleanup(() => list.removeEventListener("change", change));
    return on;
}

/** Whether the page has scrolled more than `px` from its top. */
export function scrolledPast(px: number): Accessor<boolean> {
    const [past, setPast] = createSignal(window.scrollY > px);
    const read = (): void => {
        setPast(window.scrollY > px);
    };
    addEventListener("scroll", read, { passive: true });
    onCleanup(() => removeEventListener("scroll", read));
    return past;
}
