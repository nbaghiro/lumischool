// The page both apps share, in design B: the site's bar with the mark, what the app stands in it and
// whatever the screen puts at its end, the sample child's map as the ground under it, continuing the
// site's opening, and the postcards a screen is written on (postcard.tsx), with the footnotes under
// them. One Page stays while an app moves between its screens, so the map is drawn once and flies a
// little along the road with each step, and the bar is mounted once, and a screen says what it wants
// of the page with `useLook`.

import "./palette.css";
import "./page.css";
import {
    createContext,
    createEffect,
    createSignal,
    createUniqueId,
    ErrorBoundary,
    For,
    on,
    onCleanup,
    Show,
    useContext,
    type Component,
    type Context,
    type JSX,
} from "solid-js";
import { MapBackdrop, OPENING, type Ground, type MapAim } from "./backdrop";
import { COUNTRY } from "./snapshots/country";
import { onThisComputer } from "./device";
import { failureText } from "./failure";
import { rowsOf } from "./keep-clear";
import { Button } from "./form";
import { Mark } from "./mark";
import { Postcard, type Place } from "./postcard";
import { path } from "./router";
import { Announcer, Say } from "./say";
import type { Failure } from "./wire";

/** What sits at the end of the bar. A grown-up's sign-out is in the bar's own menu (apps/home/bar.tsx). */
export type End = { kind: "gate"; open: () => void } | { kind: "none" };

export interface Look {
    /** Where the logo goes: to the site, or nowhere in the children's view. */
    logo: "site" | "none";
    end: End;
    foot: readonly string[];
    /** The cards across the middle of the page, for the children's stamps. */
    centered: boolean;
    /** The world the map looks at, which the card's stamp shows. */
    place: Place;
    /** A screen that is a stage: it fills the page under the bar, with no map behind it and no cards. */
    stage: boolean;
    /** Cards across the whole width, with the map under the first screen only. */
    wide: boolean;
}

const DEFAULT: Look = {
    logo: "site",
    end: { kind: "none" },
    foot: [],
    centered: false,
    place: "harbour",
    stage: false,
    wide: false,
};

type SetLook = (look: Partial<Look>) => void;

declare global {
    interface Window {
        /** The look's context under the dev server, one for every copy of page.tsx a page runs. */
        lumischoolLook?: Context<SetLook | undefined>;
    }
}

/**
 * Under the dev server, a screen loaded after a hot update to anything this file imports runs its
 * own copy of this file, since its import carries the update's `?t=`, and a context made by that
 * copy is not the one the page provides, so `useLook` would find nothing. Every copy takes the
 * first one's context instead. A build runs one copy and has no `import.meta.hot`.
 */
const LookContext = import.meta.hot
    ? (window.lumischoolLook ??= createContext<SetLook>())
    : createContext<SetLook>();

/** What a screen wants of the page. Each call starts from the default, so nothing is left over. */
export function useLook(): SetLook {
    const set = useContext(LookContext);
    if (!set) throw new Error("useLook is for a screen inside a Page");
    return set;
}

/** The phone layout, which must match the breakpoint in page.css and the site's. */
const NARROW = matchMedia("(max-width: 700px)");

/**
 * Where the map looks for a place, at the site's zoom: the harbour is the site's own framing, so
 * `/home` to `/sign-in` reads as one page, and the meadow and the railway are part of the way along
 * the road toward them, so each step moves the camera a little and never dives. A child's screens
 * stand across the middle of a wide page, so there the map looks lower and further right, which keeps
 * the harbour, and the island above it, out from under the title and the children's stamps.
 */
function aimAt(place: Place, narrow: boolean, centered: boolean): MapAim {
    const opening = {
        ...(narrow
            ? OPENING.narrow
            : centered
              ? { ...OPENING.wide, at: { x: 0.75, y: 0.55 } }
              : OPENING.wide),
        place: "harbour",
    };
    return place === "harbour" ? opening : { ...opening, along: 0.45, toward: place };
}

