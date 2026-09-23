// What a child sees once they are inside a world: the place the world is seen as and the roll they
// read it at, and the moves between them. It is loaded when the child goes in, not with the map, so
// the map screen carries none of it (tools/__tests__/first-view.test.ts holds that budget).
//
// The past days' sheets are here too, drawn as the child left them when either view comes near them,
// with the answers read back from each lesson's own events. The views name every day that is near,
// so what is no longer near is let go of and a whole term can be walked without growth; what each
// sheet was read from is kept, so paper that comes near again is drawn without asking the server
// twice, and so is the height it measured, since the roll lays out round it and a height that came
// and went would move the rows under the child.

import {
    createEffect,
    createMemo,
    createSignal,
    lazy,
    Match,
    on,
    onCleanup,
    Switch,
    type JSX,
} from "solid-js";
import { onDemand } from "../../engine/ui/art";
import * as client from "../../engine/ui/kid";
import type { Envelope } from "../../engine/answer";
import type { PackLesson } from "../../engine/pack";
import type { SceneDrawer } from "../../engine/ui/scene";
import type { MapView, WorldView } from "../../engine/space";
import { nearPaper, landingRow } from "../../engine/ui/paper";
import { mayPrepare } from "../../engine/ui/reading-source";
import { PaperStatus } from "../../engine/ui/paper-status";
import type { Kid } from "../../server/db/schema";
import type { Sheets } from "./lesson";
import { Opening } from "./opening-card";
import { fetchLessons, sheetWidth, todayOf, worldOf, type Loaded } from "./views";

const World = lazy(() =>
    onDemand(() => import("../../engine/ui/world")).then((m) => ({ default: m.World })),
);
const Place = lazy(() =>
    onDemand(() => import("../../engine/ui/place")).then((m) => ({ default: m.Place })),
);

/**
 * Where a child is inside a world: the place it is seen as, or the roll. `box` is where the view
 * being left put the world on the screen, so the one opening picks the movement up there, and `day`
 * is the day it was on, so the other opens at the same day (engine/ui/world.tsx, place.tsx).
 */
export interface InsideScreen {
    at: "place" | "world";
    term: number | null;
    world: string | null;
    /** The place on the map the child went in at, so they come back out to it. */
    from: number;
    box?: DOMRect;
    day?: string;
}

