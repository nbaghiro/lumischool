/** Shared decoded imagery, with leases rather than promises retaining evicted images forever. */
export interface TileLease<T> {
    ready: Promise<T>;
    release(): void;
    /** Says the tile is wanted now, at `priority`, so of the tiles still to load it goes first. */
    want(priority: number): void;
}

export function tileCache<T>(o: {
    budget: number;
    concurrency: number;
    load(url: string, signal: AbortSignal, bytes: number): Promise<T>;
    dispose(value: T): void;
}) {
    interface Entry {
        url: string;
        bytes: number;
        refs: number;
        priority: number;
        /** When it was last wanted, so of tiles alike the one wanted latest loads first. */
        wanted: number;
        state: "queued" | "loading" | "ready";
        controller: AbortController;
        value?: T;
        promise: Promise<T>;
        resolve(value: T): void;
        reject(error: unknown): void;
    }
    const entries = new Map<string, Entry>();
    const listeners = new Set<() => void>();
    const changed = () => {
        for (const listener of listeners) listener();
    };
    let bytes = 0;
    let loading = 0;
    let wants = 0;
    const drop = (e: Entry): void => {
        if (entries.get(e.url) !== e) return;
        entries.delete(e.url);
        if (e.state !== "loading") bytes -= e.bytes;
        e.controller.abort();
        if (e.value !== undefined) o.dispose(e.value);
        changed();
        if (e.state === "queued") e.reject(new DOMException("Tile released", "AbortError"));
    };
    const pump = (): void => {
        while (loading < o.concurrency) {
            const e = [...entries.values()]
                .filter((e) => e.state === "queued")
                .sort((a, b) => b.priority - a.priority || b.wanted - a.wanted)[0];
            if (!e) return;
            e.state = "loading";
            loading++;
            void o
                .load(e.url, e.controller.signal, e.bytes)
                .then(
                    (value) => {
                        if (entries.get(e.url) !== e || !e.refs) {
                            o.dispose(value);
                            e.reject(new DOMException("Tile released", "AbortError"));
                        } else {
                            e.value = value;
                            e.state = "ready";
                            e.resolve(value);
                        }
                    },
                    (error) => {
                        drop(e);
                        e.reject(error);
                    },
                )
                .finally(() => {
                    if (e.state === "loading") bytes -= e.bytes;
                    loading--;
                    changed();
                    pump();
                });
        }
    };
    return {
        subscribe(listener: () => void) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        canAcquire(requests: readonly { url: string; bytes: number }[]): boolean {
            const missing = new Map(
                requests.filter((r) => !entries.has(r.url)).map((r) => [r.url, r.bytes]),
            );
            return (
                bytes + [...missing.values()].reduce((sum, weight) => sum + weight, 0) <= o.budget
            );
        },
        acquire(url: string, weight: number, priority = 0): TileLease<T> | null {
            let e = entries.get(url);
            if (e) {
                e.refs++;
                e.priority = Math.max(e.priority, priority);
                e.wanted = ++wants;
            } else {
                if (weight <= 0 || !Number.isFinite(weight) || bytes + weight > o.budget)
                    return null;
                let resolve!: (value: T) => void, reject!: (error: unknown) => void;
                const promise = new Promise<T>((yes, no) => {
                    resolve = yes;
                    reject = no;
                });
                e = {
                    url,
                    bytes: weight,
                    refs: 1,
                    priority,
                    wanted: ++wants,
                    state: "queued",
                    controller: new AbortController(),
                    promise,
                    resolve,
                    reject,
                };
                entries.set(url, e);
                bytes += weight;
                // A released queued lease must not create an unhandled rejection.
                void promise.catch(() => {});
                pump();
            }
            const held = e;
            let released = false;
            return {
                ready: e.promise,
                release() {
                    if (released) return;
                    released = true;
                    if (!--held.refs) drop(held);
                    pump();
                },
                want(p) {
                    if (released || held.state !== "queued") return;
                    held.priority = Math.max(held.priority, p);
                    held.wanted = ++wants;
                },
            };
        },
        stats: () => ({
            bytes,
            budget: o.budget,
            entries: entries.size,
            loading,
            queued: [...entries.values()].filter((e) => e.state === "queued").length,
        }),
    };
}

/** A tile's pixels as the GPU takes them quickest: a bitmap, or on WebKit its bytes (tiles.worker.ts). */
export type TilePixels = ImageBitmap | ImageData;

