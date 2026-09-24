import assert from "node:assert/strict";
import { test } from "node:test";
import { layoutRoll, type RollInput } from "../roll-layout";

const input = (height: number): RollInput => ({
    days: ["earlier", "reading", "later"].map((id, i) => ({
        id,
        n: i + 1,
        term: 1,
        lessons: [id],
        state: "done",
        date: "2026-09-24",
    })),
    next: null,
    terms: 1,
    worldOf: () => "kitchen",
    height: (id) => (id === "earlier" ? height : 2600),
    scenery: () => ({ landmarks: ["tree", "house", "cake"], creatures: ["bird", "bee"] }),
    size: () => ({ w: 120, h: 120 }),
});

test("earlier sheet growth translates later scenery without changing its identity or local placement", () => {
    const before = layoutRoll(input(800));
    const after = layoutRoll(input(5800));
    for (const id of ["reading", "later"]) {
        const local = (layout: typeof before) => {
            const row = layout.rows.find((r) => r.day.id === id);
            assert.ok(row);
            return layout.scenery
                .filter((s) => layout.rows[s.row]?.day.id === id)
                .map((s) => ({ ...s, at: { x: s.at.x, y: s.at.y - row.rect.y } }));
        };
        assert.deepEqual(local(after), local(before));
    }
});

test("path markings beside a later day retain their phase when earlier paper grows", () => {
    const before = layoutRoll(input(800));
    const after = layoutRoll(input(5800));
    const local = (layout: typeof before) => {
        const row = layout.rows[1];
        assert.ok(row);
        return layout.path
            .flatMap((p) => p.samples)
            .filter((q) => q.y > row.flag.y + 50 && q.y < row.rect.y + row.rect.h - 50)
            .map((q) =>
                Object.fromEntries(
                    Object.entries({ ...q, y: q.y - row.rect.y }).map(([key, value]) => [
                        key,
                        Math.round(value * 1000) / 1000,
                    ]),
                ),
            );
    };
    assert.deepEqual(local(after), local(before));
});
