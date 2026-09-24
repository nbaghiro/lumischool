// The pictures of the sample child below the site's opening, each drawn into a box the page has
// sized from the visitor's pack and the site's data (school.ts): a question drawn its ways, the printed
// lesson, a subject's landmark, a lesson's first picture, the map at each stop of the journey, the
// roll of yesterday and today, and the worlds a visitor looks into over the page. The map pictures
// are the page's own components (page.tsx); this is what they are drawn from.

import { readScene } from "../../engine/pack";
import type { Scene } from "../../engine/scene";
import type { SceneDrawer } from "../../engine/ui/scene";
import type { Measured } from "../../engine/ui/lesson";
import type { ReadingSource } from "../../engine/ui/reading";
import {
    fitRect,
    GROUND_PAD,
    type AimedAt,
    type Camera,
    type MapView,
    type Size,
    type WorldView,
} from "../../engine/space";
import { still } from "../../engine/ui/art";
import { drawingOf, loadDrawings } from "../../engine/ui/drawings";
import { placeArt } from "../../engine/ui/scenery";
import { render } from "../../engine/ui/svg";
import { subjectFacts } from "../../school/tracks";
import { artById } from "../../school/worlds/art";
import { readChoice } from "../../school/worlds/choice";
import { NARROW, WIDE } from "../../school/worlds/roll";
import { rollJournal, stopViews, viewOfTrip, visitJournal } from "../../school/worlds/sample";
import { siteWorld, worldViewOf } from "../../school/worlds/view";
import { worldById } from "../../school/worlds/worlds";
import { lessonOf, schoolOf, type School } from "./school";

/** A picture of the sample child, and what it needs from the page beyond the box it is drawn in. */
export type SamplePicture =
    | { is: "version"; at: number }
    | { is: "print" }
    | { is: "subject"; at: number }
    | { is: "lesson"; at: number };

/** The one seed every picture is drawn with, so a picture drawn again is the same picture. */
const SEED = 4127;

/** The largest square a scene is drawn at in a box, in px. */
const LARGEST_SQUARE = 40;

/** A world's choice nobody has made: the worlds' own terms, with nobody's tweaks. */
const CHOICE = readChoice(null, "").choice;

/** The sheet's width on the roll, in world units. */
const sheetWidth = (narrow: boolean): number => (narrow ? NARROW : WIDE).sheet;

/** The drawer of a pack's scenes, with the drawings the scenes name loaded first; the renderer comes with the first picture that needs it. */
const drawerOf = async (of: readonly Scene[]): Promise<SceneDrawer> =>
    (await import("../../engine/ui/scene")).scenes(of);

/** The sheet, with the lesson's renderer, which comes with the first sheet drawn rather than with the page. */
const sheets = () => import("../../engine/ui/lesson");

export async function prepareLessons(s: School, ids: readonly string[]): Promise<void> {
    const [, scene] = await Promise.all([sheets(), import("../../engine/ui/scene")]);
    for (const id of ids) {
        const lesson = await lessonOf(s, id);
        if (lesson) await drawerOf(scene.scenesIn(lesson));
    }
}

/**
 * A drawing's square, from the box it is in: the smaller of what the width and the height allow,
 * read once and then on resize. A wide drawing in a short box is limited by the height rather than
 * running out of the bottom of it.
 */
function fitBox(host: HTMLElement, box: { w: number; h: number }, max = LARGEST_SQUARE): void {
    const pad = (): { x: number; y: number } => {
        const s = getComputedStyle(host);
        return {
            x: (parseFloat(s.paddingLeft) || 0) + (parseFloat(s.paddingRight) || 0),
            y: (parseFloat(s.paddingTop) || 0) + (parseFloat(s.paddingBottom) || 0),
        };
    };
    const fit = (): void => {
        const p = pad();
        const w = host.clientWidth - p.x;
        const h = host.clientHeight - p.y;
        if (w <= 0) return;
        const sq = Math.min(max, w / box.w, h > 0 ? h / box.h : Infinity);
        host.style.setProperty("--sq", `${sq.toFixed(3)}px`);
    };
    fit();
    new ResizeObserver(fit).observe(host);
}

/** A scene drawn into a box and fitted to it. */
function sceneIn(host: HTMLElement, draw: SceneDrawer, scene: Scene): void {
    host.replaceChildren(draw(host, scene, { seed: SEED }));
    fitBox(host, { w: scene.size[0], h: scene.size[1] });
}

/** Today's question drawn one of the ways it can be drawn, from the site's data. */
async function drawVersion(s: School, host: HTMLElement, i: number): Promise<void> {
    const read = readScene(s.data.versions[i]);
    if (!read.ok) return;
    const scene = read.first.scene;
    sceneIn(host, await drawerOf([scene]), scene);
}

