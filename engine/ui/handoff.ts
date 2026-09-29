// The screen held as the map hands over to a world and back (.docs/map-smoothness-plan.md, phase 1):
// the overworld going into a world, or a roll going back to the map, leaves its element where it
// stood, over the page, until what replaces it has drawn what it opens on, and fades it out as that
// shows. Nothing between the two is bare paper.

import { still } from "./art";

/** The longest a screen is held for one that never says it has drawn. */
const LONGEST = 3000;
/** How long the held screen takes to fade once the next shows. */
const FADE = 200;

/** What is held: the map on its way into a world, or a roll on its way back to the map. */
type Held = "map" | "roll";

let held: {
    curtain: HTMLElement;
    what: Held;
    done: () => void;
    timer: ReturnType<typeof setTimeout>;
} | null = null;

/**
 * Holds `el` on the screen where it stands, over whatever takes its place, until `release`. `done` runs
 * once it has gone, for the screen to park or let go of what it drew.
 */
export function hold(el: HTMLElement, what: Held, done: () => void): void {
    release(false);
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) {
        done();
        return;
    }
    const curtain = document.createElement("div");
    curtain.className = "handoff";
    curtain.setAttribute("aria-hidden", "true");
    const s = curtain.style;
    s.position = "fixed";
    s.left = `${r.left}px`;
    s.top = `${r.top}px`;
    s.width = `${r.width}px`;
    s.height = `${r.height}px`;
    s.zIndex = "2147483000";
    s.pointerEvents = "none";
    s.overflow = "hidden";
    // a map opened in a dialog is held in it, since the page under a modal dialog is covered by it
    const into = el.closest("dialog") ?? document.body;
    // taken up once the page has put what replaces it where it stood, since a page puts the new
    // screen at the old one's place and would put it in the curtain; the microtask is before any paint
    queueMicrotask(() => {
        if (held?.curtain !== curtain) return;
        into.append(curtain);
        curtain.append(el);
        // it is sized by the page it has left, and the curtain stands in for that page now
        el.style.width = "100%";
        el.style.height = "100%";
    });
    held = { curtain, what, done, timer: setTimeout(() => release(true), LONGEST) };
}

/**
 * Lets the held screen go, faded out over what has taken its place or at once, and says whether one
 * was held; with `what`, only a screen of that kind.
 */
export function release(fade = true, what?: Held): boolean {
    const h = held;
    if (!h || (what && h.what !== what)) return false;
    held = null;
    clearTimeout(h.timer);
    const gone = (): void => {
        h.curtain.remove();
        h.done();
    };
    if (!fade || still()) {
        gone();
        return true;
    }
    const a = h.curtain.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: FADE,
        easing: "ease-out",
    });
    a.onfinish = gone;
    a.oncancel = gone;
    return true;
}
