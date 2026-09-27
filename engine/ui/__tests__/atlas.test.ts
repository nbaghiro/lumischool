import assert from "node:assert/strict";
import { test } from "node:test";
import { atlas, CELL, PAD } from "../atlas";
import type { GlResource, GlTexture } from "../gl";

/** A renderer that keeps pages as records, so the allocator's arithmetic can be read back. */
function fake() {
    const live = new Set<GlTexture>();
    const writes: { x: number; y: number }[] = [];
    let mipmaps = 0;
    return {
        writes,
        live,
        mipmaps: () => mipmaps,
        gl: {
            page(w: number, h: number): GlTexture {
                const t: GlTexture = { kind: "texture", w, h, bytes: (w * h * 4 * 21) / 16 };
                live.add(t);
                return t;
            },
            live: (t: GlResource) => t.kind === "texture" && live.has(t),
            release: (t: GlResource) => void (t.kind === "texture" && live.delete(t)),
            write: (_t: GlTexture, x: number, y: number, _pixels: string) => (
                writes.push({ x, y }),
                true
            ),
            mipmap: () => void mipmaps++,
        },
    };
}

test("drawings of one size share a shelf, each inset by its padding, and a freed cell is used again", () => {
    const f = fake();
    const pages = atlas<string>(f.gl, 1e9);
    const a = pages.place(100, 60),
        b = pages.place(100, 60);
    assert.ok(a && b);
    assert.equal(a.page, b.page);
    assert.deepEqual([a.x, a.y, a.w, a.h], [PAD, PAD, 100 - 2 * PAD, 60 - 2 * PAD]);
    // a 100 by 60 drawing takes a 128 by 64 cell, so the next is 128 along the shelf
    assert.equal(b.x - a.x, 128);
    assert.equal(b.y, a.y);
    pages.free(a);
    const c = pages.place(90, 50);
    assert.ok(c);
    assert.deepEqual([c.x, c.y], [a.x, a.y]);
});

test("a drawing larger than a cell keeps a texture of its own, and the budget bounds the pages", () => {
    const f = fake();
    assert.equal(atlas<string>(f.gl, 1e9).place(CELL + 1, 10), null);
    const small = atlas<string>(f.gl, 1);
    assert.equal(small.place(64, 64), null);
});

test("a page nothing is in lets its texture go, and writes are mipmapped once per settle", () => {
    const f = fake();
    const pages = atlas<string>(f.gl, 1e9);
    const a = pages.place(64, 64);
    assert.ok(a);
    assert.ok(pages.write(a, "pixels"));
    assert.ok(pages.write(a, "pixels"));
    pages.settle();
    assert.equal(f.mipmaps(), 1);
    assert.equal(f.live.size, 1);
    pages.free(a);
    assert.equal(f.live.size, 0);
    assert.equal(pages.bytes(), 0);
});
