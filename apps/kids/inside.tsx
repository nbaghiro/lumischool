import { journeyViewOf, worldViewOf } from "../../school/worlds/reading";
import { journeyFor } from "../../school/worlds/journeys";
import "../../engine/ui/reading.css";
import { childWorld } from "../../school/worlds/view";
// What a child sees inside a world: its lesson roll, returning directly to the overworld. It is loaded when the child goes in, not with the map, so
// the map screen carries none of it (tools/__tests__/first-view.test.ts holds that budget).
//
// The past days' sheets are here too, drawn as the child left them when the roll comes near them,
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
    on,
    onCleanup,
    Show,
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
import { Waiting } from "../../engine/ui/waiting";
import type { Kid } from "../../server/db/schema";
import type { Sheets } from "./lesson";
import { Loading } from "./loading";
import { fetchLessons, sheetWidth, todayOf, ownJournal, SHEET_HEIGHT, type Loaded } from "./views";

const World = lazy(() =>
    onDemand(() => import("../../engine/ui/world")).then((m) => ({ default: m.World })),
);

/** A lesson roll entered from the overworld; box carries the entrance animation. */
export interface InsideScreen {
    at: "world";
    term: number | null;
    world: string | null;
    /** The place on the map the child went in at, so they come back out to it. */
    from: number;
    box?: DOMRect;
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
    /** Back to the overworld at the world the child entered. */
    out: (box: DOMRect | null) => void;
}): JSX.Element {
    const [drew, setDrew] = createSignal(0);
    const [browsing, setBrowsing] = createSignal(false);
    const readable = (id: string): boolean =>
        !browsing() ||
        !!props.c.record.years.find((year) => year.grade === props.kid.grade)?.progress.done[id] ||
        !!todayOf(props.c)?.lessons.includes(id);
    const read = new Map<
        string,
        { lesson: PackLesson; events: readonly Envelope[]; date: string }
    >();
    const lessons = (): Promise<typeof import("./lesson")> => onDemand(() => import("./lesson"));
    const drawer = (of: readonly PackLesson[]): Promise<SceneDrawer> =>
        import("../../engine/ui/scene").then((m) => m.scenes(of.flatMap(m.scenesIn)));
    const paper = nearPaper({
        draw: async (id) => {
            if (!readable(id)) return null;
            const c = props.c;
            const narrow = props.narrow;
            let had = read.get(id);
            if (!had) {
                const [reads, state] = await Promise.all([
                    fetchLessons(c, [id]),
                    client.state(c.kid.id, id),
                ]);
                const lesson = reads[0];
                if (!lesson || "error" in state || c !== props.c || !readable(id)) return null;
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
            if (c !== props.c || narrow !== props.narrow || !readable(id)) return null;
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
        // a past sheet is the child's own, as they left it, at the width it is read at
        scope: () => `${props.c.pack.pack}|${props.kid.id}|${props.narrow}`,
    });
    onCleanup(() => paper.forget());
    const annualView = createMemo<WorldView | null>((prev) => {
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
    const selectedJourney = createMemo(() => {
        const world = annualView()?.open;
        return world ? journeyFor(world, props.kid.grade, props.c.corpus) : undefined;
    });
    const view = createMemo(() => {
        const selected = selectedJourney();
        if (!browsing() || !selected) return annualView();
        drew();
        const c = props.c;
        return journeyViewOf({
            journey: selected,
            progress: c.record.years.find((year) => year.grade === props.kid.grade)?.progress,
            today: todayOf(c)?.lessons,
            corpus: c.corpus,
            worldOf: c.worldOf,
            topics: c.topics,
            height: (id) =>
                props.sheets?.height(id) ??
                paper.height(id) ??
                (props.narrow ? SHEET_HEIGHT.narrow : SHEET_HEIGHT.wide),
            size: c.size,
            narrow: props.narrow,
            grown: false,
            limits: childWorld(c.kid.id),
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
            lesson: land()?.lesson,
            term: v.arrival?.term,
        });
        const live = new Set(todayOf(props.c)?.lessons ?? []);
        return (row?.day.lessons ?? []).filter((id) => !live.has(id) && readable(id));
    });
    let nearby: readonly string[] = [];
    const lookBack = (ids: readonly string[]): void => {
        nearby = ids;
        paper.lookBack([...new Set([...entry(), ...nearby])].filter(readable));
    };
    const entryKey = createMemo(() => entry().join("|"));
    createEffect(
        on([entryKey, () => props.narrow, () => props.c, browsing], (now, was) => {
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
            <Show when={selectedJourney()}>
                <nav class="rd-neighbours" aria-label="Your world lessons">
                    <button
                        type="button"
                        aria-pressed={browsing()}
                        onClick={() => setBrowsing((value) => !value)}
                    >
                        {browsing() ? "My lessons" : "Grade journey"}
                    </button>
                </nav>
            </Show>
            <Show when={waitingForEntry()}>
                <Waiting
                    title={failedEntry() ? "The lessons could not load" : "Opening your lessons"}
                    pending={!failedEntry()}
                    retry={failedEntry() ? () => lookBack(nearby) : undefined}
                />
            </Show>
            <Show when={view()} fallback={<Loading />}>
                {(drawn) => (
                    <World
                        view={drawn()}
                        from={props.screen.box}
                        sheet={(sheet) =>
                            readable(sheet.lesson)
                                ? (props.sheets?.sheet(sheet.lesson) ??
                                  paper.sheet(sheet.lesson)?.el ??
                                  null)
                                : null
                        }
                        lookBack={lookBack}
                        waiting={waitingForEntry()}
                        land={land()}
                        play={props.c.record.today}
                        class={`kid-map-world${waitingForEntry() ? " rd-loading" : ""}`}
                        title={`${props.kid.name}'s year`}
                        onOut={(box) => props.out(box)}
                    />
                )}
            </Show>
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

/** Opens the selected subject collection or the year's roll at the selected term. */
function worldOf(
    c: Loaded,
    o: {
        term: number | null;
        world: string | null;
        narrow: boolean;
        height: (lesson: string) => number | null;
    },
): WorldView {
    const card = o.narrow ? SHEET_HEIGHT.narrow : SHEET_HEIGHT.wide;
    return worldViewOf({
        journal: ownJournal(c, o.world),
        choice: c.choice,
        corpus: c.corpus,
        worldOf: c.worldOf,
        topics: c.topics,
        height: (lesson) => o.height(lesson) ?? card,
        size: c.size,
        narrow: o.narrow,
        grown: false,
        arriveAt: o.term ?? undefined,
        visitOnly: o.term !== null || o.world !== null,
        limits: childWorld(c.kid.id),
    });
}
