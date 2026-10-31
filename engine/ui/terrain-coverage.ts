import { intersects, type Rect, type Size } from "../space";
import { overlap, subtract } from "./map-tile-layout";

export const TERRAIN_BLEED = 822;

export interface TerrainSource {
    rect: Rect;
    bounds: Rect;
    elements: readonly Element[] | null;
    waves?: Element;
}

export function renderDensity(size: Size, device: number): number {
    return Math.min(
        Math.max(1, Math.min(2, device)),
        Math.sqrt(4_000_000 / Math.max(1, size.w * size.h)),
    );
}

/** Coverage belongs to a region, never to the work queue that happens to be busy. */
export function terrainCoverage(rects: readonly Rect[]) {
    interface Part {
        rect: Rect;
        mix: number;
    }
    const states = rects.map((rect) => ({ rect, parts: [{ rect, mix: 0 }], at: 0, near: false }));
    let previousView: Rect | null = null;
    return {
        reset() {
            for (const state of states) {
                state.parts = [{ rect: state.rect, mix: 0 }];
                state.at = 0;
            }
            previousView = null;
        },
        frame(seen: Rect, missing: readonly Rect[], scale: number, now: number, still: boolean) {
            const out: { rect: Rect; mix: number; moving: boolean; lost: boolean }[] = [];
            for (const s of states) {
                if (!intersects(s.rect, seen)) {
                    // Offscreen partitions need no geometry history; availability is rechecked on return.
                    if (s.parts.length > 1)
                        s.parts = [{ rect: s.rect, mix: Math.max(...s.parts.map((p) => p.mix)) }];
                    continue;
                }
                s.near = scale > (s.near ? 1.05 : 1.3);
                const holes =
                    s.near || s.parts.some((p) => p.mix > 0)
                        ? missing.filter((r) => intersects(r, s.rect))
                        : [];
                const step = s.at ? Math.min(1, (now - s.at) / 150) : 0;
                const next: Part[] = [];
                for (const part of s.parts) {
                    let available = [part.rect];
                    for (const hole of holes) {
                        const rest: Rect[] = [];
                        for (const rect of available) {
                            const cut = overlap(rect, hole);
                            if (!cut) {
                                rest.push(rect);
                                continue;
                            }
                            next.push({ rect: cut, mix: 0 });
                            if (intersects(cut, seen))
                                out.push({
                                    rect: cut,
                                    mix: 0,
                                    moving: false,
                                    lost:
                                        part.mix === 1 &&
                                        s.near &&
                                        !!previousView &&
                                        intersects(cut, previousView),
                                });
                            rest.push(...subtract(rect, cut));
                        }
                        available = rest;
                        if (!available.length) break;
                    }
                    const aim = s.near ? 1 : 0;
                    const mix = still
                        ? aim
                        : part.mix +
                          Math.sign(aim - part.mix) * Math.min(Math.abs(aim - part.mix), step);
                    for (const rect of available) {
                        next.push({ rect, mix });
                        if (intersects(rect, seen))
                            out.push({ rect, mix, moving: mix !== aim, lost: false });
                    }
                }
                // Equal adjacent regions coalesce, so drifting or failed sources cannot accumulate slivers.
                s.parts =
                    next.every((p) => p.mix === next[0]?.mix) && next[0]
                        ? [{ rect: s.rect, mix: next[0].mix }]
                        : mergeParts(next);
                s.at = now;
            }
            previousView = seen;
            return out;
        },
    };
}

function mergeParts(parts: { rect: Rect; mix: number }[]): { rect: Rect; mix: number }[] {
    for (const horizontal of [true, false]) {
        parts.sort(
            (a, b) =>
                a.mix - b.mix ||
                (horizontal
                    ? a.rect.y - b.rect.y || a.rect.h - b.rect.h || a.rect.x - b.rect.x
                    : a.rect.x - b.rect.x || a.rect.w - b.rect.w || a.rect.y - b.rect.y),
        );
        const merged: typeof parts = [];
        for (const part of parts) {
            const last = merged.at(-1);
            const a = last?.rect,
                b = part.rect;
            if (
                last &&
                a &&
                last.mix === part.mix &&
                (horizontal
                    ? a.y === b.y && a.h === b.h && a.x + a.w === b.x
                    : a.x === b.x && a.w === b.w && a.y + a.h === b.y)
            ) {
                if (horizontal) a.w += b.w;
                else a.h += b.h;
            } else merged.push({ rect: { ...b }, mix: part.mix });
        }
        parts = merged;
    }
    return parts;
}