/**
 * Settles with `decoding`, or rejects as `signal` aborts; what a decode left running produces after
 * that is handed to `discard`, since nothing will hold it.
 */
function untilAborted<T>(
    decoding: Promise<T>,
    signal: AbortSignal,
    discard: (value: T) => void,
): Promise<T> {
    return new Promise((resolve, reject) => {
        let settled = false;
        const aborted = () => {
            if (settled) return;
            settled = true;
            reject(signal.reason ?? new DOMException("Tile released", "AbortError"));
        };
        signal.addEventListener("abort", aborted, { once: true });
        if (signal.aborted) aborted();
        decoding.then(
            (value) => {
                signal.removeEventListener("abort", aborted);
                if (settled) discard(value);
                else {
                    settled = true;
                    resolve(value);
                }
            },
            (error: unknown) => {
                signal.removeEventListener("abort", aborted);
                if (settled) return;
                settled = true;
                reject(error);
            },
        );
    });
}

export function tileImageLoader<T>(io: {
    fetch(url: string, options: RequestInit): Promise<Response>;
    decode(blob: Blob): Promise<T>;
    discard(value: T): void;
}) {
    return async (url: string, signal: AbortSignal, budget: number): Promise<T> => {
        const controller = new AbortController();
        const abort = () => controller.abort();
        const timeout = setTimeout(abort, 20_000);
        signal.addEventListener("abort", abort, { once: true });
        try {
            if (signal.aborted) abort();
            const response = await io.fetch(url, {
                signal: controller.signal,
                cache: "force-cache",
            });
            if (!response.ok) throw new Error(`Map tile ${response.status}`);
            const blob = await response.blob();
            controller.signal.throwIfAborted();
            const header = new DataView(await blob.slice(0, 24).arrayBuffer());
            // Reading the header is asynchronous too: never start fresh decoding after cancellation.
            controller.signal.throwIfAborted();
            if (
                header.byteLength < 24 ||
                header.getUint32(0) !== 0x89504e47 ||
                header.getUint32(4) !== 0x0d0a1a0a ||
                header.getUint32(12) !== 0x49484452 ||
                header.getUint32(16) * header.getUint32(20) * 4 > budget
            )
                throw new Error("Map image exceeds its declared allocation");
            return await untilAborted(io.decode(blob), controller.signal, (v) => io.discard(v));
        } finally {
            clearTimeout(timeout);
            signal.removeEventListener("abort", abort);
        }
    };
}

const release = (pixels: TilePixels): void => {
    if (pixels instanceof ImageBitmap) pixels.close();
};

type Asked = Map<number, { resolve(p: TilePixels): void; reject(e: unknown): void }>;
/** The worker the tiles are decoded in, started with the first tile. */
let decoder: { worker: Worker; waiting: Asked } | null = null;
let serial = 0;
/** Decodes a picture off the page's thread, as the GPU takes it quickest (a map tile, a baked drawing). */
export function decode(blob: Blob): Promise<TilePixels> {
    if (!decoder) {
        const worker = new Worker(new URL("./tiles.worker.ts", import.meta.url), {
            type: "module",
        });
        const waiting: Asked = new Map();
        worker.onmessage = (e: MessageEvent<unknown>) => {
            const data = e.data;
            if (typeof data !== "object" || data === null || !("id" in data)) return;
            const id = typeof data.id === "number" ? data.id : -1;
            const asked = waiting.get(id);
            if (!asked) return;
            waiting.delete(id);
            const w = "w" in data ? data.w : null,
                h = "h" in data ? data.h : null,
                bitmap = "bitmap" in data ? data.bitmap : null,
                pixels = "pixels" in data ? data.pixels : null;
            if (bitmap instanceof ImageBitmap) asked.resolve(bitmap);
            else if (
                pixels instanceof ArrayBuffer &&
                typeof w === "number" &&
                typeof h === "number"
            )
                asked.resolve(new ImageData(new Uint8ClampedArray(pixels), w, h));
            else asked.reject(new Error("Map tile could not be decoded"));
        };
        decoder = { worker, waiting };
    }
    const id = ++serial;
    const { worker, waiting } = decoder;
    return new Promise((resolve, reject) => {
        waiting.set(id, { resolve, reject });
        worker.postMessage({ id, blob });
    });
}

export const tileImages = tileCache<TilePixels>({
    budget: 24 * 1024 * 1024,
    concurrency: 4,
    load: tileImageLoader({
        fetch: (url, options) => fetch(url, options),
        decode,
        discard: release,
    }),
    dispose: release,
});
