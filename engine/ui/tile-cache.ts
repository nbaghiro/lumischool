/** Shared decoded imagery, with leases rather than promises retaining evicted images forever. */
export interface TileLease<T> {
    ready: Promise<T>;
    release(): void;
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
                .sort((a, b) => b.priority - a.priority)[0];
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

interface DecodedTileImage {
    src: string;
    removeAttribute(name: string): void;
    decode(): Promise<void>;
}

/** Browser decoding is not reliably settled by clearing src; settle our owned wait explicitly. */
function decodeUntilAborted(image: DecodedTileImage, signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
        let settled = false;
        const finish = (error?: unknown) => {
            if (settled) return;
            settled = true;
            signal.removeEventListener("abort", aborted);
            if (error !== undefined) reject(error);
            else resolve();
        };
        const aborted = () =>
            finish(signal.reason ?? new DOMException("Tile released", "AbortError"));
        signal.addEventListener("abort", aborted, { once: true });
        if (signal.aborted) {
            aborted();
            return;
        }
        try {
            // Both handlers remain attached if the browser completes a cancelled decode later.
            void image.decode().then(
                () => finish(),
                (error: unknown) => finish(error),
            );
        } catch (error) {
            finish(error);
        }
    });
}

export function tileImageLoader<T extends DecodedTileImage>(io: {
    image(): T;
    fetch(url: string, options: RequestInit): Promise<Response>;
    createObjectURL(blob: Blob): string;
    revokeObjectURL(url: string): void;
}) {
    return async (url: string, signal: AbortSignal, budget: number): Promise<T> => {
        const controller = new AbortController();
        let source: string | undefined;
        const image = io.image();
        const clean = () => {
            image.removeAttribute("src");
            if (source !== undefined) {
                io.revokeObjectURL(source);
                source = undefined;
            }
        };
        const abort = () => {
            clean();
            controller.abort();
        };
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
            source = io.createObjectURL(blob);
            image.src = source;
            await decodeUntilAborted(image, controller.signal);
            controller.signal.throwIfAborted();
            return image;
        } catch (error) {
            clean();
            throw error;
        } finally {
            clearTimeout(timeout);
            signal.removeEventListener("abort", abort);
        }
    };
}

export const tileImages = tileCache<HTMLImageElement>({
    budget: 24 * 1024 * 1024,
    concurrency: 4,
    load: tileImageLoader({
        image: () => new Image(),
        fetch: (url, options) => fetch(url, options),
        createObjectURL: (blob) => URL.createObjectURL(blob),
        revokeObjectURL: (url) => URL.revokeObjectURL(url),
    }),
    dispose(image) {
        URL.revokeObjectURL(image.src);
        image.removeAttribute("src");
    },
});
