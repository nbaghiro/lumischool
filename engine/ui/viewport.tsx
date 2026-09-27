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

/** Whether a modal dialog that does not hold `el` is open over the page, which hides `el` as surely as scrolling it away. */
const covered = (el: Element): boolean =>
    Array.from(document.querySelectorAll("dialog[open]")).some(
        (d) => d.matches(":modal") && !d.contains(el),
    );

/** Everyone waiting to hear that a dialog opened or closed, with one observer between them. */
const coverWatchers = new Set<() => void>();
let coverWatch: MutationObserver | null = null;
function onCover(then: () => void): () => void {
    coverWatchers.add(then);
    coverWatch ??= new MutationObserver(() => {
        for (const w of coverWatchers) w();
    });
    if (coverWatchers.size === 1)
        coverWatch.observe(document.body, {
            subtree: true,
            attributes: true,
            attributeFilter: ["open"],
        });
    return () => {
        coverWatchers.delete(then);
        if (!coverWatchers.size) coverWatch?.disconnect();
    };
}

/** A reversible scene lifetime with a small prewarm margin, paused while the tab is hidden or a modal dialog covers it. */
export function whileNear(el: Element, change: (near: boolean) => void): () => void {
    let near = false;
    let active: boolean | undefined;
    const update = (): void => {
        const next = near && !document.hidden && !covered(el);
        if (next === active) return;
        active = next;
        change(next);
    };
    const io = new IntersectionObserver(
        (entries) => {
            near = entries.some((entry) => entry.isIntersecting);
            update();
        },
        { rootMargin: "240px 0px" },
    );
    io.observe(el);
    document.addEventListener("visibilitychange", update);
    const uncover = onCover(update);
    return () => {
        io.disconnect();
        document.removeEventListener("visibilitychange", update);
        uncover();
    };
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