/**
 * A whole sheet scaled down to its box's width, with the box as tall as the scaled sheet, so the
 * whole sheet shows and nothing is cropped; the page's box clips it to a page's shape.
 */
function fitWhole(stage: HTMLElement, sheet: HTMLElement): void {
    sheet.style.position = "absolute";
    sheet.style.left = "0";
    sheet.style.top = "0";
    sheet.style.transformOrigin = "0 0";
    const paint = (): void => {
        const w = stage.clientWidth;
        if (!w || !sheet.offsetWidth) return;
        const k = w / sheet.offsetWidth;
        sheet.style.transform = `scale(${k})`;
    };
    new ResizeObserver(paint).observe(stage);
    paint();
}

/**
 * Today's first lesson printed: the sheet as a child has it, its drawings in black ink and hatching
 * as the printer draws them, at a wide sheet's width, scaled to the box.
 */
async function drawPrint(s: School, host: HTMLElement): Promise<void> {
    const id = s.child.firstToday;
    const lesson = id === null ? null : await lessonOf(s, id);
    if (!lesson) return;
    // the roll's stylesheet is what a sheet's strip is styled by, and it comes with the roll
    const [{ lookSheet }, { scenesIn }] = await Promise.all([
        sheets(),
        import("../../engine/ui/scene"),
        import("../../engine/ui/world"),
    ]);
    const draw = await drawerOf(scenesIn(lesson));
    const measured = lookSheet({
        lesson,
        level: "medium",
        label: subjectFacts(lesson.subject).title,
        key: false,
        width: WIDE.sheet,
        narrow: false,
        draw: (h, scene, o) => draw(h, scene, { ...o, output: "paper" }),
        measureIn: host,
    });
    if (!measured) return;
    measured.el.style.width = `${WIDE.sheet}px`;
    host.replaceChildren(measured.el);
    fitWhole(host, measured.el);
}

/** A world's drawing standing on the floor of a tile, scaled down the way the map scales its pictures. */
function standIn(s: School, id: string, box: HTMLElement, fit: { w: number; h: number }): void {
    const sz = s.size(id);
    const a = placeArt(artById(id), 0, 0, box, { seed: SEED });
    if (!a || !sz.w || !sz.h) return;
    const k = Math.min(fit.w / sz.w, fit.h / sz.h, 1);
    a.style.position = "absolute";
    a.style.left = "0px";
    a.style.top = `${fit.h - sz.h}px`;
    a.style.transformOrigin = "0 100%";
    a.style.transform = `scale(${k})`;
    box.append(a);
}

/** A subject's tile: the landmark beside its lessons, or the subject's own drawing from the shelf. */
async function drawSubject(s: School, host: HTMLElement, k: number): Promise<void> {
    const t = s.child.tiles.tiles[k];
    if (!t) return;
    if (t.own !== undefined) {
        await loadDrawings([t.own]);
        const d = drawingOf(t.own);
        if (!d) return;
        const r = render(d, d.params, { seed: SEED, host });
        r.svg.classList.add("own");
        host.replaceChildren(r.svg);
        return;
    }
    standIn(s, t.art, host, {
        w: Math.min(150, host.clientWidth || 150),
        h: host.clientHeight || 96,
    });
}

/** The first question with a picture in one of the lessons a visitor reads first. */
async function drawLesson(s: School, host: HTMLElement, k: number): Promise<void> {
    const id = s.child.chosen[k];
    const lesson = id === undefined ? null : await lessonOf(s, id);
    if (!lesson) return;
    const scene = lesson.levels.medium.sections
        .flatMap((sec) => sec.blocks)
        .flatMap((b) => (b.k === "ask" ? b.questions : []))
        .find((q) => q.scene)?.scene;
    if (!scene) return;
    sceneIn(host, await drawerOf([scene]), scene);
}

const DRAW: Record<
    SamplePicture["is"],
    (s: School, host: HTMLElement, at: number) => Promise<void>
> = {
    version: drawVersion,
    print: (s, host) => drawPrint(s, host),
    subject: drawSubject,
    lesson: drawLesson,
};

/** One of the site's pictures of the sample child, drawn into a box the page has sized; a box whose picture cannot be read stays empty. */
export async function drawSample(host: HTMLElement, p: SamplePicture): Promise<void> {
    const s = await schoolOf();
    await DRAW[p.is](s, host, "at" in p ? p.at : 0);
}

/** The sample child's map at each stop of the site's journey. */
export async function stops(quiet = still()): Promise<ReturnType<typeof stopViews>> {
    const s = await schoolOf();
    const motionless = quiet || still();
    return stopViews(s.child, {
        worldOf: motionless ? s.stillOf : s.worldOf,
        size: s.size,
        still: motionless,
        declared: s.declared,
    });
}

/**
 * The still maps the small pictures are drawn from: a grown-up's map for the cards, so a world the
 * child has not reached is still drawn, the child's own for the journal, and the world each frames.
 */