/** The boxes the map keeps its place clear of: every `data-clear` on the page, joined in rows. */
const clearOf = (cards: HTMLElement): DOMRect[] =>
    rowsOf([...cards.querySelectorAll("[data-clear]")].map((e) => e.getBoundingClientRect())).map(
        (r) => new DOMRect(r.left, r.top, r.right - r.left, r.bottom - r.top),
    );

export function Page(props: {
    children: JSX.Element;
    /** The map behind the screens, the country with nobody on it, and the component that draws it, which the app loads once the map's box is near and the page idle. */
    ground: () => Promise<Ground>;
    /** What the app stands in the bar between the mark and its end, mounted once for as long as the page is open, such as the grown-ups' places and children; the children's app stands nothing there. */
    bar?: Component;
}): JSX.Element {
    const [look, setLook] = createSignal<Look>(DEFAULT);
    const [narrow, setNarrow] = createSignal(NARROW.matches);
    const changed = (): void => {
        setNarrow(NARROW.matches);
    };
    NARROW.addEventListener("change", changed);
    onCleanup(() => NARROW.removeEventListener("change", changed));
    let cards: HTMLDivElement | undefined;
    return (
        <LookContext.Provider value={(l) => setLook({ ...DEFAULT, ...l })}>
            <div class="page" classList={{ wide: look().wide }}>
                <a class="page-skip" href="#main">
                    Skip to the main content
                </a>
                <header class="page-top">
                    <div class="page-bar">
                        <Mark href={look().logo === "site" ? "/home" : undefined} />
                        <Show when={props.bar} keyed>
                            {(Bar) => <Bar />}
                        </Show>
                        <End end={look().end} />
                    </div>
                </header>
                <Show when={!look().stage}>
                    <MapBackdrop
                        class="page-ground"
                        aim={aimAt(look().place, narrow(), look().centered)}
                        ground={props.ground}
                        stills={COUNTRY}
                        keepOff={() => (cards ? clearOf(cards) : [])}
                        fade={narrow() && !look().wide}
                    />
                </Show>
                <main
                    id="main"
                    tabindex={-1}
                    class="page-main"
                    classList={{
                        centered: look().centered,
                        stage: look().stage,
                        wide: look().wide,
                    }}
                >
                    <div
                        class="page-cards"
                        ref={(el) => {
                            cards = el;
                        }}
                    >
                        <ErrorBoundary
                            fallback={(error: unknown, reset: () => void) => {
                                // the next path is another screen, which may well load
                                createEffect(on(path, () => reset(), { defer: true }));
                                return <Failed error={error} />;
                            }}
                        >
                            {props.children}
                        </ErrorBoundary>
                    </div>
                </main>
                <footer class="page-foot">
                    <For each={look().foot}>{(line) => <span>{line}</span>}</For>
                </footer>
                <Announcer />
            </div>
        </LookContext.Provider>
    );
}

/**
 * What a screen shows when its code did not load or failed as it drew, such as a request dropped while
 * the network or the server changed under it: a way to load the page again rather than a blank page.
 * On a developer's computer it also says what went wrong.
 */
function Failed(props: { error: unknown }): JSX.Element {
    return (
        <Postcard
            note
            kicker="lumischool"
            title="This page did not load"
            lead="Something stopped this page from loading. Loading it again usually puts it right."
        >
            <Show when={onThisComputer(location.hostname)}>
                <Say
                    text={props.error instanceof Error ? props.error.message : String(props.error)}
                />
            </Show>
            <div class="acts">
                <Button onClick={() => location.reload()}>Load the page again</Button>
            </div>
        </Postcard>
    );
}

function End(props: { end: End }): JSX.Element {
    const gate = (): (() => void) | false => props.end.kind === "gate" && props.end.open;
    return (
        <Show when={gate()}>
            {(open) => (
                <div class="page-end">
                    <GateTab open={open()} />
                </div>
            )}
        </Show>
    );
}

