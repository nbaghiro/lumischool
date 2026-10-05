// A child's own page: their map, worked out from their record and the family's pack the moment the
// page opens, and drawn edge to edge under the bar; and, once they go in, their year as a roll,
// arriving from the horizon of the world they went into, with today's lessons on their sheets to
// answer (lesson.tsx). The worlds they have finished are in colour, the one they are in has the
// guide at its gate, the next is in pencil with no way in yet, and past it the map is paper. When a
// sheet is finished and everything waiting has been sent, the record is read again and the roll and
// the map are drawn from it, so the world answers what the day did.

import "./child.css";
import {
    createEffect,
    createMemo,
    createResource,
    createSignal,
    ErrorBoundary,
    lazy,
    Match,
    on,
    onCleanup,
    onMount,
    Show,
    Suspense,
    Switch,
    type Accessor,
    type JSX,
} from "solid-js";
import { Drawing, onDemand, still } from "../../engine/ui/art";
import { Button } from "../../engine/ui/form";
import { Offline } from "../../engine/ui/kids";
import { Overworld } from "../../engine/ui/overworld";
import { useLook } from "../../engine/ui/page";
import { matches } from "../../engine/ui/viewport";
import { familyName } from "../../school/family/names";
import type { MapView } from "../../engine/space";
import type { ToPage } from "../../engine/host";
import { hosted, send } from "../../engine/ui/native";
import type { KidView } from "../../server/api";
import type { Kid } from "../../server/db/schema";
import type { InsideScreen } from "./inside";
import type { Sheets } from "./lesson";
import { Loading } from "./loading";
import { waitsForSheets } from "./opening";
import {
    fetchLessons,
    loadChild,
    mapOf,
    reloadChild,
    sheetWidth,
    todayOf,
    type Loaded,
} from "./views";
import { release } from "../../engine/ui/handoff";
import type { Reach } from "../../engine/ui/companion";
import * as client from "../../engine/ui/kid";

/** How long going into a world waits for today's sheets before opening it anyway, in ms. */
const SHEETS_READY = 2500;

// every import on a child's way in loads the page again once if the server no longer has it, as after
// a deploy or with a tab left open while the code changed (onDemand in engine/ui/art.tsx)
// the world's lesson roll, which comes with the child going in rather than
// with the map (apps/kids/inside.tsx)
const Dock = lazy(() =>
    onDemand(() => import("../../engine/ui/companion-dock")).then((m) => ({
        default: m.CompanionDock,
    })),
);

/** A child's own companion routes, which the dock is handed (engine/ui/kid.ts holds them). */
const KID_REACH: Reach = {
    on: (kid) => client.companionOn(kid),
    step: (kid, body) => client.companionStep(kid, body),
    voice: (kid, key) => client.companionVoice(kid, key),
};

let insideCode: Promise<typeof import("./inside")> | null = null;
const loadInside = (): Promise<typeof import("./inside")> =>
    (insideCode ??= onDemand(() => import("./inside")).catch((error: unknown) => {
        insideCode = null;
        throw error;
    }));
const Inside = lazy(() => loadInside().then((m) => ({ default: m.Inside })));
/**
 * The bar's games and painting, opened from main.tsx through this chunk, so the page's own script
 * names none of the chunks they load (tools/__tests__/first-view.test.ts).
 */
export const KidPlace = lazy(() =>
    onDemand(() => import("./play")).then((m) => ({ default: m.KidPlace })),
);
// `box` is where the view being left put the world on the screen, so the one opening picks the
// movement up there: the dive into a world and the way back out are one movement (engine/ui/world.tsx)
// `away` is the mobile app's map standing in for this one, with nothing of the child's on the page
type Screen = { at: "map"; place: number | null; box?: DOMRect } | { at: "away" } | InsideScreen;

