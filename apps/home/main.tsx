// The grown-ups' app, on every path of the one origin but `/kids` (.docs/local.md, "The apps"). One
// page, whose path names the screen; each screen's code is loaded the first time it is opened, and
// the first is loaded with the fonts, so the first paint is the whole screen, styled. The bar is the
// app's, mounted once above the screens, so a move between them changes only which place is marked.

import { lazy, Show, type Component } from "solid-js";
import { render } from "solid-js/web";
import { onThisComputer } from "../../engine/ui/device";
import { fontsReady } from "../../engine/ui/fonts";
import { Page } from "../../engine/ui/page";
import { path, Router } from "../../engine/ui/router";
import { screenOf, type Screen } from "./routes";

const SignIn = lazy(() => import("./sign-in").then((m) => ({ default: m.SignIn })));
const Family = lazy(() => import("./family").then((m) => ({ default: m.Family })));
const Outbox = lazy(() => import("./outbox").then((m) => ({ default: m.Outbox })));
const Missing = lazy(() => import("./missing").then((m) => ({ default: m.Missing })));
const Explore = lazy(() => import("./explore").then((m) => ({ default: m.Explore })));
const ExploreLesson = lazy(() => import("./explore").then((m) => ({ default: m.ExploreLesson })));
const GrownMap = lazy(() => import("./map").then((m) => ({ default: m.GrownMap })));
const Calendar = lazy(() => import("./calendar").then((m) => ({ default: m.Calendar })));
const Plan = lazy(() => import("./plan").then((m) => ({ default: m.Plan })));
const PrintDay = lazy(() => import("./day").then((m) => ({ default: m.PrintDay })));
const Account = lazy(() => import("./account").then((m) => ({ default: m.Account })));
const Letters = lazy(() => import("./letters").then((m) => ({ default: m.Letters })));
const GrownBar = lazy(() => import("./bar").then((m) => ({ default: m.GrownBar })));
const AddKidDialog = lazy(() => import("./bar").then((m) => ({ default: m.AddKidDialog })));

const SCREENS: Record<Screen, Component> = {
    family: Family,
    "sign-in": () => <SignIn start={false} />,
    start: () => <SignIn start />,
    outbox: Outbox,
    explore: Explore,
    lesson: ExploreLesson,
    map: GrownMap,
    calendar: Calendar,
    plan: Plan,
    print: PrintDay,
    account: Account,
    letters: Letters,
    missing: Missing,
};

const LOAD: Record<Screen, () => Promise<unknown>> = {
    family: Family.preload,
    "sign-in": SignIn.preload,
    start: SignIn.preload,
    outbox: Outbox.preload,
    explore: Explore.preload,
    lesson: ExploreLesson.preload,
    map: GrownMap.preload,
    calendar: Calendar.preload,
    plan: Plan.preload,
    print: PrintDay.preload,
    account: Account.preload,
    letters: Letters.preload,
    missing: Missing.preload,
};

/** Which screens carry the grown-ups' bar: every one but the sign-in, the start and the outbox, whose cards stand alone. */
const CARRIES: Record<Screen, boolean> = {
    family: true,
    "sign-in": false,
    start: false,
    outbox: false,
    explore: true,
    lesson: true,
    map: true,
    calendar: true,
    plan: true,
    print: true,
    account: true,
    letters: true,
    missing: true,
};

const local = onThisComputer(location.hostname);
const screenHere = (path: string): Screen => screenOf(path, { local });

/**
 * The bar, mounted once for as long as the page is open, so a move between the screens that carry it
 * leaves it and every stamp on it as they are, and beside it the Add a child dialog, which opens over
 * whichever of those screens is up. The page's nav box is made here, so a screen without the bar has
 * no empty box between the mark and the end. The bar itself shows nothing until it knows the family
 * (bar.tsx).
 */
const Bar: Component = () => (
    <Show when={CARRIES[screenHere(path())]}>
        <div class="page-nav">
            <GrownBar />
            <AddKidDialog />
        </div>
    </Show>
);

const root = document.getElementById("app");
if (root) {
    const first = screenHere(location.pathname);
    // the bar's code comes with the first screen that carries it, so the first paint has both
    await Promise.all([fontsReady(), LOAD[first](), CARRIES[first] && GrownBar.preload()]);
    render(
        () => (
            <Page ground={() => import("./ground").then((m) => m.ground())} bar={Bar}>
                <Router screens={SCREENS} screenOf={screenHere} />
            </Page>
        ),
        root,
    );
}
