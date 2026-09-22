// Where a child is on their map, in the words the home's card says it, worked out as the child's map
// works it out from the same record. It reads the worlds, so the home loads it once a record is there.

import { nowIn } from "../../school/family/now";
import { artById, refsOf } from "../../school/worlds/art";
import { apply, termsFor } from "../../school/worlds/choice";
import type { LessonFacts } from "../../engine/pack";
import { corpusFrom, topicsIn } from "../../school/worlds/lessons";
import { journey } from "../../school/worlds/rewards";
import type { Applied } from "../../school/worlds/types";
import { pictureFor } from "../../school/worlds/view";
import { worldById } from "../../school/worlds/worlds";
import type { GrownRecord } from "../../server/api";
import type { Kid } from "../../server/db/schema";
import { dayShort, plural } from "./grown";
import { choiceFor } from "./worlds";

/** Where a child is on their map, in the words a card says it. */
export interface Where {
    /** The world with the family's own tweaks in it, which is what the child sees and the card draws. */
    world: Applied;
    term: number;
    lines: string[];
}

/**
 * The world's own picture on a child's card, drawn at `width` and kept at the painter's ratio. It is
 * the picture the map draws of that world, with no guide in it, so a card shows where the child is
 * rather than saying it in words alone. The painter, its stylesheet and the drawings are loaded here
 * rather than imported, both so they come only when a card asks and so this module's own suite,
 * which Node runs, never has to resolve a `.tsx` or a stylesheet.
 */
export async function paintWorld(world: Applied, host: HTMLElement, wide: number): Promise<void> {
    const [{ worldPainter }, { loadDrawings }] = await Promise.all([
        import("../../engine/ui/painters"),
        import("../../engine/ui/drawings"),
    ]);
    const [painter] = await Promise.all([worldPainter(), loadDrawings(refsOf([world.id]))]);
    const width = (await laidOut(host)) || wide;
    const { picture, art } = pictureFor(world);
    const el = painter.paintPicture(picture, art, host);
    el.style.transform = `scale(${width / painter.PICTURE.w})`;
    el.style.transformOrigin = "0 0";
    host.replaceChildren(el);
}

/** How many frames the box may take to come back before the picture is drawn at its default width. */
const WAITS = 120;

/**
 * The box's width, once it is on the page and laid out. A screen waiting on a request is taken off
 * the document until it answers (engine/ui/router.tsx), and a box that is off the document measures
 * nothing and resolves none of the palette's properties, so a picture drawn then would come out at
 * the wrong size and in the print colours.
 */
async function laidOut(host: HTMLElement): Promise<number> {
    for (let i = 0; i < WAITS; i++) {
        const width = host.getBoundingClientRect().width;
        if (host.isConnected && width > 0) return width;
        await new Promise((go) => requestAnimationFrame(go));
    }
    return host.getBoundingClientRect().width;
}

/**
 * The world a child is in and what their work has made happen there: the day it was stamped and by
 * which lesson, its moment done or how many lessons it still waits for, and the last landmark lit or
 * creature brought. It is worked out as the child's map works it out, from the same record.
 */
export function whereOf(r: GrownRecord, kid: Kid, lessons: readonly LessonFacts[]): Where | null {
    const corpus = corpusFrom(lessons, r.start ?? r.today);
    const choice = choiceFor(kid, r);
    const trip = journey(
        r.years.map((y) => ({
            grade: y.grade,
            year: corpus.year(y.grade, kid.name),
            progress: y.grade === kid.grade ? y.progress : { ...y.progress, current: "" },
            worlds: termsFor(choice, y.grade),
            tracks: r.tracks,
            // where the plan's days put the child, as their own map reads it
            ...(y.grade === kid.grade ? { now: nowIn(r) } : {}),
        })),
        worldById,
        topicsIn(corpus),
        [],
        kid.grade,
    );
    const place = trip.places[trip.here];
    if (!place) return null;
    // the family's own tweaks, since a world they have changed is the world the child is in; nothing
    // in a card's picture moves, so it is built still
    const world = apply(worldById(place.world), choice.tweaks[place.world], true).world;
    const title = (id: string): string => corpus.lesson(id)?.title ?? id;
    const lines: string[] = [];
    const first = place.done[0];
    if (place.stamp && first) lines.push(`Stamped ${dayShort(place.stamp)}, by ${title(first)}.`);
    const says = world.chapter.moment.says;
    lines.push(
        place.moment
            ? `“${says}” happened ${dayShort(place.moment)}.`
            : `“${says}” waits for ${plural(place.lessons.length - place.done.length, "more lesson")} here.`,
    );
    const own = new Set([world.chapter.moment.art, world.horizon.gate]);
    const lit = place.lit.filter((x) => !own.has(x.art)).at(-1);
    const follower = place.followers.at(-1);
    const what = (art: string): string => (artById(art)?.title ?? art).toLowerCase();
    if (lit) lines.push(`The ${what(lit.art)} lit ${dayShort(lit.on)}, by ${title(lit.lesson)}.`);
    else if (follower)
        lines.push(
            `The ${what(follower.art)} walks with the guide since ${dayShort(follower.on)}.`,
        );
    return { world, term: place.term, lines };
}
