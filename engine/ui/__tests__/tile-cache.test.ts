import assert from "node:assert/strict";
import { test } from "node:test";
import { tileCache, tileImageLoader } from "../tile-cache";
import { tileCoverage, overlap, type TileCell } from "../map-tile-layout";

test("tile leases share in-flight loads and release both late and retained results", async () => {
    let finish!: (v: string) => void;
    const dropped: string[] = [];
    let reads = 0;
    const cache = tileCache({
        budget: 10,
        concurrency: 1,
        load: async () => {
            reads++;
            return new Promise<string>((resolve) => {
                finish = resolve;
            });
        },
        dispose: (v: string) => {
            dropped.push(v);
        },
    });
    const a = cache.acquire("one", 4),
        b = cache.acquire("one", 4);
    assert.ok(a);
    assert.ok(b);
    a.release();
    finish("pixels");
    assert.equal(await b.ready, "pixels");
    assert.equal(reads, 1);
    assert.equal(cache.stats().bytes, 4);
    b.release();
    assert.equal(cache.stats().bytes, 0);
    assert.deepEqual(dropped, ["pixels"]);
    const late = cache.acquire("two", 4);
    assert.ok(late);
    await new Promise((resolve) => setTimeout(resolve, 0));
    late.release();
    finish("late");
    await assert.rejects(late.ready, { name: "AbortError" });
    assert.deepEqual(dropped, ["pixels", "late"]);
    assert.equal(cache.stats().entries, 0);
});

test("tile admission accounts for loading allocations and cannot exceed its budget", async () => {
    let finish!: (v: string) => void;
    const cache = tileCache({
        budget: 10,
        concurrency: 1,
        load: () =>
            new Promise<string>((resolve) => {
                finish = resolve;
            }),
        dispose: () => {},
    });
    const a = cache.acquire("one", 6);
    assert.ok(a);
    assert.equal(cache.acquire("two", 6), null);
    assert.equal(cache.stats().bytes, 6);
    finish("ok");
    await a.ready;
    a.release();
    assert.ok(cache.acquire("two", 6));
});

const cell = (level: number, x: number, y: number, span: number): TileCell => ({
    level,
    x,
    y,
    key: `${level}/${x}-${y}`,
    rect: { x: x * span, y: y * span, w: span, h: span },
});
test("refinement partitions coverage without transparency overlap or losing previous fine art", () => {
    const coarse = cell(0, 0, 0, 100),
        old = cell(1, 0, 0, 50);
    const wanted = [cell(2, 0, 0, 25), cell(2, 1, 0, 25), cell(2, 0, 1, 25), cell(2, 1, 1, 25)];
    const first = wanted[0];
    assert.ok(first);
    const ready = [coarse, old, first];
    const regions = tileCoverage(wanted, ready, coarse, { x: 0, y: 0, w: 50, h: 50 });
    assert.equal(
        regions.reduce((sum, r) => sum + r.rect.w * r.rect.h, 0),
        2500,
    );
    assert.equal(regions.filter((r) => r.source === old).length, 3);
    assert.equal(
        regions.some((r) => r.source === coarse),
        false,
    );
    for (let i = 0; i < regions.length; i++)
        for (let j = i + 1; j < regions.length; j++) {
            const a = regions[i],
                b = regions[j];
            assert.ok(a);
            assert.ok(b);
            assert.equal(overlap(a.rect, b.rect), null);
        }
});

test("zoom-out keeps available children while their coarse replacement is loading", () => {
    const coarse = cell(0, 0, 0, 100),
        target = cell(1, 0, 0, 50),
        child = cell(2, 0, 0, 25);
    const regions = tileCoverage([target], [coarse, child], coarse, { x: 0, y: 0, w: 50, h: 50 });
    assert.equal(regions[0]?.source, child);
    assert.equal(
        regions.reduce((sum, r) => sum + r.rect.w * r.rect.h, 0),
        2500,
    );
});

function deferred<T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (error: unknown) => void;
    const promise = new Promise<T>((yes, no) => {
        resolve = yes;
        reject = no;
    });
    return { promise, resolve, reject };
}

function pngHeader(): ArrayBuffer {
    const bytes = new ArrayBuffer(24),
        header = new DataView(bytes);
    header.setUint32(0, 0x89504e47);
    header.setUint32(4, 0x0d0a1a0a);
    header.setUint32(12, 0x49484452);
    header.setUint32(16, 260);
    header.setUint32(20, 260);
    return bytes;
}

test("cancellation during header reading cannot start another image decode", async () => {
    const header = deferred<ArrayBuffer>();
    const reading = deferred<void>();
    class DelayedHeader extends Blob {
        override slice(): Blob {
            return this;
        }
        override arrayBuffer(): Promise<ArrayBuffer> {
            reading.resolve(undefined);
            return header.promise;
        }
    }
    const response = new Response();
    response.blob = async () => new DelayedHeader();
    let created = 0,
        decoded = 0;
    const load = tileImageLoader({
        image: () => ({
            src: "",
            removeAttribute() {},
            decode: async () => {
                decoded++;
            },
        }),
        fetch: async () => response,
        createObjectURL: () => {
            created++;
            return "blob:cancelled";
        },
        revokeObjectURL() {
            assert.fail("No object URL should have been created");
        },
    });
    const controller = new AbortController();
    const pending = load("tile", controller.signal, 260 * 260 * 4);
    await reading.promise;
    controller.abort();
    header.resolve(pngHeader());
    await assert.rejects(pending, { name: "AbortError" });
    assert.equal(created, 0);
    assert.equal(decoded, 0);
});

test("cancelled stuck decoding releases owned handles and cache reservation before its late rejection", async () => {
    const decoding = deferred<void>();
    const started = deferred<void>();
    const revoked: string[] = [];
    const image = {
        src: "",
        removeAttribute() {
            this.src = "";
        },
        decode() {
            started.resolve(undefined);
            return decoding.promise;
        },
    };
    const cache = tileCache({
        budget: 260 * 260 * 4,
        concurrency: 1,
        load: tileImageLoader({
            image: () => image,
            fetch: async () => new Response(new Blob([pngHeader()])),
            createObjectURL: () => "blob:tile",
            revokeObjectURL: (url) => {
                revoked.push(url);
            },
        }),
        dispose() {
            assert.fail("A cancelled decode must not become a retained image");
        },
    });
    const lease = cache.acquire("tile", 260 * 260 * 4);
    assert.ok(lease);
    await started.promise;
    lease.release();
    await assert.rejects(lease.ready, { name: "AbortError" });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(image.src, "");
    assert.deepEqual(revoked, ["blob:tile"]);
    assert.deepEqual(cache.stats(), {
        bytes: 0,
        budget: 270400,
        entries: 0,
        loading: 0,
        queued: 0,
    });
    // Browser completion is still handled even though our loading reservation is already released.
    decoding.reject(new Error("Late browser decode cancellation"));
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(revoked, ["blob:tile"]);
});
