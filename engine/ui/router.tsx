// Moving between an app's screens without a page load. Each app is one page on the one origin, and
// its path names the screen (.docs/local.md, "The apps"); a link to another app, or to the site, is a
// plain link and loads that page.

import { createSignal, type Component, type JSX } from "solid-js";
import { Dynamic } from "solid-js/web";

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

/** Moves to a path in this app, with its query and fragment, without a page load. */
export function go(to: string, o: { replace?: boolean } = {}): void {
    const from = location.pathname;
    if (o.replace) history.replaceState(null, "", to);
    else history.pushState(null, "", to);
    setNow(location.pathname);
    setQuery(location.search);
    // a new screen opens at its top; a change of state on the same screen, such as the calendar's
    // view or a search, keeps the reader where they are
    if (location.pathname !== from) scrollTo(0, 0);
}

/** A link within this app. A click with a modifier key is left to the browser, for a new tab. */
export function Link(props: { href: string; class?: string; children: JSX.Element }): JSX.Element {
    return (
        <a
            href={props.href}
            class={props.class ?? "link"}
            onClick={(e) => {
                if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                e.preventDefault();
                go(props.href);
            }}
        >
            {props.children}
        </a>
    );
}

/**
 * The screen the path names, each screen's code loaded the first time it is opened, and shown as
 * nothing until it has come. There is no Suspense boundary round the screens: under one, a resource
 * a screen has read while it was resolved (or made with a source not yet ready, as a card's `where`
 * is) registers with the boundary, and when it next loads the boundary takes the whole screen out of
 * the document until it answers, so a drawing that finishes in that moment reads its colours from a
 * host that is not on the page and paints the print palette (the black stamps of 21 September). A
 * screen says itself what it shows while it waits, and keeps what it has (`resource.latest`) while
 * it asks again.
 */
export function Router<S extends string>(props: {
    screens: Readonly<Record<S, Component>>;
    screenOf: (path: string) => S;
}): JSX.Element {
    const screen = (): Component => props.screens[props.screenOf(now())];
    return <Dynamic component={screen()} />;
}