export function Inside(props: {
    /** The child's record and pack, as the page holds them. */
    c: Loaded;
    kid: Kid;
    screen: InsideScreen;
    /** Today's sheets, drawn by the page while the map was up, or null while they are being drawn. */
    sheets: Sheets | null;
    /** Whether today's sheets are still on their way, so the roll waits rather than opening without them. */
    waiting: boolean;
    narrow: boolean;
    /** The page's own element, which a sheet is measured in. */
    page: () => HTMLElement | undefined;
    /** Where the child goes next: the other screen of the world, or back out to the map. */
    go: (to: InsideScreen) => void;
    out: (box: DOMRect | null) => void;
}): JSX.Element {
    const [drew, setDrew] = createSignal(0);
    const read = new Map<
        string,
        { lesson: PackLesson; events: readonly Envelope[]; date: string }
    >();
    const lessons = (): Promise<typeof import("./lesson")> => onDemand(() => import("./lesson"));
    const drawer = (of: readonly PackLesson[]): Promise<SceneDrawer> =>
        import("../../engine/ui/scene").then((m) => m.scenes(of.flatMap(m.scenesIn)));
    const paper = nearPaper({
        draw: async (id) => {
            const c = props.c;
            const narrow = props.narrow;
            let had = read.get(id);
            if (!had) {
                const [reads, state] = await Promise.all([
                    fetchLessons(c, [id]),
                    client.state(c.kid.id, id),
                ]);
                const lesson = reads[0];
                if (!lesson || "error" in state || c !== props.c) return null;
                had = {
                    lesson,
                    events: state.events,
                    date:
                        c.record.years.map((y) => y.progress.done[id]?.on).find((d) => !!d) ??
                        c.record.today,
                };
                read.set(id, had);
            }
            const [mod, draw] = await Promise.all([lessons(), drawer([had.lesson])]);
            if (c !== props.c || narrow !== props.narrow) return null;
            return mod.pastSheetOf({
                kid: c.kid,
                lesson: had.lesson,
                events: had.events,
                date: had.date,
                width: sheetWidth(narrow),
                narrow,
                draw,
                measureIn: props.page() ?? document.body,
            });
        },
        drawn: () => setDrew((n) => n + 1),
    });
    onCleanup(() => paper.forget());
    const view = createMemo<WorldView | null>((prev) => {
        drew();
        const c = props.c,
            built = props.sheets;
        // until the sheets of a record read again are drawn, the roll stays as it is; with nothing to
        // draw today, or sheets that could not be drawn, the world opens without them
        if (!built && props.waiting) return prev ?? null;
        return worldOf(c, {
            term: props.screen.term,
            world: props.screen.world,
            narrow: props.narrow,
            height: (id) => built?.height(id) ?? paper.height(id) ?? null,
        });
    });
    /** Where the roll lands on today's sheet: a sitting picked up again lands at its first question still to do. */
    const land = (): { lesson: string; y: number } | undefined => {
        const built = props.sheets;
        if (!built) return undefined;
        const shown = new Set(view()?.days.flatMap((day) => day.sheets.map((s) => s.lesson)));
        for (const id of todayOf(props.c)?.lessons ?? []) {
            if (!shown.has(id)) continue;
            const y = built.landing(id);
            if (y !== null) return { lesson: id, y };
        }
        return undefined;
    };
    const entry = createMemo(() => {
        const v = view();
        if (!v) return [];
        const row = landingRow(v, {
            day: props.screen.day,
            lesson: land()?.lesson,
            term: v.arrival?.term,
        });
        const live = new Set(todayOf(props.c)?.lessons ?? []);
        return (row?.day.lessons ?? []).filter((id) => !live.has(id));
    });
    let nearby: readonly string[] = [];
    const lookBack = (ids: readonly string[]): void => {
        nearby = ids;
        paper.lookBack([...new Set([...entry(), ...nearby])]);
    };
    const entryKey = createMemo(() => entry().join("|"));
    createEffect(
        on([entryKey, () => props.narrow, () => props.c], (now, was) => {
            if (was && (now[1] !== was[1] || now[2] !== was[2])) {
                paper.forget();
                read.clear();
            }
            lookBack([]);
        }),
    );
    const waitingForEntry = (): boolean => {
        drew();
        return entry().some((id) => !paper.sheet(id));
    };
    const failedEntry = (): boolean => {
        drew();
        return entry().some((id) => paper.failed(id));
    };
    return (
        <>
            <PaperStatus
                waiting={props.screen.at === "world" && waitingForEntry()}
                failed={failedEntry()}
                retry={() => lookBack(nearby)}
            />
            <Switch fallback={<Opening />}>
                <Match when={props.screen.at === "world" && view()}>
                    {(drawn) => (
                        <World
                            view={drawn()}
                            from={props.screen.box}
                            sheet={(sheet) =>
                                props.sheets?.sheet(sheet.lesson) ??
                                paper.sheet(sheet.lesson)?.el ??
                                null
                            }
                            lookBack={lookBack}
                            waiting={waitingForEntry()}
                            land={land()}
                            play={props.c.record.today}
                            class={`kid-map-world${waitingForEntry() ? " rd-loading" : ""}`}
                            title={`${props.kid.name}'s year`}
                            open={props.screen.day}
                            onOut={(box, day) => {
                                // out of the roll is the place it is read from, and a world with no day
                                // on it has none, so its roll hands straight back to the map
                                if (!drawn().trail) {
                                    props.out(box);
                                    return;
                                }
                                props.go({
                                    at: "place",
                                    term: props.screen.term,
                                    world: props.screen.world,
                                    from: props.screen.from,
                                    ...(box ? { box } : {}),
                                    ...(day ? { day } : {}),
                                });
                            }}
                        />
                    )}
                </Match>
                <Match when={props.screen.at === "place" && view()}>
                    {(drawn) => (
                        <Place
                            view={drawn()}
                            from={props.screen.box}
                            at={props.screen.day}
                            sheet={(sheet) => paper.sheet(sheet.lesson)?.el ?? null}
                            lookBack={lookBack}
                            play={props.c.record.today}
                            class="kid-map-world"
                            title={`${props.kid.name}'s world`}
                            onIn={(day, box) =>
                                props.go({
                                    at: "world",
                                    term: props.screen.term,
                                    world: props.screen.world,
                                    from: props.screen.from,
                                    ...(box ? { box } : {}),
                                    day,
                                })
                            }
                            onOut={(box) => props.out(box)}
                        />
                    )}
                </Match>
            </Switch>
        </>
    );
}

export async function warmWorld(
    c: Loaded,
    map: MapView,
    place: number,
    narrow: boolean,
): Promise<void> {
    if (!mayPrepare()) return;
    const node = map.layout.nodes[place];
    const selected = map.places[place];
    const view = worldOf(c, {
        term: node?.grade === c.kid.grade ? node.term : null,
        world: selected?.host !== null ? (selected?.shown?.world ?? null) : null,
        narrow,
        height: () => null,
    });
    const ids = landingRow(view, { term: view.arrival?.term })?.day.lessons ?? [];
    const read = await fetchLessons(c, ids);
    const scene = await import("../../engine/ui/scene");
    await scene.scenes(read.flatMap(scene.scenesIn));
}
