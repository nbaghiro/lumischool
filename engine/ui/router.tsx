// Moving between an app's screens without a page load. Each app is one page on the one origin, and
// its path names the screen (.docs/local.md, "The apps"); a link to another app, or to the site, is a
// plain link and loads that page.

import {
    createContext,
    createEffect,
    createMemo,
    createSignal,
    For,
    on,
    onCleanup,
    untrack,
    useContext,
    type Accessor,
    type Component,
    type JSX,
} from "solid-js";
import { Dynamic } from "solid-js/web";
import { hosted, leaves, send } from "./native";

const [now, setNow] = createSignal(location.pathname);
// every move notifies, so a link to the address already shown still asks the screen to show it
const [query, setQuery] = createSignal(location.search, { equals: false });
addEventListener("popstate", () => {
    setNow(location.pathname);
    setQuery(location.search);
});

/** The path of the screen the app is showing, which changes as it moves between screens. */
export const path = now;

/** The address's query, `?kid=…`, which a screen reads to open what it names. */
export const search = query;

/**
 * Moves to a path in this app, with its query and fragment, without a page load. `state` marks the
 * entry for the screen that made it, such as the entry a preview pushed over the catalogue it opened
 * from, so that screen can tell its own entry from one a reader arrived on.
 */
export function go(to: string, o: { replace?: boolean; state?: unknown } = {}): void {
    const from = location.pathname;
    if (o.replace) history.replaceState(o.state ?? null, "", to);
    else history.pushState(o.state ?? null, "", to);
    setNow(location.pathname);
    setQuery(location.search);
    // a new path opens at its top, which the Router does once the screen it names is on the page; a
    // change of state on the same path, such as the calendar's view or a search, keeps the reader
    // where they are
    if (location.pathname !== from) setMoved((n) => n + 1);
}

// counts the moves to a new path, so the Router can open the screen it names at its top
const [moved, setMoved] = createSignal(0);

/** A link within this app. A click with a modifier key is left to the browser, for a new tab. */
export function Link(props: { href: string; class?: string; children: JSX.Element }): JSX.Element {
    return (
        <a
            href={props.href}
            class={props.class ?? "link"}
            onClick={(e) => {
                if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                e.preventDefault();
                if (hosted() && leaves(props.href)) send("open", { path: props.href });
                else go(props.href);
            }}
        >
            {props.children}
        </a>
    );
}

interface Frame {
    shown: Accessor<boolean>;
    wait(ready: Accessor<boolean>): void;
}

const FrameContext = createContext<Frame>();

/** Whether this screen is the one on the page, rather than the next one being made ready behind it. */
export const useShown = (): Accessor<boolean> => useContext(FrameContext)?.shown ?? (() => true);

/**
 * Holds the move to this screen until `ready` is true, so the screen before it stays on the page
 * until this one can draw. A screen that says nothing is ready as soon as it is made.
 */
export function useReady(ready: Accessor<boolean>): void {
    useContext(FrameContext)?.wait(ready);
}

/** The longest the screen before is held for one that is not ready, in milliseconds; past it the new one shows its own wait. */
const HOLD = 700;

/**
 * The screen the path names. The screen on the page stays there while the next one is made, out of
 * sight but in the document so its drawings read the page's colours, and the next takes its place
 * once it says it is ready (`useReady`) or `HOLD` has passed; its code is loaded first, by `load`.
 * There is no Suspense boundary round the screens: under one, a resource a screen has read while it
 * was resolved registers with the boundary, and when it next loads the boundary takes the whole
 * screen out of the document until it answers, so a drawing that finishes in that moment reads its
 * colours from a host that is not on the page and paints the print palette (the black stamps of 21
 * September). A screen keeps what it has (`resource.latest`) while it asks again.
 */
export function Router<S extends string>(props: {
    screens: Readonly<Record<S, Component>>;
    screenOf: (path: string) => S;
    load?: (screen: S) => Promise<unknown>;
}): JSX.Element {
    const target = createMemo(() => props.screenOf(now()));
    const [shown, setShown] = createSignal<S>(untrack(target));
    const [coming, setComing] = createSignal<S | null>(null);
    let top = false;
    createEffect(
        on(
            moved,
            () => {
                if (target() === shown()) scrollTo(0, 0);
                else top = true;
            },
            { defer: true },
        ),
    );
    createEffect(
        on(
            target,
            (s) => {
                if (s === shown()) {
                    setComing(null);
                    return;
                }
                const next = (): void => {
                    if (target() === s) setComing(() => s);
                };
                void (props.load?.(s) ?? Promise.resolve()).then(next, next);
            },
            { defer: true },
        ),
    );
    const reveal = (s: S): void => {
        if (coming() !== s) return;
        const before = document.activeElement;
        setShown(() => s);
        setComing(null);
        if (top) scrollTo(0, 0);
        top = false;
        // the screen that held the keyboard has gone, so its heading takes it, as a page load's would
        if (!before || before === document.body || !before.isConnected)
            document.querySelector<HTMLElement>(".page-screen h1[tabindex]")?.focus({
                preventScroll: true,
            });
    };
    const frames = createMemo((): S[] => {
        const c = coming();
        return c && c !== shown() ? [shown(), c] : [shown()];
    });
    return (
        <For each={frames()}>
            {(s) => (
                <Screen
                    shown={() => shown() === s}
                    ready={() => reveal(s)}
                    component={props.screens[s]}
                />
            )}
        </For>
    );
}

function Screen(props: {
    shown: Accessor<boolean>;
    ready: () => void;
    component: Component;
}): JSX.Element {
    const [waits, setWaits] = createSignal<Accessor<boolean>[]>([]);
    const ready = createMemo(() => waits().every((w) => w()));
    createEffect(() => {
        if (!props.shown() && ready()) props.ready();
    });
    const held = setTimeout(() => {
        if (!props.shown()) props.ready();
    }, HOLD);
    onCleanup(() => clearTimeout(held));
    return (
        <FrameContext.Provider
            value={{ shown: props.shown, wait: (r) => setWaits((w) => [...w, r]) }}
        >
            <div
                class="page-screen"
                classList={{ coming: !props.shown() }}
                aria-hidden={props.shown() ? undefined : true}
                inert={!props.shown()}
            >
                <Dynamic component={props.component} />
            </div>
        </FrameContext.Provider>
    );
}
