// Drawings packed into shared texture pages (.docs/overworld-gpu.md), so the GPU draws a run of them in
// one instanced batch. A page is cut into shelves of cells of one size class each, powers of two from
// 32 pixels, and a freed cell goes back to its class's free list for the next drawing of its size.
import type { CanvasGl, GlTexture } from "./gl";

/** A page's side in pixels: 16 MB of texels, 21 MB with its two mipmap levels. */
const PAGE = 2048;
/** Transparent pixels round a drawing in its cell, so the mipmaps two levels down do not reach a neighbour. */
export const PAD = 4;
/** The largest drawing a cell holds, padding included; a larger one keeps a texture of its own. */
export const CELL = 512;

/** Where a drawing is in the atlas: its page, and its pixels there, padding left out. */
export interface Slot {
    page: GlTexture;
    x: number;
    y: number;
    w: number;
    h: number;
    /** The drawing's rect in the page's unit square, for a sprite's crop. */
    uv: readonly [number, number, number, number];
}

interface Page {
    texture: GlTexture;
    /** How far down the page its shelves reach. */
    top: number;
    /** Free cells of each class, as their corners. */
    free: Map<string, { x: number; y: number }[]>;
    used: number;
    dirty: boolean;
}

const classOf = (n: number): number => Math.max(32, 2 ** Math.ceil(Math.log2(n)));

export type Atlas = ReturnType<typeof atlas>;

/** Pages for one renderer, under a byte budget; `place` is null when the budget is spent. */
export function atlas<Pixels = TexImageSource>(
    gl: Pick<CanvasGl, "page" | "live" | "release" | "mipmap"> & {
        write(t: GlTexture, x: number, y: number, source: Pixels): boolean;
    },
    budget: number,
) {
    let pages: Page[] = [];
    const cells = new Map<Slot, { page: Page; key: string; x: number; y: number }>();

    const open = (): Page | null => {
        const texture = gl.page(PAGE, PAGE, true);
        if (!texture) return null;
        const page: Page = { texture, top: 0, free: new Map(), used: 0, dirty: false };
        pages.push(page);
        return page;
    };
    const bytes = (): number => pages.reduce((sum, p) => sum + p.texture.bytes, 0);
    const shelf = (page: Page, cw: number, ch: number, key: string): boolean => {
        if (page.top + ch > PAGE) return false;
        const row: { x: number; y: number }[] = [];
        // right to left, so cells are taken from the left as the free list is popped
        for (let x = Math.floor(PAGE / cw - 1) * cw; x >= 0; x -= cw) row.push({ x, y: page.top });
        page.top += ch;
        page.free.set(key, [...(page.free.get(key) ?? []), ...row]);
        return true;
    };

    return {
        /** Everything the pages hold on the GPU. */
        bytes,
        /** A cell for a drawing `w` by `h` with its padding, or null when none fits the budget. */
        place(w: number, h: number): Slot | null {
            if (w > CELL || h > CELL) return null;
            const cw = classOf(w),
                ch = classOf(h),
                key = `${cw}x${ch}`;
            let page = pages.find((p) => gl.live(p.texture) && (p.free.get(key)?.length ?? 0) > 0);
            page ??= pages.find((p) => gl.live(p.texture) && shelf(p, cw, ch, key));
            if (!page && bytes() + (PAGE * PAGE * 4 * 21) / 16 <= budget) {
                const made = open();
                if (made && shelf(made, cw, ch, key)) page = made;
            }
            const at = page?.free.get(key)?.pop();
            if (!page || !at) return null;
            page.used++;
            const slot: Slot = {
                page: page.texture,
                x: at.x + PAD,
                y: at.y + PAD,
                w: w - 2 * PAD,
                h: h - 2 * PAD,
                uv: [
                    (at.x + PAD) / PAGE,
                    (at.y + PAD) / PAGE,
                    (w - 2 * PAD) / PAGE,
                    (h - 2 * PAD) / PAGE,
                ],
            };
            cells.set(slot, { page, key, x: at.x, y: at.y });
            return slot;
        },
        /** Writes a drawing, its padding included, into its cell. */
        write(slot: Slot, pixels: Pixels): boolean {
            const cell = cells.get(slot);
            if (!cell) return false;
            cell.page.dirty = true;
            return gl.write(slot.page, cell.x, cell.y, pixels);
        },
        free(slot: Slot): void {
            const cell = cells.get(slot);
            if (!cell) return;
            cells.delete(slot);
            cell.page.used--;
            cell.page.free.set(cell.key, [
                ...(cell.page.free.get(cell.key) ?? []),
                { x: cell.x, y: cell.y },
            ]);
            // a page nothing is in goes, so its shelves can be cut again for other sizes
            if (!cell.page.used) {
                gl.release(cell.page.texture);
                pages = pages.filter((p) => p !== cell.page);
            }
        },
        /** Makes the mipmaps of every page written since the last time. */
        settle(): void {
            for (const p of pages)
                if (p.dirty) {
                    gl.mipmap(p.texture);
                    p.dirty = false;
                }
        },
        live: (slot: Slot): boolean => cells.has(slot) && gl.live(slot.page),
        /** Lets every page go, after a lost context or when the renderer stops. */
        reset(): void {
            for (const p of pages) gl.release(p.texture);
            pages = [];
            cells.clear();
        },
    };
}
