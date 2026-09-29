import type { Rect } from "../space";

export interface TileCell {
    level: number;
    x: number;
    y: number;
    rect: Rect;
    key: string;
}
export interface TileRegion {
    rect: Rect;
    source: TileCell;
}

export function overlap(a: Rect, b: Rect): Rect | null {
    const x = Math.max(a.x, b.x),
        y = Math.max(a.y, b.y),
        right = Math.min(a.x + a.w, b.x + b.w),
        bottom = Math.min(a.y + a.h, b.y + b.h);
    return right > x && bottom > y ? { x, y, w: right - x, h: bottom - y } : null;
}

function subtract(a: Rect, b: Rect): Rect[] {
    return [
        { x: a.x, y: a.y, w: a.w, h: b.y - a.y },
        { x: a.x, y: b.y + b.h, w: a.w, h: a.y + a.h - b.y - b.h },
        { x: a.x, y: b.y, w: b.x - a.x, h: b.h },
        { x: b.x + b.w, y: b.y, w: a.x + a.w - b.x - b.w, h: b.h },
    ].filter((r) => r.w > 0 && r.h > 0);
}

/** A partition, never stacked alpha: ready fine regions replace only the area they cover. */
export function tileCoverage(
    wanted: readonly TileCell[],
    available: readonly TileCell[],
    coarse: TileCell,
    seen: Rect,
): TileRegion[] {
    const ready = new Set(available.map((c) => c.key));
    // finest first, and never the root, which stands in for whatever is left at the end
    const standIns = available.filter((c) => c.level > 0).sort((a, b) => b.level - a.level);
    const regions: TileRegion[] = [];
    for (const tile of wanted) {
        const rect = overlap(tile.rect, seen);
        if (!rect) continue;
        if (ready.has(tile.key)) {
            regions.push({ rect, source: tile });
            continue;
        }
        let missing = [rect];
        for (const previous of standIns) {
            if (!overlap(previous.rect, rect)) continue;
            const rest: Rect[] = [];
            for (const part of missing) {
                const covered = overlap(part, previous.rect);
                if (covered) {
                    regions.push({ rect: covered, source: previous });
                    rest.push(...subtract(part, covered));
                } else rest.push(part);
            }
            missing = rest;
            if (!missing.length) break;
        }
        regions.push(...missing.map((rect) => ({ rect, source: coarse })));
    }
    return regions;
}
