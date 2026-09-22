import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loaderOf } from "../../parts/catalog";
import { artKey } from "../../space";
import { PICTURES, picturesOf } from "../pictures";

const CREATURES = PICTURES.map((p) => p.id);
const drawable = (id: string): boolean => CREATURES.includes(id);

describe("each child's picture", () => {
    it("is a creature of their own for every family of up to twelve children", () => {
        for (let n = 1; n <= 12; n++) {
            const kids = Array.from({ length: n }, (_, i) => ({ id: `k${i}`, settings: {} }));
            const pictures = picturesOf(kids, CREATURES, drawable);
            assert.equal(pictures.size, n, `${n} children`);
            assert.equal(new Set(pictures.values()).size, n, `${n} children share no picture`);
        }
    });

    it("is the one a child's settings name, unless a brother or sister named it first or the shelf cannot draw it", () => {
        const settings = [
            {},
            { picture: "owl" },
            { picture: "owl" },
            { picture: "dragon" },
            { picture: "hedgehog" },
            {},
            {},
            {},
            {},
            {},
            {},
            {},
        ];
        const kids = settings.map((s, i) => ({ id: `k${i}`, settings: s }));
        const pictures = picturesOf(kids, CREATURES, drawable);
        assert.equal(new Set(pictures.values()).size, 12);
        assert.equal(pictures.get("k1"), "owl", "the first to name a creature keeps it");
        assert.equal(pictures.get("k4"), "hedgehog");
        assert.equal(pictures.get("k0"), "fox", "a child with none takes the first nobody has");
        assert.equal(pictures.get("k2"), "rabbit", "a second child naming owl takes the next free");
        assert.equal(pictures.get("k3"), "hen", "a creature the shelf cannot draw is not kept");
    });

    it("stays the same while the family does, and repeats only past as many children as creatures", () => {
        const kids = Array.from({ length: 13 }, (_, i) => ({ id: `k${i}`, settings: {} }));
        assert.deepEqual(
            [...picturesOf(kids, CREATURES, drawable)],
            [...picturesOf(kids, CREATURES, drawable)],
        );
        assert.equal(picturesOf(kids, CREATURES, drawable).get("k12"), "hedgehog");
    });
});

describe("every creature's drawing", () => {
    it("is in the catalogue, by the key drawKid asks the loader (drawings.ts) for", async () => {
        for (const p of PICTURES) {
            const key = artKey(p);
            const load = loaderOf(key);
            assert.ok(load, `${p.id} is not a catalogue drawing at ${key}`);
            const d = await load();
            const box = d.box({ ...(d.params as object), ...p.params });
            assert.ok(box.w > 0 && box.h > 0, `${p.id} draws nothing at ${key}`);
        }
    });

    it("is a creature of its own, so no two children are drawn the same", () => {
        assert.equal(new Set(PICTURES.map((p) => p.id)).size, PICTURES.length);
        assert.equal(new Set(PICTURES.map(artKey)).size, PICTURES.length);
    });
});
