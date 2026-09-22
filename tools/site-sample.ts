// The site's data at build (tools/first-view.ts): the sample child's journey, the words the site says
// about them, the day's question laid out each of the ways it is drawn, and where the visitor's pack
// is. The child is `sampleChild` in school/worlds/sample.ts over the visitor pack's own index, which
// is what the page reads them from too, so the two agree; what only the notation knows (how many
// items the curriculum holds, how many ways a question is drawn, the strip above a title) is read off
// the workspace here and never on a page.

import { sceneOf } from "../engine/notation/compile";
import { instantiate } from "../engine/notation/instantiate";
import { questions, tagOf } from "../engine/notation/lessons";
import type { Workspace } from "../engine/notation/notation";
import { PACK, type PackScene } from "../engine/pack";
import { apply } from "../school/worlds/choice";
import { corpusFrom } from "../school/worlds/lessons";
import { SAMPLE_START, sampleChild, wordsOf, type SiteData } from "../school/worlds/sample";
import type { Applied } from "../school/worlds/types";
import { WORLDS, worldById } from "../school/worlds/worlds";
import type { BuiltPack } from "./pack";

/** At most this many of the ways a question is drawn are shown. */
const MOST_VERSIONS = 4;

/** The site's data from the workspace the pack was compiled on, the visitor's pack and where it is served from. */
export function siteData(ws: Workspace, pack: BuiltPack, packAt: string): SiteData {
    const corpus = corpusFrom(pack.index.lessons, SAMPLE_START);
    const worlds = new Map(WORLDS.map((w) => [w.id, apply(w, undefined, true).world] as const));
    const worldOf = (id: string): Applied =>
        worlds.get(id) ?? apply(worldById(id), undefined, true).world;
    const child = sampleChild(corpus, worldOf);

    // the first question with a picture in today's first lesson, drawn a few of the ways it can be
    const lesson = child.firstToday === null ? undefined : ws.lessons.get(child.firstToday);
    const asked = lesson
        ? [...questions(ws, lesson).values()].flat().find((q) => q.item.scene)
        : undefined;
    const report = asked ? ws.reports.get(asked.item.id) : undefined;
    const variants = asked?.item.scene ? (report?.variants ?? []) : [];
    const drawn = Math.min(MOST_VERSIONS, variants.length);
    const versions: PackScene[] = [];
    for (let i = 0; i < drawn; i++) {
        const v = variants[Math.round((i * (variants.length - 1)) / Math.max(1, drawn - 1))];
        const scene = asked?.item.scene;
        if (!v || !scene || !asked || !lesson) continue;
        versions.push({
            pack: PACK,
            lesson: lesson.id,
            scene: sceneOf(instantiate(scene, v.env, asked.item.roles, ws.defines)),
        });
    }
    const words = wordsOf(child, {
        questions: ws.items.size,
        versions: report
            ? { total: report.variants.length, sampled: report.sampled, drawn: versions.length }
            : null,
        tagOf: (id) => {
            const l = ws.lessons.get(id);
            return l ? tagOf(l) : id;
        },
    });
    return { journey: child.now, words, versions, pack: packAt };
}
