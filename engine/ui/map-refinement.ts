import type { Rect } from "../space";
import type { GlImage } from "./gl";
import { overlap, subtract } from "./map-tile-layout";

/** Joins two non-overlapping tile grids without blending transparent ink twice. */
export function refineImages(
    next: readonly GlImage[],
    previous: readonly GlImage[],
    mix: number,
): GlImage[] {
    if (mix >= 1) return [...next];
    const out: GlImage[] = [];
    for (const image of next) {
        let rest = [image.rect];
        for (const old of previous) {
            const remaining: Rect[] = [];
            for (const rect of rest) {
                const cut = overlap(rect, old.rect);
                if (!cut) {
                    remaining.push(rect);
                    continue;
                }
                out.push({
                    ...crop(image, cut),
                    previous: { texture: old.texture, rect: old.rect, source: old.source, mix },
                });
                remaining.push(...subtract(rect, cut));
            }
            rest = remaining;
            if (!rest.length) break;
        }
        for (const rect of rest) out.push(crop(image, rect));
    }
    return out;
}

function crop(image: GlImage, rect: Rect): GlImage {
    const source = image.source ?? { x: 0, y: 0, w: 1, h: 1 };
    return {
        ...image,
        rect,
        source: {
            x: source.x + ((rect.x - image.rect.x) / image.rect.w) * source.w,
            y: source.y + ((rect.y - image.rect.y) / image.rect.h) * source.h,
            w: (rect.w / image.rect.w) * source.w,
            h: (rect.h / image.rect.h) * source.h,
        },
    };
}
