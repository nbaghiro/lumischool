// The messages between the mobile app and a page it hosts in a web view (.docs/mobile.md, "The
// bridge"). Both sides import this file, and each checks what arrives, since a message is outside input.

/** Raised only when a message changes shape; a page must keep answering the app one version back. */
export const HOST_VERSION = 1;

export interface Box {
    x: number;
    y: number;
    w: number;
    h: number;
}

export type Paper = "a4" | "letter";

type Empty = Record<string, never>;

/** What the app tells a page. */
export interface ToPage {
    go: { path: string; replace: boolean };
    back: Empty;
    insets: { top: number; bottom: number; keyboard: number };
    appState: { active: boolean };
    reducedMotion: { on: boolean };
    /**
     * Opens a world's roll in the child's view, growing from the place's box on the native map. An
     * empty `world` is the one the guide stands at, which holds today's sheets.
     */
    enter: { world: string; box: Box | null };
    /** The answer to a page's `print`, so the page records a printed sheet only once it printed. */
    printed: { id: string; ok: boolean };
}

/** What a page tells the app. */
export interface ToApp {
    ready: { app: "home" | "kids" };
    route: { path: string; title: string; canGoBack: boolean };
    /** A link that leaves this app's pages, such as `/kids` from the grown-ups' app. */
    open: { path: string };
    /** A grown-up opened a child's view; the app switches to child mode with this credential. */
    childMode: { credential: string };
    /** A grown-up left the child's view; the app goes back to parent mode. */
    parentMode: Empty;
    /** The child whose view this is, once chosen on Who or because the view holds only them. */
    child: { kid: string; name: string };
    /** The child left a world's roll; the map rises back out of the place's box. */
    out: { box: Box | null };
    /** A sitting finished and its answers were sent, so the map's record is read again. */
    finished: Empty;
    told: { feel: "right" | "again" | "done" };
    speak: { text: string; rate: number };
    hush: Empty;
    print: { id: string; html: string; paper: Paper };
    /** A picture for the share sheet, as a `data:image/png;base64,` URL. */
    share: { name: string; png: string };
    /** A game is on screen and how it may be held, or null when none is. */
    playing: { portrait: "keep" | "hint" | "either" | null };
    unsent: { count: number; offline: boolean };
    failed: { message: string };
}

/**
 * What the app sets on `window.lumischoolHost` before a page loads: which app the web view holds and,
 * for a child's view, what it shows first, a world's roll or one of the bar's places, rather than the
 * web map. With neither, the child's view opens on its web map as it does in a browser.
 */
export interface Start {
    app: "home" | "kids";
    enter: ToPage["enter"] | null;
    /** `map` is the child's web map without the bar, and `who` is the page that asks who is learning. */
    place: Place | null;
    /** The child a tab shows, chosen on the app's own Who; null lets the page ask. */
    kid: string | null;
}

const PLACES = ["games", "painting", "map", "who"] as const;
export type Place = (typeof PLACES)[number];

/** One function per kind, so a new kind without its handler is a type error. */
export type Handlers<T> = { [K in keyof T]: (body: T[K]) => void };

type Fields = Record<string, unknown>;

/** Reads a kind's body from a message's fields, or says what is wrong with them. */
type Checkers<T> = { [K in keyof T]: (m: Fields) => T[K] | string };

const obj = (v: unknown): v is Fields => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const str = (v: unknown): v is string => typeof v === "string";
const bool = (v: unknown): v is boolean => typeof v === "boolean";
const local = (v: unknown): v is string => str(v) && v.startsWith("/") && !v.startsWith("//");

function boxOf(v: unknown): Box | null | string {
    if (v === null) return null;
    if (obj(v) && num(v.x) && num(v.y) && num(v.w) && num(v.h)) {
        return { x: v.x, y: v.y, w: v.w, h: v.h };
    }
    return "a box is x, y, w and h";
}

const PAGE: Checkers<ToPage> = {
    go: (m) =>
        local(m.path) && bool(m.replace) ? { path: m.path, replace: m.replace } : "go: path",
    back: () => ({}),
    insets: (m) =>
        num(m.top) && num(m.bottom) && num(m.keyboard)
            ? { top: m.top, bottom: m.bottom, keyboard: m.keyboard }
            : "insets: three numbers",
    appState: (m) => (bool(m.active) ? { active: m.active } : "appState: active"),
    reducedMotion: (m) => (bool(m.on) ? { on: m.on } : "reducedMotion: on"),
    enter: (m) => {
        const box = boxOf(m.box);
        if (!str(m.world) || typeof box === "string") return "enter: a world and a box";
        return { world: m.world, box };
    },
    printed: (m) => (str(m.id) && bool(m.ok) ? { id: m.id, ok: m.ok } : "printed: id and ok"),
};

