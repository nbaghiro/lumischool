// A page inside the mobile app's web view (.docs/mobile.md, "Host mode in the web apps"). This file is
// all a page carries for it: the test, and the way to the bridge, which loads only when hosted.

import type { Paper, Start, ToApp, ToPage } from "../host";

declare global {
    interface Window {
        ReactNativeWebView?: { postMessage(text: string): void };
        lumischool?: { receive(text: string): void };
        /** Set by the app before the page loads; read through `startOf` in engine/host.ts. */
        lumischoolHost?: unknown;
    }
}

const HOSTED =
    typeof window === "object" &&
    (window.ReactNativeWebView !== undefined || navigator.userAgent.includes("lumischoolApp/"));

/** Whether this page runs inside the mobile app. */
export const hosted = (): boolean => HOSTED;

/** What an app does with the app's requests to move; the bridge handles the rest itself. */
export interface Hooks {
    go?: (path: string, replace: boolean) => void;
    back?: () => void;
    enter?: (enter: ToPage["enter"]) => void;
}

let bridge: Promise<typeof import("./native-bridge")> | null = null;
const load = (): Promise<typeof import("./native-bridge")> =>
    (bridge ??= import("./native-bridge"));

/** Tells the app something, in the order things are sent; nothing when the page is not hosted. */
export function send<K extends keyof ToApp>(kind: K, body: ToApp[K]): void {
    if (HOSTED) void load().then((b) => b.post(kind, body));
}

/** Starts host mode for an app, when hosted: the document's mark, the app's messages, and its hooks. */
export function boot(app: Start["app"], hooks: Hooks): void {
    if (!HOSTED) return;
    document.documentElement.dataset.host = "native";
    // the grown-ups' screens always sit under the app's own header and tabs
    if (app === "home") document.documentElement.dataset.hostBar = "app";
    window.lumischool = { receive: (text) => void load().then((b) => b.receive(text)) };
    void load().then((b) => b.connect(app, hooks));
}

/** What the app asked the page to show first, or null in a browser or when it asked for nothing. */
export const start = (): Promise<Start | null> =>
    HOSTED ? load().then((b) => b.start()) : Promise.resolve(null);

/** Hands a printable element to the app; true once the app says it printed. */
export const printHosted = (root: HTMLElement, paper: Paper): Promise<boolean> =>
    load().then((b) => b.print(root, paper));

/** A path that leaves this app's pages, which the app opens itself rather than the web view. */
export function leaves(href: string): boolean {
    const path = href.split(/[?#]/, 1)[0] ?? "";
    return ["/kids", "/open-child", "/sign-in", "/start"].some(
        (p) => path === p || path.startsWith(`${p}/`),
    );
}