/**
 * Signing out loads the sign-in page afresh, since `/` is the site for a visitor signed out. Until the
 * API has said the session is over the grown-up is still signed in, and a slip under the button says
 * so and why. The grown-ups' bar puts it in the menu under the person's own stamp, as a menu item.
 */
export function SignOut(props: {
    run: () => Promise<true | Failure>;
    class?: string;
    role?: "menuitem";
}): JSX.Element {
    const [busy, setBusy] = createSignal(false);
    const [said, setSaid] = createSignal("");
    const out = async (): Promise<void> => {
        if (busy()) return;
        setBusy(true);
        setSaid("");
        const r = await props.run();
        if (r === true) {
            location.assign("/sign-in");
            return;
        }
        setBusy(false);
        setSaid(`You are still signed in. ${failureText(r, onThisComputer(location.hostname))}`);
    };
    return (
        <>
            <button
                type="button"
                class={props.class ?? "out"}
                role={props.role}
                aria-disabled={busy() ? true : undefined}
                onClick={() => void out()}
            >
                Sign out
            </button>
            <Show when={said()}>
                <div class="page-said">
                    <Say text={said()} />
                </div>
            </Show>
        </>
    );
}

/** How long the grown-ups' tab is held before it opens (.docs/auth.md, flow 7), in milliseconds. */
const HOLD = 2000;

/** The tab in a child's corner. Pressing it does nothing; holding it for two seconds opens it. */
function GateTab(props: { open: () => void }): JSX.Element {
    const [holding, setHolding] = createSignal(false);
    let timer = 0;
    const start = (): void => {
        clearTimeout(timer);
        setHolding(true);
        timer = window.setTimeout(() => {
            setHolding(false);
            props.open();
        }, HOLD);
    };
    const stop = (): void => {
        clearTimeout(timer);
        setHolding(false);
    };
    onCleanup(stop);
    return (
        <button
            type="button"
            class="gate"
            classList={{ holding: holding() }}
            aria-label="Grown-ups: hold for two seconds"
            title="Hold for two seconds"
            onPointerDown={start}
            onPointerUp={stop}
            onPointerLeave={stop}
            onPointerCancel={stop}
            onContextMenu={(e) => e.preventDefault()}
            onKeyDown={(e) => {
                if ((e.key === " " || e.key === "Enter") && !e.repeat) {
                    e.preventDefault();
                    start();
                }
            }}
            onKeyUp={(e) => {
                if (e.key === " " || e.key === "Enter") stop();
            }}
        >
            <span>Grown-ups</span>
        </button>
    );
}

/**
 * What a screen shows while it loads: nothing for a moment, since most loads are quicker than that,
 * and then a note that says what is being fetched.
 */
export function Waiting(props: { kicker: string; title: string }): JSX.Element {
    const [shown, setShown] = createSignal(false);
    const timer = setTimeout(() => setShown(true), 400);
    onCleanup(() => clearTimeout(timer));
    return (
        <Show when={shown()}>
            <Postcard note kicker={props.kicker} title={props.title} focus={false}>
                <p class="note">One moment.</p>
            </Postcard>
        </Show>
    );
}

/** A part of a card under its own heading, such as a family's children. */
export function Part(props: { title: string; children: JSX.Element }): JSX.Element {
    const id = createUniqueId();
    return (
        <section class="part" aria-labelledby={id}>
            <h2 id={id}>{props.title}</h2>
            {props.children}
        </section>
    );
}

/** An index card pinned beside the postcard, for what is so only on a developer's computer. */
export function Card(props: { kicker: string; title: string; children: JSX.Element }): JSX.Element {
    const id = createUniqueId();
    return (
        <aside class="card" data-clear="" aria-labelledby={id}>
            <p class="kicker">{props.kicker}</p>
            <h2 id={id}>{props.title}</h2>
            {props.children}
        </aside>
    );
}

/** A child's screen: its parts one under another down the middle of the page. */
export function Column(props: { children: JSX.Element }): JSX.Element {
    return <div class="page-column">{props.children}</div>;
}