const FEELS = ["right", "again", "done"] as const;
const PORTRAITS = ["keep", "hint", "either", null] as const;
const PNG = "data:image/png;base64,";

const APP: Checkers<ToApp> = {
    ready: (m) => (m.app === "home" || m.app === "kids" ? { app: m.app } : "ready: an app"),
    route: (m) =>
        local(m.path) && str(m.title) && bool(m.canGoBack)
            ? { path: m.path, title: m.title, canGoBack: m.canGoBack }
            : "route: path, title and canGoBack",
    open: (m) => (local(m.path) ? { path: m.path } : "open: a path"),
    childMode: (m) =>
        str(m.credential) && m.credential !== ""
            ? { credential: m.credential }
            : "childMode: a credential",
    parentMode: () => ({}),
    child: (m) =>
        str(m.kid) && m.kid !== "" && str(m.name)
            ? { kid: m.kid, name: m.name }
            : "child: a kid and a name",
    out: (m) => {
        const box = boxOf(m.box);
        return typeof box === "string" ? "out: a box" : { box };
    },
    finished: () => ({}),
    told: (m) => {
        const feel = FEELS.find((f) => f === m.feel);
        return feel === undefined ? "told: a feel" : { feel };
    },
    speak: (m) => (str(m.text) && num(m.rate) ? { text: m.text, rate: m.rate } : "speak: text"),
    hush: () => ({}),
    print: (m) =>
        str(m.id) && str(m.html) && (m.paper === "a4" || m.paper === "letter")
            ? { id: m.id, html: m.html, paper: m.paper }
            : "print: id, html and paper",
    share: (m) =>
        str(m.name) && str(m.png) && m.png.startsWith(PNG)
            ? { name: m.name, png: m.png }
            : "share: a name and a png",
    playing: (m) => {
        const portrait = PORTRAITS.find((p) => p === m.portrait);
        return portrait === undefined ? "playing: a portrait" : { portrait };
    },
    unsent: (m) =>
        num(m.count) && bool(m.offline)
            ? { count: m.count, offline: m.offline }
            : "unsent: a count and offline",
    failed: (m) => (str(m.message) ? { message: m.message } : "failed: a message"),
};

/** Reads `window.lumischoolHost`, or says what is wrong with it. */
export function startOf(v: unknown): Start | string {
    if (!obj(v) || (v.app !== "home" && v.app !== "kids")) return "a start names its app";
    let enter: Start["enter"] = null;
    if (v.enter !== undefined && v.enter !== null) {
        const e = obj(v.enter) ? PAGE.enter(v.enter) : "enter: a world and a box";
        if (typeof e === "string") return e;
        enter = e;
    }
    const place = PLACES.find((p) => p === v.place) ?? null;
    if (v.place !== undefined && v.place !== null && place === null)
        return "a place is games, painting, map or who";
    if (v.kid !== undefined && v.kid !== null && !str(v.kid)) return "a kid is an id";
    return { app: v.app, enter, place, kid: str(v.kid) ? v.kid : null };
}

const isKind = <T extends object>(checkers: T, kind: string): kind is Extract<keyof T, string> =>
    Object.hasOwn(checkers, kind);

function run<T, K extends keyof T>(
    kind: K,
    m: Fields,
    checkers: Checkers<T>,
    on: Handlers<T>,
): string | null {
    const body = checkers[kind](m);
    if (typeof body === "string") return body;
    on[kind](body);
    return null;
}

/** Hands a message to its handler, or returns what was wrong with it. */
function dispatch<T>(text: string, checkers: Checkers<T>, on: Handlers<T>): string | null {
    let parsed: unknown;
    try {
        parsed = JSON.parse(text);
    } catch {
        return "a message is JSON";
    }
    if (!obj(parsed)) return "a message is an object";
    if (parsed.v !== HOST_VERSION) return `version ${String(parsed.v)} is not ${HOST_VERSION}`;
    const kind = parsed.kind;
    if (!str(kind) || !isKind(checkers, kind)) return `"${String(kind)}" is not a kind`;
    return run(kind, parsed, checkers, on);
}

export const toPage = (text: string, on: Handlers<ToPage>): string | null =>
    dispatch(text, PAGE, on);
export const toApp = (text: string, on: Handlers<ToApp>): string | null => dispatch(text, APP, on);

export function write<T, K extends keyof T & string>(kind: K, body: T[K]): string {
    return JSON.stringify({ ...body, v: HOST_VERSION, kind });
}
