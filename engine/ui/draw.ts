// A screen's own drawings drawn into their boxes (art.tsx's KidPicture and Drawing): the creature
// that is a child's picture, standing at the bottom middle of its box as big as the box allows, and
// a shelf drawing filling its box; each played once it is on the page with the motion the shelf
// resolves for it, unless the person asked for less motion; and the bar's bird (mark.tsx). Loaded
// only when a screen draws, which every page does for its bar.

import type { Kid } from "../../server/db/schema";
import { U } from "../paper";
import type { Id, ParamsOf } from "../parts/catalog";
import { artKey } from "../space";
import { idle, still } from "./art";
import { motionOf } from "../parts/drawing";
import { loadDrawings } from "./drawings";
import { guide } from "./guide";
import { picturesOf, PICTURES, pictureOf } from "./pictures";
import { render } from "./svg";

/** The player the page's own drawings idle on, calmly, as the sign-in designs have it: one group for the page. */
let calmGroup: Promise<import("./animate").Group> | null = null;
const calm = (): Promise<import("./animate").Group> =>
    (calmGroup ??= import("./animate").then((m) =>
        m.animate({ intensity: "calm", settle: 16, most: 18 }),
    ));

/** A drawing played once it is on the page, with the motion the shelf resolves for it, unless the person asked for less motion. `key` is the loader's name for it (artKey). */
async function play(svg: SVGSVGElement, key: string): Promise<void> {
    if (still()) return;
    const shelf = await loadDrawings([key]);
    const d = shelf.drawing(key);
    const plays = d && motionOf(d);
    if (plays) (await calm()).play(svg, { motion: plays });
}

/**
 * A child's picture: the creature their settings name, or the one their place in the family gives
 * them, never a brother's or sister's (pictures.ts). `family` is every child shown with them.
 */
export async function drawKid(
    host: HTMLElement,
    o: {
        kid: Pick<Kid, "id" | "settings">;
        family: readonly Pick<Kid, "id" | "settings">[];
        seed: number;
    },
): Promise<void> {
    const shelf = await loadDrawings(PICTURES.map(artKey));
    const drawable = (id: string): boolean => {
        const p = pictureOf(id);
        return !!p && shelf.drawing(artKey(p)) !== undefined;
    };
    const id = picturesOf(
        o.family,
        PICTURES.map((p) => p.id),
        drawable,
    ).get(o.kid.id);
    const picture = id === undefined ? undefined : pictureOf(id);
    const d = picture && shelf.drawing(artKey(picture));
    if (!picture || !d) return;
    await idle();
    const box = { w: host.clientWidth, h: host.clientHeight };
    const out = render(d, { ...(d.params as object), ...picture.params }, { host, seed: o.seed });
    const w = out.box.w * U,
        h = out.box.h * U;
    if (!w || !box.w || !box.h) return;
    const k = Math.min(box.w / w, box.h / h) * 0.92;
    const a = document.createElement("div");
    a.className = "j-art creature";
    Object.assign(a.style, {
        position: "absolute",
        left: `${(box.w - w * k) / 2}px`,
        top: `${box.h - h * k}px`,
        width: `${w}px`,
        height: `${h}px`,
        transform: `scale(${k})`,
        transformOrigin: "0 0",
    });
    out.svg.style.width = `${w}px`;
    out.svg.style.height = `${h}px`;
    out.svg.style.maxWidth = "none";
    a.append(out.svg);
    host.replaceChildren(a);
    void play(out.svg, artKey(picture));
}

/** A shelf drawing filling its box, such as the envelope on the sheet that asks for a code, drawn once the box is on the page, since a drawing reads its colours from where it sits. */
export async function drawShelf<K extends Id>(
    host: HTMLElement,
    id: K,
    params: ParamsOf<K>,
    seed: number,
): Promise<void> {
    const shelf = await loadDrawings([id]);
    const d = shelf.drawing(id);
    if (!d) return;
    await idle();
    const svg = render(d, params, { host, seed }).svg;
    svg.style.width = "100%";
    svg.style.height = "100%";
    host.replaceChildren(svg);
    void play(svg, id);
}

/** The guide who is a paper bird, idling and facing into the page, beside the word in the bar. */
export function bird(host: HTMLElement): void {
    guide(host, "bird", { faces: "right", still: still() });
}
