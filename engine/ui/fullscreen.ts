// Full screen for one element, as the apps' maps use it: the Fullscreen API where the browser gives
// the screen to an element, and where it does not (Safari on an iPhone gives it only to a
// video), the element fixed over the whole viewport instead. F toggles it and Escape leaves it, and
// the page is told after every change and every resize while it lasts, so a canvas can refit.

/** How the element has the screen: not at all, through the Fullscreen API, or over the viewport. */
export type Mode = "off" | "element" | "viewport";

/** What a key press asks of full screen. */
type Ask = "toggle" | "leave" | null;

export interface KeyPress {
    key: string;
    metaKey: boolean;
    ctrlKey: boolean;
    altKey: boolean;
    repeat: boolean;
    /** The key went to a field that takes typing, where F is a letter. */
    typing: boolean;
}

/**
 * F toggles full screen and Escape leaves it. Under the Fullscreen API the browser leaves on Escape
 * itself, before the page hears the key, so Escape is the page's to act on only in the viewport's
 * fallback, where nothing else would.
 */
export function askOf(k: KeyPress, mode: Mode): Ask {
    if (k.typing || k.metaKey || k.ctrlKey || k.altKey) return null;
    if (k.key === "f" || k.key === "F") return k.repeat ? null : "toggle";
    if (k.key === "Escape" && mode === "viewport") return "leave";
    return null;
}

/** What a document says about giving an element the screen, standard or prefixed. */
interface Grants {
    fullscreenEnabled?: boolean;
    webkitFullscreenEnabled?: boolean;
}

/** What an element offers for asking for the screen, standard or prefixed. */
interface Asks {
    requestFullscreen?: unknown;
    webkitRequestFullscreen?: unknown;
}

/** How this browser can give an element the screen. Safari on an iPhone grants neither way. */
export function wayFor(doc: Grants, el: Asks): "element" | "viewport" {
    const standard = doc.fullscreenEnabled === true && typeof el.requestFullscreen === "function";
    const prefixed =
        doc.webkitFullscreenEnabled === true && typeof el.webkitRequestFullscreen === "function";
    return standard || prefixed ? "element" : "viewport";
}

/**
 * The inline style that fixes an element over the viewport, set in this order. A height of 100vh
 * comes before 100dvh, so a browser that does not know dvh keeps the first and one that does takes
 * the second, which leaves room for Safari's own bars as they come and go.
 */
export const FILL: readonly (readonly [string, string])[] = [
    ["position", "fixed"],
    ["inset", "0"],
    ["width", "100%"],
    ["height", "100vh"],
    ["height", "100dvh"],
    ["max-width", "none"],
    ["max-height", "none"],
    ["margin", "0"],
    ["border-radius", "0"],
    ["z-index", "2147483000"],
];

interface Options {
    /** The element that takes the screen: the map's container, with its controls inside it. */
    target: HTMLElement;
    /** Told after entering, after leaving and after each resize while full, so a canvas refits. */
    changed?(mode: Mode): void;
    /** Whether full screen is on offer now. While it is not, F is a letter like any other. */
    offered?(): boolean;
    /** A key the page wants before full screen does, such as Escape while a menu is open. */
    keeps?(e: KeyboardEvent): boolean;
}

interface Fullscreen {
    readonly mode: Mode;
    enter(): Promise<void>;
    leave(): Promise<void>;
    toggle(): Promise<void>;
    dispose(): void;
}

interface PrefixedDocument extends Document {
    webkitFullscreenEnabled?: boolean;
    webkitFullscreenElement?: Element | null;
    webkitExitFullscreen?: () => Promise<void> | void;
}

interface PrefixedElement extends HTMLElement {
    webkitRequestFullscreen?: () => Promise<void> | void;
}

const typing = (t: EventTarget | null): boolean =>
    t instanceof HTMLElement &&
    (t.isContentEditable || t.closest("input, textarea, select") !== null);

/**
 * Full screen for `o.target`. The target carries `data-fullscreen` set to the mode while it has the
 * screen, which the page's stylesheet reads to float its controls over the map.
 */
export function fullscreen(o: Options): Fullscreen {
    const doc: PrefixedDocument = document;
    const el: PrefixedElement = o.target;
    const root = document.documentElement;
    let mode: Mode = "off";
    let frame = 0;
    const before = new Map<string, [string, string]>();
    let overflow = "";

    const set = (next: Mode): void => {
        if (next === mode) return;
        mode = next;
        if (next === "off") delete el.dataset.fullscreen;
        else el.dataset.fullscreen = next;
        o.changed?.(next);
    };
    const holding = (): Element | null =>
        doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;

    const fill = (): void => {
        for (const [name] of FILL) {
            if (!before.has(name))
                before.set(name, [
                    el.style.getPropertyValue(name),
                    el.style.getPropertyPriority(name),
                ]);
        }
        for (const [name, value] of FILL) el.style.setProperty(name, value);
        overflow = root.style.overflow;
        root.style.overflow = "hidden";
    };
    const unfill = (): void => {
        for (const [name, [value, priority]] of before) {
            if (value) el.style.setProperty(name, value, priority);
            else el.style.removeProperty(name);
        }
        before.clear();
        root.style.overflow = overflow;
    };

    async function enter(): Promise<void> {
        if (mode !== "off" || o.offered?.() === false) return;
        if (wayFor(doc, el) === "element") {
            try {
                if (doc.fullscreenEnabled) await el.requestFullscreen({ navigationUI: "hide" });
                else await el.webkitRequestFullscreen?.();
                // the browser says when it has given the screen, in the change event
                return;
            } catch {
                // refused, as a browser may refuse a request it does not trust: fill the viewport
            }
        }
        fill();
        set("viewport");
    }

    async function leave(): Promise<void> {
        if (mode === "viewport") {
            unfill();
            set("off");
            return;
        }
        if (mode !== "element" || holding() !== el) return;
        try {
            if (doc.fullscreenElement) await doc.exitFullscreen();
            else await doc.webkitExitFullscreen?.();
        } catch {
            set("off");
        }
    }

    const toggle = (): Promise<void> => (mode === "off" ? enter() : leave());

    const changedScreen = (): void => {
        if (holding() === el) set("element");
        else if (mode === "element") set("off");
    };
    const key = (e: KeyboardEvent): void => {
        if (o.keeps?.(e)) return;
        const ask = askOf(
            {
                key: e.key,
                metaKey: e.metaKey,
                ctrlKey: e.ctrlKey,
                altKey: e.altKey,
                repeat: e.repeat,
                typing: typing(e.target),
            },
            mode,
        );
        if (!ask || (mode === "off" && o.offered?.() === false)) return;
        e.preventDefault();
        e.stopPropagation();
        void (ask === "toggle" ? toggle() : leave());
    };
    const resized = new ResizeObserver(() => {
        if (mode === "off") return;
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => o.changed?.(mode));
    });

    doc.addEventListener("fullscreenchange", changedScreen);
    doc.addEventListener("webkitfullscreenchange", changedScreen);
    // in the capture phase, so an Escape that leaves the fallback does not also reach the canvas
    doc.addEventListener("keydown", key, true);
    resized.observe(el);

    return {
        get mode() {
            return mode;
        },
        enter,
        leave,
        toggle,
        dispose() {
            doc.removeEventListener("fullscreenchange", changedScreen);
            doc.removeEventListener("webkitfullscreenchange", changedScreen);
            doc.removeEventListener("keydown", key, true);
            resized.disconnect();
            cancelAnimationFrame(frame);
            void leave();
        },
    };
}