export function ChildMap(props: {
    view: KidView;
    kid: Kid;
    offline: boolean;
    onBack: () => void;
    /** In the mobile app, whose map stands in for this one: the world it asked to open, its back button, and leaving the world. */
    app?: {
        enter: Accessor<ToPage["enter"] | null>;
        backs: Accessor<number>;
        left: () => void;
    };
}): JSX.Element {
    const look = useLook();
    createEffect(() =>
        look({
            logo: "none",
            end: { kind: "none" },
            foot: [familyName(props.view.family.name)],
            stage: true,
            stageBackdrop: !loaded() || !onMap(),
        }),
    );
    const [loaded, { mutate }] = createResource(
        () => props.kid,
        async (kid): Promise<Loaded | null> => loadChild(kid, still()),
    );
    // The lesson's code and the scene drawer are fetched once the map is up, not before it, so a
    // sheet opens without a wait and after a short drop, and the map screen stays small; the drawer
    // (engine/ui/scene.ts) comes the same way, so its chunks are not named by the map screen's.
    const lessons = (): Promise<typeof import("./lesson")> => onDemand(() => import("./lesson"));
    // the pack's readers come the same way, since the page itself no longer carries them (kid.ts)
    const readers = (): Promise<typeof import("../../engine/pack")> =>
        onDemand(() => import("../../engine/pack"));
    const roll = (): Promise<typeof import("../../engine/ui/world")> =>
        onDemand(() => import("../../engine/ui/world"));
    const drawing = (): Promise<typeof import("../../engine/ui/scene")> =>
        onDemand(() => import("../../engine/ui/scene"));
    // the roll's code starts with the page rather than with the child's record, since the dive into a
    // world is the one movement a child sees before anything else has to be ready
    onMount(() => void roll());
    // The map is the first screen, but the next screen is known as soon as the child route mounts.
    // Share this promise with the lazy component so entering a world never starts a second import.
    onMount(() => void loadInside());
    // Warm the sheet and scene modules in parallel with the map model. Their data still waits for the
    // record and pack, but their code no longer competes with the first world transition.
    onMount(() => {
        void Promise.all([lessons(), readers(), drawing()]).catch(() => undefined);
    });
    createEffect(() => {
        if (loaded()) {
            void lessons();
            void readers();
            void roll();
            void drawing();
        }
    });
    const [screen, setScreen] = createSignal<Screen>(
        props.app ? { at: "away" } : { at: "map", place: null },
    );
    const [sheetRun, setSheetRun] = createSignal(0);
    // the map's first frame is all there, which is when today's sheets are drawn out of sight
    const [mapDrawn, setMapDrawn] = createSignal(props.app !== undefined);
    let warming = 0;
    onCleanup(() => clearTimeout(warming));
    const narrow = matches("(max-width: 700px)");
    let page: HTMLDivElement | undefined;
    const onMap = (): Extract<Screen, { at: "map" }> | false => {
        const s = screen();
        return s.at === "map" && s;
    };
    /** The lesson roll inside the selected world. */
    const inside = (): InsideScreen | false => {
        const s = screen();
        return s.at === "world" && s;
    };
    // the screen the world's own component is given, which keeps its last value while that component
    // is taken down, since a prop read during a teardown must not be reading a condition that is gone
    const insideNow = createMemo<InsideScreen | null>((prev) => inside() || prev, null);
    const map = createMemo(() => {
        const c = loaded();
        return c ? mapOf(c) : null;
    });
    /** Once a finished sheet's sitting has been sent, the record again, and the views from it. A sheet finished meanwhile reads it once more. */
    let reloading = false;
    let again = false;
    const refresh = (): void => {
        if (reloading) {
            again = true;
            return;
        }
        const c = loaded();
        if (!c) return;
        reloading = true;
        void reloadChild(c)
            .then((next) => {
                if (next && loaded() === c) mutate(next);
                send("finished", {});
            })
            .finally(() => {
                reloading = false;
                if (again) {
                    again = false;
                    refresh();
                }
            });
    };
    const focusAt = (): number | undefined => {
        const s = onMap();
        return s && s.place !== null ? s.place : undefined;
    };
    /** Return to the visited world while it remains open. */
    const backToMap = (box: DOMRect | null): void => {
        const s = inside();
        letGo();
        // Disposing the paper makes the resource's previous result unusable, so draw it again on the map.
        setSheetRun((run) => run + 1);
        if (props.app) {
            props.app.left();
            setScreen({ at: "away" });
            send("out", { box: box && { x: box.x, y: box.y, w: box.width, h: box.height } });
            // no map here claims the roll held on its way out, and the app's map rises behind it
            setTimeout(() => release(true, "roll"));
            return;
        }
        const from = s ? s.from : null;
        const selected = from === null ? undefined : map()?.places[from];
        setScreen({
            at: "map",
            place: from !== null && selected?.open ? from : null,
            ...(box && from !== null ? { box } : {}),
        });
    };
    /** The place and box a world was left in, so the map opens there and pulls back to the country. */
    const comingBack = (): { place: number; from: DOMRect } | undefined => {
        const s = onMap();
        return s && s.place !== null && s.box ? { place: s.place, from: s.box } : undefined;
    };
    // Today's lessons on their sheets, drawn and measured as the child goes in, so the roll is laid
    // out round them. A sheet drawn stays as the child left it while the roll is open; a phone
    // turned draws them again at its width, and they are let go when the child leaves the roll.
    let current: { narrow: boolean; sheets: Sheets } | null = null;
    const letGo = (): void => {
        current?.sheets.dispose();
        current = null;
    };
    onCleanup(letGo);
    // what the sheets were drawn for, so the roll is laid out once per record, round its sheets. They
    // are drawn once the map is there, out of sight, so that going into a world is one movement rather
    // than a dive and then a wait while today's lessons are read and measured.
    // the same record and the same width are the same sheets, whichever screen the child is on, so
    // going in does not throw away what was drawn and draw it again
    const forSheets = createMemo(
        () => {
            const c = loaded();
            return c && (inside() || mapDrawn()) ? { c, narrow: narrow(), run: sheetRun() } : null;
        },
        undefined,
        {
            equals: (was, now) =>
                was?.c === now?.c && was?.narrow === now?.narrow && was?.run === now?.run,
        },
    );
    const [sheets] = createResource(
        forSheets,
        async ({ c, narrow: isNarrow }): Promise<{ for: Loaded; sheets: Sheets }> => {
            const today = todayOf(c);
            const [scene, mod, read] = await Promise.all([
                drawing(),
                lessons(),
                today ? fetchLessons(c, today.lessons) : Promise.resolve([]),
            ]);
            // the lessons' own drawings come before their sheets are drawn, as the worlds' do before the map
            const [draw, resumes, readings] = await Promise.all([
                scene.scenes(read.flatMap(scene.scenesIn)),
                mod.resumesFor(c, read),
                mod.readingsFor(c, read),
            ]);
            if (!current || current.narrow !== isNarrow) {
                letGo();
                current = {
                    narrow: isNarrow,
                    sheets: mod.todaysSheets({
                        kid: c.kid,
                        pack: c.pack.pack,
                        date: today?.date ?? c.record.today,
                        width: sheetWidth(isNarrow),
                        narrow: isNarrow,
                        draw,
                        measureIn: page ?? document.body,
                        onFinished: refresh,
                    }),
                };
            }
            current.sheets.draw(read, resumes, readings);
            return { for: c, sheets: current.sheets };
        },
    );
    /**
     * Waits for today's sheets, since the roll is laid out round them: the map's dive is the window
     * they are drawn in, and going in without them would land on the line that says the page is
     * opening. A wait that runs long gives up and opens the world with that line rather than holding
     * the child on the map.
     */
    const whenSheets = (signal: AbortSignal): Promise<void> =>
        new Promise((done) => {
            const c = loaded();
            if (drawn() || !c || !waitsForSheets(todayOf(c)?.lessons.length ?? 0, sheets.state)) {
                done();
                return;
            }
            const looking = setInterval(() => {
                if (!drawn()) return;
                clearInterval(looking);
                clearTimeout(enough);
                done();
            }, 50);
            const enough = setTimeout(() => {
                clearInterval(looking);
                done();
            }, SHEETS_READY);
            signal.addEventListener("abort", () => {
                clearInterval(looking);
                clearTimeout(enough);
            });
        });
    /** A way into a world waiting for its sheets, called off if the child leaves the map before it opens. */
    let goingIn: AbortController | null = null;
    onCleanup(() => {
        if (!goingIn) return;
        goingIn.abort();
        goingIn = null;
        // the map was held over the page for a world that will not come now (handoff.ts)
        release(false, "map");
    });

    /** The sheets drawn for the record the page holds now, or null while they are being drawn. */
    const drawn = (): Sheets | null => {
        const built = sheets();
        return built && built.for === loaded() && built.sheets === current?.sheets
            ? built.sheets
            : null;
    };
    /** Into the world at a place on the map: the dive, and the roll once its sheets are drawn. */
    const goIn = (m: MapView, place: number, box: DOMRect | null): void => {
        const n = m.layout.nodes[place];
        const selected = m.places[place];
        goingIn?.abort();
        const trip = new AbortController();
        goingIn = trip;
        const go = (): void => {
            if (trip.signal.aborted) return;
            goingIn = null;
            setScreen({
                at: "world",
                term: n && n.grade === props.kid.grade ? n.term : null,
                world: selected?.host !== null ? (selected?.shown?.world ?? null) : null,
                from: place,
                ...(box ? { box } : {}),
            });
        };
        // the dive has run by now, and the last of the roll's code is waited for here, so the movement
        // is never broken by the line that says the page is opening; a load that fails opens it anyway
        void Promise.all([roll(), whenSheets(trip.signal)]).then(go, go);
    };
    // the app's map asks for a world, or for the guide's with an empty one, once this page has the map's places
    let entered: ToPage["enter"] | null = null;
    createEffect(() => {
        const e = props.app?.enter();
        const m = map();
        if (!e || !m || e === entered) return;
        entered = e;
        const place =
            e.world === "" ? m.here : m.places.findIndex((p) => p.shown?.world === e.world);
        if (place === null || place < 0) {
            send("failed", { message: `There is no way into "${e.world}" on this map.` });
            return;
        }
        const b = e.box;
        goIn(m, place, b && new DOMRect(b.x, b.y, b.w, b.h));
    });
    createEffect(
        on(
            () => props.app?.backs(),
            () => {
                if (inside()) backToMap(null);
            },
            { defer: true },
        ),
    );
    /** Into the world the guide stands at, which holds today's sheets. */
    const goToday = (): void => {
        const m = map();
        if (m && m.here !== null) goIn(m, m.here, null);
    };
    return (
        <div
            class="kid-map"
            ref={(el) => {
                page = el;
            }}
        >
            <Switch>
                <Match when={loaded.loading && !loaded()}>
                    <Loading />
                </Match>
                <Match when={loaded()}>
                    {(c) => (
                        <Switch>
                            <Match when={onMap() && map()}>
                                {(m) => (
                                    <>
                                        <Overworld
                                            view={m()}
                                            arrive={comingBack()}
                                            focus={focusAt()}
                                            play={c().record.today}
                                            class="kid-map-world"
                                            title={`${props.kid.name}'s map`}
                                            onDrawn={() => setMapDrawn(true)}
                                            onApproach={(place) => {
                                                clearTimeout(warming);
                                                warming = window.setTimeout(() => {
                                                    void loadInside()
                                                        .then((mod) =>
                                                            mod.warmWorld(
                                                                c(),
                                                                m(),
                                                                place,
                                                                narrow(),
                                                            ),
                                                        )
                                                        .catch(() => undefined);
                                                }, 160);
                                            }}
                                            onGoIn={(place, box) => goIn(m(), place, box)}
                                            tools={
                                                <button
                                                    type="button"
                                                    class="ow-btn"
                                                    onClick={() => goToday()}
                                                    aria-label="Today"
                                                    title="Today"
                                                >
                                                    <Drawing
                                                        id="icon"
                                                        params={{ name: "journal", on: false }}
                                                        seed={2711}
                                                        class="ow-tool-art"
                                                    />
                                                </button>
                                            }
                                        />
                                    </>
                                )}
                            </Match>
                            <Match when={inside() && insideNow()}>
                                {(s) => (
                                    <ErrorBoundary fallback={<Loading failed />}>
                                        <Suspense fallback={<Loading />}>
                                            <Inside
                                                c={c()}
                                                kid={props.kid}
                                                screen={s()}
                                                sheets={drawn()}
                                                waiting={waitsForSheets(
                                                    todayOf(c())?.lessons.length ?? 0,
                                                    sheets.state,
                                                )}
                                                narrow={narrow()}
                                                page={() => page}
                                                out={(box) => backToMap(box)}
                                            />
                                        </Suspense>
                                    </ErrorBoundary>
                                )}
                            </Match>
                        </Switch>
                    )}
                </Match>
                <Match when={loaded.state === "errored" || loaded() === null}>
                    <Loading failed offline={props.offline} />
                </Match>
            </Switch>
            {/* the companion is on a world's lessons, outside the roll so it stays put as the paper moves */}
            <Show when={inside() && !hosted() && loaded()}>
                {(c) => (
                    <Suspense>
                        <Dock who={c().kid.id} reach={KID_REACH} />
                    </Suspense>
                )}
            </Show>
            <div class="kid-map-over">
                <Offline when={props.offline} />
                {props.view.kids.length > 1 && screen().at === "map" && !hosted() ? (
                    <Button second onClick={props.onBack}>
                        Back to the pictures
                    </Button>
                ) : undefined}
            </div>
        </div>
    );
}
