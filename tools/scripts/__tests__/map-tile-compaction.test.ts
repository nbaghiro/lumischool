import assert from "node:assert/strict";
import { test } from "node:test";
import { deflateSync } from "node:zlib";
import { uniformPng } from "../map-tile-compaction";
import { tileDescriptor, type TileIndex } from "../../../engine/ui/map-tile-schema";

function png(rows: number[][], filter: number): Buffer {
    const width = (rows[0]?.length ?? 0) / 4;
    const raw: number[] = [];
    rows.forEach((row, y) => {
        raw.push(filter);
        row.forEach((value, x) => {
            const a = x >= 4 ? (row[x - 4] ?? 0) : 0,
                b = rows[y - 1]?.[x] ?? 0,
                c = x >= 4 ? (rows[y - 1]?.[x - 4] ?? 0) : 0;
            const p = a + b - c;
            const distances = [Math.abs(p - a), Math.abs(p - b), Math.abs(p - c)];
            const paeth = [a, b, c][distances.indexOf(Math.min(...distances))] ?? 0;
            const predictor = [0, a, b, Math.floor((a + b) / 2), paeth][filter] ?? 0;
            raw.push((value - predictor) & 255);
        });
    });
    const chunk = (name: string, data: Buffer) => {
        const out = Buffer.alloc(data.length + 12);
        out.writeUInt32BE(data.length);
        out.write(name, 4);
        data.copy(out, 8);
        return out;
    };
    const header = Buffer.alloc(13);
    header.writeUInt32BE(width);
    header.writeUInt32BE(rows.length, 4);
    header[8] = 8;
    header[9] = 6;
    // CRC is irrelevant to this decoder unit fixture; production integrity validates exporter output separately.
    return Buffer.concat([
        Buffer.from("89504e470d0a1a0a", "hex"),
        chunk("IHDR", header),
        chunk("IDAT", deflateSync(Buffer.from(raw))),
        chunk("IEND", Buffer.alloc(0)),
    ]);
}

test("uniform classification reconstructs all PNG filters and respects translucent and varying pixels", () => {
    for (let filter = 0; filter <= 4; filter++) {
        assert.deepEqual(
            uniformPng(
                png(
                    [
                        [10, 20, 30, 128, 10, 20, 30, 128],
                        [10, 20, 30, 128, 10, 20, 30, 128],
                    ],
                    filter,
                ),
            ),
            { kind: "solid", rgba: [10, 20, 30, 128] },
        );
        assert.deepEqual(uniformPng(png([[10, 20, 30, 0, 200, 150, 100, 0]], filter)), {
            kind: "empty",
        });
        assert.equal(uniformPng(png([[10, 20, 30, 128, 10, 20, 31, 128]], filter)), null);
        assert.equal(
            uniformPng(
                png(
                    [
                        [10, 20, 30, 128],
                        [10, 20, 30, 129],
                    ],
                    filter,
                ),
            ),
            null,
        );
    }
    assert.throws(() => uniformPng(Buffer.alloc(30)), /Invalid PNG/);
});

test("descriptor lookup has explicit coverage and channel ordering", () => {
    const index: TileIndex = {
        descriptors: [{ kind: "empty" }, { kind: "solid", rgba: [1, 2, 3, 255] }],
        levels: [{ level: 0, columns: 1, rows: 1, cells: [0, 1, 0, 1] }],
        lines: { level: 0, inner: { x: 0, y: 0, w: 1, h: 1 }, bleed: 0, cells: [0] },
    };
    assert.equal(tileDescriptor(index, 0, 0, 0, "sea")?.kind, "empty");
    assert.equal(tileDescriptor(index, 0, 0, 0, "pencil")?.kind, "solid");
    assert.equal(tileDescriptor(index, 0, 1, 0, "sea"), undefined);
    assert.equal(tileDescriptor(index, 1, 0, 0, "sea"), undefined);
});
