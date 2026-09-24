// The visitor's pack and the sample child read from it (school/worlds/sample.ts), for the pictures
// below the site's opening (sample.ts): the pack's index is read once, after the opening map is drawn
// and the page idle, so reading it never holds the map back; the child is worked out from that index
// with the same function the build used (tools/site-sample.ts), so the pictures and the words agree;
// and a lesson's file is read as a picture asks for it.

import { reads } from "../../engine/ui/reads";
import { readIndex, readLesson, type PackIndex, type PackLesson } from "../../engine/pack";
import { idle, still } from "../../engine/ui/art";
import { declaredOf, loadDrawings } from "../../engine/ui/drawings";
import type { Declared } from "../../engine/motion/world";
import { refsOf, sizeOn } from "../../school/worlds/art";
import { apply } from "../../school/worlds/choice";
import { corpusFrom, type Corpus } from "../../school/worlds/lessons";
import {
    SAMPLE_START,
    sampleChild,
    type SampleChild,
    type SiteData,
} from "../../school/worlds/sample";
import type { Applied } from "../../school/worlds/types";
import { WORLDS, worldById } from "../../school/worlds/worlds";
import { afterOpening, siteData } from "./data";

/** The visitor's pack and the sample child read from it, with the worlds' drawings loaded. */
export interface School {
    data: SiteData;
    index: PackIndex;
    corpus: Corpus;
    child: SampleChild;
    /** Each world as it comes, with motion off when the visitor has asked for less. */
    worldOf: (id: string) => Applied;
    /** The same worlds drawn still, for the small pictures, so a page of them keeps to a few things moving at once. */
    stillOf: (id: string) => Applied;
    size: (art: string, params?: Record<string, unknown>) => { w: number; h: number };
    declared: Declared;
}

let school: Promise<School> | null = null;
let requestNow = (): void => {};
const requested = new Promise<void>((done) => {
    requestNow = done;
});

/**
 * The pack and the child, read once, after the opening map is drawn and the page is idle. The
 * drawings every world names are loaded first, since the views are built from their sizes.
 */
export function schoolOf(urgent = false): Promise<School> {
    if (urgent) requestNow();
    school ??= (async () => {
        const data = await siteData();
        await Promise.race([afterOpening().then(idle), requested]);
        const r = await fetch(`${data.pack}/index.json`);
        if (!r.ok) throw new Error(`the visitor's pack answered ${r.status}`);
        const index = readIndex(await r.json());
        if (!index.ok) throw new Error(`the visitor's pack cannot be read: ${index.problem}`);
        const corpus = corpusFrom(index.index.lessons, SAMPLE_START);
        const shelf = await loadDrawings(refsOf(WORLDS.map((w) => w.id)));
        const quiet = still();
        const applied = new Map<string, Applied>();
        const stills = new Map<string, Applied>();
        const worldFrom = (kept: Map<string, Applied>, motionless: boolean) => (id: string) => {
            const had = kept.get(id);
            if (had) return had;
            const w = apply(worldById(id), undefined, motionless).world;
            kept.set(id, w);
            return w;
        };
        const stillOf = worldFrom(stills, true);
        const worldOf = quiet ? stillOf : worldFrom(applied, false);
        return {
            data,
            index: index.index,
            corpus,
            child: sampleChild(corpus, stillOf),
            worldOf,
            stillOf,
            size: sizeOn(shelf),
            declared: declaredOf,
        };
    })();
    return school;
}

const lessons = new WeakMap<School, ReturnType<typeof reads<PackLesson>>>();

export function lessonOf(s: School, id: string): Promise<PackLesson | null> {
    let cache = lessons.get(s);
    if (!cache) lessons.set(s, (cache = reads((lesson) => JSON.stringify(lesson).length * 2)));
    return cache
        .read(id, async () => {
            const facts = s.index.lessons.find((lesson) => lesson.id === id);
            if (!facts) return null;
            const response = await fetch(`${s.data.pack}/${facts.file}`);
            if (!response.ok) return null;
            const parsed = readLesson(await response.json());
            return parsed.ok ? parsed.lesson : null;
        })
        .catch(() => null);
}
