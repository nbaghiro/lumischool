// The children's view, under `/kids` on the one origin (.docs/auth.md, flow 5). A parent opened it on
// this browser for one or more children. What it knows is that kid session, and which child's page is
// open, which it keeps only in memory, so a load always opens on the children's pictures, or on the
// only child's page. With no kid session it asks for a grown-up. It reaches the API only through
// engine/ui/kid.ts.

import {
    createEffect,
    createSignal,
    lazy,
    Match,
    onCleanup,
    Switch,
    Suspense,
    type Accessor,
    type Setter,
    type JSX,
} from "solid-js";
import { render } from "solid-js/web";
import { onDemand } from "../../engine/ui/art";
import { fontsReady } from "../../engine/ui/fonts";
import * as client from "../../engine/ui/kid";
import type { Sending } from "../../engine/ui/kid";
import { Loading } from "./loading";
import { Page } from "../../engine/ui/page";
import { KidBar } from "./bar";
import type { KidView } from "../../server/api";
import type { Kid } from "../../server/db/schema";

// each screen loads the page again once if the server no longer has it (onDemand in engine/ui/art.tsx)
const Closed = lazy(() => onDemand(() => import("./closed")).then((m) => ({ default: m.Closed })));
const NotYet = lazy(() => onDemand(() => import("./closed")).then((m) => ({ default: m.NotYet })));
const Who = lazy(() => onDemand(() => import("./who")).then((m) => ({ default: m.Who })));
const Child = lazy(() => onDemand(() => import("./child")).then((m) => ({ default: m.ChildMap })));
const GrownUps = lazy(() =>
    onDemand(() => import("./grown-ups")).then((m) => ({ default: m.GrownUps })),
);

type Now =
    | { at: "loading" }
    | { at: "closed" }
    | { at: "not-yet"; offline: boolean }
    | { at: "who"; view: KidView }
    | { at: "child"; view: KidView; kid: Kid }
    | { at: "grown-ups"; view: KidView; from: Kid | null };

/** Where a load opens: the pictures, the only child's page, or the reason neither can open. */
async function read(): Promise<Now> {
    if (location.pathname === "/kids/sign-in") return { at: "closed" };
    const view = await client.view();
    if ("error" in view)
        return view.error === "no-kid-session"
            ? { at: "closed" }
            : { at: "not-yet", offline: view.error === "offline" };
    const [only, ...more] = view.kids;
    if (!only) return { at: "closed" };
    return more.length ? { at: "who", view } : { at: "child", view, kid: only };
}

/** How often a view that could not open asks again, besides when the network comes back. */
const RETRY = 5_000;

function View(props: { now: Accessor<Now>; setNow: Setter<Now> }): JSX.Element {
    const { now, setNow } = props;
    const [sending, setSending] = createSignal<Sending>({
        unsent: 0,
        offline: false,
        ended: false,
    });
    const refresh = (): void => void read().then(setNow);
    onCleanup(client.start());
    onCleanup(
        client.watch((s) => {
            setSending(s);
            // The grown-ups' card says itself that the view was closed while it was open.
            const at = now().at;
            if (s.ended && at !== "closed" && at !== "grown-ups") setNow({ at: "closed" });
        }),
    );
    createEffect(() => {
        if (now().at !== "not-yet") return;
        const timer = setInterval(refresh, RETRY);
        addEventListener("online", refresh);
        onCleanup(() => {
            clearInterval(timer);
            removeEventListener("online", refresh);
        });
    });
    const notYet = (): Extract<Now, { at: "not-yet" }> | false => {
        const n = now();
        return n.at === "not-yet" && n;
    };
    const who = (): Extract<Now, { at: "who" }> | false => {
        const n = now();
        return n.at === "who" && n;
    };
    const child = (): Extract<Now, { at: "child" }> | false => {
        const n = now();
        return n.at === "child" && n;
    };
    const grownUps = (): Extract<Now, { at: "grown-ups" }> | false => {
        const n = now();
        return n.at === "grown-ups" && n;
    };
    return (
        <Suspense fallback={<Loading />}>
            <Switch>
                <Match when={now().at === "loading"}>
                    <Loading />
                </Match>
                <Match when={now().at === "closed"}>
                    <Closed />
                </Match>
                <Match when={notYet()}>
                    {(n) => <NotYet offline={n().offline} retry={refresh} />}
                </Match>
                <Match when={who()}>
                    {(n) => (
                        <Who
                            view={n().view}
                            offline={sending().offline}
                            onChoose={(kid) => setNow({ at: "child", view: n().view, kid })}
                        />
                    )}
                </Match>
                <Match when={child()}>
                    {(n) => (
                        <Child
                            view={n().view}
                            kid={n().kid}
                            offline={sending().offline}
                            onBack={() => setNow({ at: "who", view: n().view })}
                        />
                    )}
                </Match>
                <Match when={grownUps()}>
                    {(n) => (
                        <GrownUps
                            view={n().view}
                            sending={sending()}
                            onAdded={refresh}
                            onBack={() => {
                                const from = n().from;
                                if (sending().ended) refresh();
                                else if (from) setNow({ at: "child", view: n().view, kid: from });
                                else setNow({ at: "who", view: n().view });
                            }}
                        />
                    )}
                </Match>
            </Switch>
        </Suspense>
    );
}

const root = document.getElementById("app");
if (root) {
    const [now, setNow] = createSignal<Now>({ at: "loading" });
    const profile = (): { view: KidView; kid?: Kid } | undefined => {
        const n = now();
        if (n.at === "child") return { view: n.view, kid: n.kid };
        if (n.at === "who") return { view: n.view };
        if (n.at === "grown-ups") return { view: n.view, kid: n.from ?? undefined };
        return undefined;
    };
    render(
        () => (
            <Page
                ground={() => onDemand(() => import("./ground")).then((m) => m.ground())}
                bar={() => (
                    <KidBar
                        profile={profile()}
                        onGrownUps={() => {
                            const p = profile();
                            if (p?.view.pin)
                                setNow({ at: "grown-ups", view: p.view, from: p.kid ?? null });
                            else location.assign("/sign-in?shared=1");
                        }}
                    />
                )}
            >
                <View now={now} setNow={setNow} />
            </Page>
        ),
        root,
    );
    void Promise.all([read(), fontsReady()])
        .then(([first]) => setNow(first))
        .catch(() => setNow({ at: "not-yet", offline: !navigator.onLine }));
}
