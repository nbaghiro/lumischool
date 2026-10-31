import { smallDevice } from "./device";

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

/** Every scene lifetime on the page, for a phone to keep one alive at a time. */
const lifetimes = new Set<{ near: boolean; shown: number; update: () => void }>();
/**
 * On a phone, the lifetime whose box shows most of itself in the window, the only one alive: two
 * scenes at once, as two maps a scroll apart are, hold two GPU contexts and their textures, which a
 * phone's browser ends the page for.
 */
const foremost = (): { near: boolean; shown: number } | null => {
    let best: { near: boolean; shown: number } | null = null;
    for (const l of lifetimes) if (l.near && (!best || l.shown > best.shown)) best = l;
    return best;
};

/**
 * A reversible scene lifetime with a small prewarm margin, paused while the tab is hidden or a modal
 * dialog covers it, and on a phone while another is more in view.
 */
export function whileNear(el: Element, change: (near: boolean) => void): () => void {
    let active: boolean | undefined;
    const me = {
        near: false,
        shown: 0,
        update: (): void => {
            const next =
                me.near && !document.hidden && !covered(el) && (!smallDevice || foremost() === me);
            if (next === active) return;
            active = next;
            change(next);
        },
    };
    lifetimes.add(me);
    const all = (): void => {
        for (const l of lifetimes) l.update();
    };
    const io = new IntersectionObserver(
        (entries) => {
            for (const entry of entries) {
                me.near = entry.isIntersecting;
                me.shown = entry.intersectionRect.width * entry.intersectionRect.height;
            }
            all();
        },
        { rootMargin: "240px 0px", threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    io.observe(el);
    document.addEventListener("visibilitychange", me.update);
    const uncover = onCover(me.update);
    return () => {
        io.disconnect();
        lifetimes.delete(me);
        document.removeEventListener("visibilitychange", me.update);
        uncover();
        all();
    };
}
