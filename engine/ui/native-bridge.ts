// The page's side of the bridge to the mobile app (.docs/mobile.md, "The bridge"), loaded by native.ts
// only when the page is hosted.

import {
    startOf,
    toPage,
    write,
    type Handlers,
    type Paper,
    type Start,
    type ToApp,
    type ToPage,
} from "../host";
import { leaves, type Hooks } from "./native";
import { makeVoice, RATE, setVoice } from "./voice";

export function post<K extends keyof ToApp>(kind: K, body: ToApp[K]): void {
    window.ReactNativeWebView?.postMessage(write<ToApp, K>(kind, body));
}

let hooks: Hooks = {};
let active = true;
const printing = new Map<string, (ok: boolean) => void>();

const real = Object.getOwnPropertyDescriptor(Document.prototype, "visibilityState");
const pageShown = (): boolean => {
    const state: unknown = real?.get?.call(document);
    return state !== "hidden";
};

/**
 * The app in the background is the page hidden, for everything that listens for `visibilitychange`:
 * a game's pause, the answer queue's send and the time a child spent away from a sheet.
 */
function setActive(now: boolean): void {
    if (now === active) return;
    active = now;
    if (!now) dispatchEvent(new Event("blur"));
    document.dispatchEvent(new Event("visibilitychange"));
}

const px = (n: number): string => `${Math.max(0, Math.round(n))}px`;

const ON: Handlers<ToPage> = {
    go: ({ path, replace }) => hooks.go?.(path, replace),
    back: () => hooks.back?.(),
    insets: ({ top, bottom, keyboard }) => {
        const s = document.documentElement.style;
        s.setProperty("--host-top", px(top));
        s.setProperty("--host-bottom", px(bottom));
        s.setProperty("--host-keyboard", px(keyboard));
    },
    appState: ({ active: now }) => setActive(now),
    // the web view's own media query follows the system's setting, which is what the app reports
    reducedMotion: () => undefined,
    enter: (body) => hooks.enter?.(body),
    printed: ({ id, ok }) => {
        printing.get(id)?.(ok);
        printing.delete(id);
    },
};

export function receive(text: string): void {
    const wrong = toPage(text, ON);
    if (wrong !== null) post("failed", { message: wrong });
}

interface Line {
    text: string;
    rate: number;
    onend: (() => unknown) | null;
    onerror: (() => unknown) | null;
}

/** About how long the app takes to read a line, since it does not say when it is done, in ms. */
const readFor = (line: Line): number =>
    (line.text.trim().split(/\s+/).length / (2.6 * line.rate)) * 1000 + 400;

/** The app's voice, which Android's web view needs since it has no speech synthesis of its own. */
function appVoice(): ReturnType<typeof makeVoice> {
    let reading: { line: Line; timer: ReturnType<typeof setTimeout> } | null = null;
    const v = makeVoice<Line>({
        synth: () => ({
            speak: (line) => {
                post("speak", { text: line.text, rate: line.rate });
                reading = { line, timer: setTimeout(() => line.onend?.(), readFor(line)) };
            },
            cancel: () => {
                if (!reading) return;
                clearTimeout(reading.timer);
                reading = null;
                post("hush", {});
            },
        }),
        utter: (text) => ({ text, rate: RATE, onend: null, onerror: null }),
    });
    const once = (): void => {
        v.touched();
        removeEventListener("pointerdown", once, true);
        removeEventListener("keydown", once, true);
    };
    addEventListener("pointerdown", once, true);
    addEventListener("keydown", once, true);
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) v.stop();
    });
    return v;
}

export function connect(app: Start["app"], given: Hooks): void {
    hooks = given;
    Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: (): DocumentVisibilityState => (active && pageShown() ? "visible" : "hidden"),
    });
    Object.defineProperty(document, "hidden", {
        configurable: true,
        get: () => !active || !pageShown(),
    });
    setVoice(appVoice());
    // a plain link out of this app's pages, or to a new tab, is the app's to open; a link that handled
    // its own click has prevented it by the time the click reaches the window
    addEventListener("click", (e) => {
        if (e.defaultPrevented || e.button !== 0) return;
        const a = e.target instanceof Element ? e.target.closest("a[href]") : null;
        if (!(a instanceof HTMLAnchorElement)) return;
        const url = new URL(a.href, location.href);
        if (url.origin !== location.origin) return;
        if (a.target !== "_blank" && !leaves(url.pathname)) return;
        e.preventDefault();
        post("open", { path: `${url.pathname}${url.search}${url.hash}` });
    });
    post("ready", { app });
}

/** What the app asked to show first, which in a child's view also puts the app's chrome in place of the bar. */
export function start(): Start | null {
    const s = startOf(window.lumischoolHost);
    if (typeof s === "string") return null;
    // the app's own bar and tabs stand in for the page's bar in every child's web view
    if (s.app === "kids") document.documentElement.dataset.hostBar = "app";
    return s;
}

/** Hands a sheet to the app to print; true once the app says it printed. */
export async function print(root: HTMLElement, paper: Paper): Promise<boolean> {
    const { printable } = await import("./printable");
    const html = await printable(root, paper);
    const id = crypto.randomUUID();
    return new Promise((done) => {
        printing.set(id, done);
        post("print", { id, html, paper });
    });
}
