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
import type { WorldView } from "../../engine/space";
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
    type Past = { el: HTMLElement; dispose: () => void };
    /** Letting a day's paper go takes its sheet off the page as well as its reactions. */
    const drop = (p: Past): void => {
        p.el.remove();
        p.dispose();
    };
    const [past, setPast] = createSignal<ReadonlyMap<string, Past>>(new Map());
    const heights = new Map<string, number>();
    const read = new Map<
        string,
        { lesson: PackLesson; events: readonly Envelope[]; date: string }
    >();
    /** The days whose paper is being read now, so one is read once. */
    const lookingBack = new Set<string>();
    /** Invalidates work that started before leaving, resizing, or moving the camera away. */
    let generation = 0;
    let wanted = new Set<string>();
    const lessons = (): Promise<typeof import("./lesson")> => onDemand(() => import("./lesson"));
    /** The drawer of the pack's scenes, loaded with the drawings the lessons given name. */
    const drawer = (of: readonly PackLesson[]): Promise<SceneDrawer> =>
        import("../../engine/ui/scene").then((m) => m.scenes(of.flatMap(m.scenesIn)));
    const forgetPast = (): void => {
        generation++;
        wanted = new Set();
        for (const p of past().values()) drop(p);
        setPast(new Map());
        heights.clear();
        lookingBack.clear();
    };
    onCleanup(forgetPast);
    // a phone turned draws every sheet again at its width, so nothing measured at the old one is kept
    createEffect(on(() => props.narrow, forgetPast, { defer: true }));
    /** Draws one past day's paper from what was read of it, and keeps the height it measured. */
    const drawPast = (
        mod: Awaited<ReturnType<typeof lessons>>,
        draw: SceneDrawer,
        id: string,
    ): [string, Past][] => {
        const had = read.get(id);
        if (!had) return [];
        const sheet = mod.pastSheetOf({
            kid: props.c.kid,
            lesson: had.lesson,
            events: had.events,
            date: had.date,
            width: sheetWidth(props.narrow),
            narrow: props.narrow,
            draw,
            measureIn: props.page() ?? document.body,
        });
        if (!sheet) return [];
        heights.set(id, sheet.height);
        return [[id, { el: sheet.el, dispose: sheet.dispose }]];
    };
    const lookBack = async (near: readonly string[]): Promise<void> => {
        const c = props.c;
        const at = ++generation;
        wanted = new Set(near);
        // the paper that is not near any more is let go of, and what it measured is kept
        const keep = new Set(near);
        const was = past();
        if ([...was.keys()].some((id) => !keep.has(id))) {
            const left = new Map<string, Past>();
            for (const [id, p] of was) {
                if (keep.has(id)) left.set(id, p);
                else drop(p);
            }
            setPast(left);
        }
        const ids = near.filter((id) => !was.has(id) && !lookingBack.has(id));
        if (!ids.length) return;
        for (const id of ids) lookingBack.add(id);
        const want = ids.filter((id) => !read.has(id));
        const [lessonsRead, states, mod] = await Promise.all([
            fetchLessons(c, want),
            Promise.all(want.map((id) => client.state(c.kid.id, id))),
            lessons(),
        ]);
        if (c !== props.c || at !== generation) {
            for (const id of ids) lookingBack.delete(id);
            return;
        }
        want.forEach((id, k) => {
            const one = lessonsRead.find((l) => l.id === id);
            const st = states[k];
            if (!one || !st || "error" in st) return;
            read.set(id, {
                lesson: one,
                events: st.events,
                date:
                    c.record.years.map((y) => y.progress.done[id]?.on).find((d) => !!d) ??
                    c.record.today,
            });
        });
        // the lessons' own drawings come before their paper is drawn, as the worlds' do before the map
        const draw = await drawer(
            ids.flatMap((id) => {
                const had = read.get(id);
                return had ? [had.lesson] : [];
            }),
        );
        for (const id of ids) lookingBack.delete(id);
        if (c !== props.c || at !== generation) return;
        const drawn = ids.filter((id) => wanted.has(id)).flatMap((id) => drawPast(mod, draw, id));
        if (drawn.length) setPast(new Map([...past(), ...drawn]));
    };
    const view = createMemo<WorldView | null>((prev) => {
        const c = props.c,
            built = props.sheets;
        // until the sheets of a record read again are drawn, the roll stays as it is; with nothing to
        // draw today, or sheets that could not be drawn, the world opens without them
        if (!built && props.waiting) return prev ?? null;
        return worldOf(c, {
            term: props.screen.term,
            world: props.screen.world,
            narrow: props.narrow,
            height: (id) => built?.height(id) ?? heights.get(id) ?? null,
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
    return (
        // a world that cannot be built yet says so and offers a way on, rather than leaving a child
        // on an empty page with nothing to act on
        <Switch fallback={<Opening />}>
            <Match when={props.screen.at === "world" && view()}>
                {(drawn) => (
                    <World
                        view={drawn()}
                        from={props.screen.box}
                        sheet={(sheet) =>
                            props.sheets?.sheet(sheet.lesson) ??
                            past().get(sheet.lesson)?.el ??
                            null
                        }
                        lookBack={(ids) => void lookBack(ids)}
                        land={land()}
                        play={props.c.record.today}
                        class="kid-map-world"
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
                        sheet={(sheet) => past().get(sheet.lesson)?.el ?? null}
                        lookBack={(ids) => void lookBack(ids)}
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
    );
}