export async function pictures(): Promise<{
    grown: MapView;
    own: MapView;
    cards: string[];
    journal: string;
}> {
    const s = await schoolOf();
    const o = { worldOf: s.stillOf, still: true, size: s.size, declared: s.declared };
    return {
        grown: viewOfTrip(s.child.now, { ...o, grown: true }),
        own: viewOfTrip(s.child.now, { ...o, grown: false }),
        cards: s.child.cards.map((c) => s.child.now.places[c.place]?.world ?? ""),
        journal: s.child.here?.world ?? "",
    };
}

/**
 * The camera on one place's picture alone, with room above it for the stamp that overlaps its
 * corner, fitted to the box both ways. The aim's `across`, which `aimCamera` in engine/ui/snapshot.ts
 * sets the zoom by, is not read here.
 */
export function pictureCamera(aimed: AimedAt, vp: Size): Camera {
    const w = aimed.w - 2 * GROUND_PAD;
    const h = aimed.h - 2 * GROUND_PAD;
    const x = aimed.x - w / 2;
    const y = aimed.y - h / 2;
    return fitRect({ x: x - 60, y: y - 230, w: w + 200, h: h + 290 }, vp, 0);
}

/** A sheet of a lesson as the sample child has it, drawn and measured for a roll to lay where it puts it. */
async function sheetOf(
    s: School,
    id: string,
    o: { narrow: boolean; measureIn: HTMLElement; date?: string },
): Promise<Measured | null> {
    const [lesson, { lookSheet }, { scenesIn }] = await Promise.all([
        lessonOf(s, id),
        sheets(),
        import("../../engine/ui/scene"),
    ]);
    if (!lesson) return null;
    const draw = await drawerOf(scenesIn(lesson));
    return lookSheet({
        lesson,
        level: "medium",
        label: subjectFacts(lesson.subject).title,
        ...(o.date === undefined ? {} : { date: o.date }),
        key: false,
        width: sheetWidth(o.narrow),
        narrow: o.narrow,
        draw,
        measureIn: o.measureIn,
    });
}

/** A day as the roll's sheets say it in their corner: "Mon, Nov 23", the journal's own format, so it reads as the stamp on the map beside it does. */
const sheetDate = (iso: string): string =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
    });

export interface Roll {
    dispose(): void;
    view: WorldView;
    sheets: (lesson: string) => HTMLElement | null;
}

/**
 * The sample child's roll for the site: yesterday and today in the world the child is in, with each
 * day's sheet drawn as the child has it and measured in `host`, so the roll is laid out round it.
 */
export async function roll(host: HTMLElement, narrow: boolean): Promise<Roll> {
    const s = await schoolOf();
    await document.fonts.ready;
    const built = new Map<string, HTMLElement>();
    const owned: Measured[] = [];
    const heights = new Map<string, number>();
    const dispose = (): void => {
        for (const sheet of owned) sheet.dispose();
        owned.length = 0;
        built.clear();
    };
    try {
        for (const day of s.child.rollDays())
            for (const id of day.lessons) {
                const m = await sheetOf(s, id, {
                    narrow,
                    measureIn: host,
                    date: sheetDate(day.date),
                });
                if (!m) continue;
                owned.push(m);
                built.set(id, m.el);
                heights.set(id, m.height);
            }
        const view = worldViewOf({
            journal: rollJournal(s.child, CHOICE),
            choice: CHOICE,
            corpus: s.corpus,
            worldOf: s.worldOf,
            topics: s.child.topics,
            height: (id) => heights.get(id) ?? 900,
            size: s.size,
            narrow,
            grown: false,
            limits: siteWorld(2),
        });
        return {
            view,
            sheets: (id) => built.get(id) ?? null,
            dispose,
        };
    } catch (error) {
        dispose();
        throw error;
    }
}

/**
 * A world of the sample child's, read for a visitor over the site (engine/ui/reading.tsx): a visit
 * to it where it stands, with the sample child's record as far as today, each sheet drawn as the
 * child has it with nothing filled in. Null for a world the shelf does not have.
 */
export function reading(s: School, id: string): ReadingSource | null {
    const world = worldById(id);
    if (world.id !== id) return null;
    const journal = visitJournal(s.child, world, CHOICE);
    return {
        world: (o) =>
            worldViewOf({
                journal,
                choice: CHOICE,
                corpus: s.corpus,
                worldOf: s.worldOf,
                topics: s.child.topics,
                height: (l) => o.height(l) ?? 900,
                size: s.size,
                narrow: o.narrow,
                grown: false,
                limits: siteWorld(2),
            }),
        sheet: (lesson, o) => sheetOf(s, lesson, o),
        card: (lesson) => ({ label: subjectFacts(s.child.subjectOf(lesson)).title, note: "" }),
    };
}
