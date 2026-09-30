// Draws a drawing's display list (sprites.ts) with a canvas of the worker's own and posts its pixels
// back, so rasterising never runs on the page's thread.
import type { Gradient, Paint, RasterJob, RasterMessage, Sketch, SketchNode } from "./sprites";

type Context = OffscreenCanvasRenderingContext2D;

// A canvas's pixels are freed only when the worker collects it, which WebKit does long after a phone
// has run out of memory, so every canvas here is taken from this pool and shrunk to nothing when given back.
const spare: OffscreenCanvas[] = [];
function take(w: number, h: number): Context | null {
    const canvas = spare.pop() ?? new OffscreenCanvas(1, 1);
    canvas.width = w;
    canvas.height = h;
    // drawn on the worker's own thread: a canvas Chrome draws on the GPU does so on the GPU process's
    // one thread, with a shared image made at every size, which the page's frames wait behind
    return canvas.getContext("2d", { willReadFrequently: true });
}
function give(c: Context): void {
    c.canvas.width = 0;
    c.canvas.height = 0;
    spare.push(c.canvas);
}

/** The worker's own font set, which the page's type library does not know a worker has. */
const holds = (v: unknown): v is { add(face: FontFace): unknown } =>
    typeof v === "object" && v !== null && "add" in v && typeof v.add === "function";
const faces = "fonts" in self && holds(self.fonts) ? self.fonts : null;
const loaded = new Map<string, Promise<void>>();
/** The page's fonts a sketch letters in, loaded into the worker once each. */
async function fonts(sketch: Sketch): Promise<void> {
    await Promise.all(
        sketch.fonts.map((f) => {
            let had = loaded.get(f.url);
            if (!had) {
                const face = new FontFace(f.family, `url(${f.url})`, {
                    weight: f.weight,
                    style: f.style,
                });
                // a face that never settles is waited for three seconds, and the drawing is drawn with
                // what the worker has, rather than holding the worker for good
                had = Promise.race([
                    face
                        .load()
                        .then((done) => {
                            faces?.add(done);
                        })
                        .catch(() => undefined),
                    new Promise<void>((done) => setTimeout(done, 3000)),
                ]);
                loaded.set(f.url, had);
            }
            return had;
        }),
    );
}

/** Whether a box in a node's own units falls wholly outside the canvas, under the transform it is drawn with. */
function outside(c: Context, box: readonly [number, number, number, number]): boolean {
    const t = c.getTransform();
    let x0 = Infinity,
        y0 = Infinity,
        x1 = -Infinity,
        y1 = -Infinity;
    for (const [x, y] of [
        [box[0], box[1]],
        [box[2], box[1]],
        [box[0], box[3]],
        [box[2], box[3]],
    ] as const) {
        const px = t.a * x + t.c * y + t.e,
            py = t.b * x + t.d * y + t.f;
        if (px < x0) x0 = px;
        if (px > x1) x1 = px;
        if (py < y0) y0 = py;
        if (py > y1) y1 = py;
    }
    return x1 < 0 || y1 < 0 || x0 > c.canvas.width || y0 > c.canvas.height;
}

const paint = (c: Context, p: Paint): string | CanvasGradient | null => {
    if (p === null || typeof p === "string") return p;
    const g: Gradient = p;
    const made =
        g.r === undefined
            ? c.createLinearGradient(g.x1, g.y1, g.x2, g.y2)
            : c.createRadialGradient(g.x1, g.y1, 0, g.x1, g.y1, g.r);
    for (const s of g.stops) made.addColorStop(Math.min(1, Math.max(0, s.offset)), s.colour);
    return made;
};

/**
 * One node and what is in it. A group with an opacity and more than one thing in it is drawn apart and
 * laid down at its opacity, as SVG composites a group; anything else takes the opacity as it draws.
 */
function draw(c: Context, node: SketchNode, alpha: number, job: RasterJob, inPart: boolean): void {
    if (node.kind === "group") {
        const moving = node.part >= 0;
        if (moving && job.withoutParts) return;
        const within = inPart || (moving && node.part === job.only);
        c.save();
        if (node.m) c.transform(...node.m);
        const apart = (node.alpha < 1 && node.children.length > 1) || !!node.mask || !!node.clip;
        if (apart) {
            const l = take(c.canvas.width, c.canvas.height);
            if (l) {
                l.setTransform(c.getTransform());
                for (const child of node.children) draw(l, child, 1, job, within);
                for (const through of [node.mask, node.clip]) {
                    if (!through) continue;
                    const m = take(c.canvas.width, c.canvas.height);
                    if (m) {
                        m.setTransform(c.getTransform());
                        for (const shape of through) draw(m, shape, 1, job, true);
                        l.save();
                        l.setTransform(1, 0, 0, 1, 0, 0);
                        l.globalCompositeOperation = "destination-in";
                        l.drawImage(m.canvas, 0, 0);
                        l.restore();
                        give(m);
                    }
                }
                c.save();
                c.setTransform(1, 0, 0, 1, 0, 0);
                c.globalAlpha = alpha * node.alpha;
                c.drawImage(l.canvas, 0, 0);
                c.restore();
                give(l);
            }
        } else for (const child of node.children) draw(c, child, alpha * node.alpha, job, within);
        c.restore();
        return;
    }
    // with `only`, nothing outside that part is drawn
    if (job.only !== null && !inPart) return;
    c.save();
    if (node.m) c.transform(...node.m);
    c.globalAlpha = alpha * node.alpha;
    if (node.kind === "text") {
        const fill = paint(c, node.fill);
        if (fill) {
            c.font = node.font;
            c.letterSpacing = node.spacing;
            c.textAlign = node.anchor;
            c.textBaseline = "alphabetic";
            c.fillStyle = fill;
            c.fillText(node.text, node.x, node.y);
            marks++;
        }
        c.restore();
        return;
    }
    if (node.box && outside(c, node.box)) {
        c.restore();
        return;
    }
    marks++;
    const path = new Path2D(node.d);
    const fill = paint(c, node.fill);
    if (fill) {
        c.fillStyle = fill;
        c.fill(path, node.evenOdd ? "evenodd" : "nonzero");
    }
    const stroke = paint(c, node.stroke);
    if (stroke && node.width > 0) {
        c.strokeStyle = stroke;
        c.lineWidth = node.width;
        c.lineCap = node.cap;
        c.lineJoin = node.join;
        c.setLineDash(node.dash);
        c.stroke(path);
    }
    c.restore();
}

/**
 * Whether pixels go to the page as the canvas's bitmap. WebKit takes a bitmap into a texture a hundred
 * times slower than the same pixels as bytes (measured under Playwright's WebKit: 8.6 ms of each frame
 * against 0.09), so there the bytes are read back and sent instead.
 */
const BITMAPS = !(
    /AppleWebKit/.test(navigator.userAgent) && !/Chrome|Chromium|Edg/.test(navigator.userAgent)
);

/** What the stores of kept pixels are named by, before the renderer's version. */
const KEPT = "lumischool-art-";
/**
 * How many drawings are kept on the device, the oldest let go past it: encoded ones are tens of
 * kilobytes, and bytes as WebKit keeps them up to a megabyte, most a tenth of that. WebKit's
 * compression in a worker was too slow to keep up (4 of about 100 drawings in 5 s under Playwright),
 * and the browser's estimate of what an origin holds is not used, since WebKit's counts far more.
 */
const KEPT_MOST = BITMAPS ? 3000 : 400;
const opened = new Map<string, Promise<Cache | null>>();
let puts = 0;
/** The store of kept pixels for a renderer's version, the stores of every other version cleared. */
function keptIn(store: string): Promise<Cache | null> {
    let had = opened.get(store);
    if (!had) {
        had = (async () => {
            if (typeof caches === "undefined") return null;
            // a store is named by its build and its palette; another build's stores are let go
            const build = KEPT + (store.split("~")[0] ?? store) + "~";
            for (const name of await caches.keys())
                if (name.startsWith(KEPT) && !name.startsWith(build)) await caches.delete(name);
            return caches.open(KEPT + store);
        })().catch(() => null);
        opened.set(store, had);
    }
    return had;
}
const keptAt = (key: string): string => `/__art/${encodeURIComponent(key)}`;
/** Keeps a drawing's pixels: encoded, as bytes as the page takes them, or as a box with nothing in it. */
async function keepAs(
    keep: { store: string; key: string },
    body: Blob | ArrayBuffer | null,
): Promise<void> {
    const store = await keptIn(keep.store);
    if (!store) return;
    const kind = body === null ? "empty" : body instanceof Blob ? "drawn" : "bytes";
    await store.put(keptAt(keep.key), new Response(body, { headers: { "x-art": kind } }));
    // every so often what is kept is counted, and the oldest let go past the most kept; the store the
    // tests and the bake keep in development (map-scene.ts) keeps everything
    if (++puts % 32 === 0 && !keep.store.startsWith("dev")) {
        const keys = await store.keys();
        for (const old of keys.slice(0, Math.max(0, keys.length - KEPT_MOST)))
            await store.delete(old);
    }
}

/** How many shapes and words the job being drawn has put down, so a tile with none sends no pixels. */
let marks = 0;

/** The sketches the page has given this worker, by number, as the page's record of them says. */
const sketches = new Map<number, Sketch>();

/**
 * Sends what was kept on the device for a job, and says whether there was anything to send; a copy
 * that will not read is taken as none. A bitmap is decoded premultiplied and as it was drawn, as the
 * canvas's own bitmap is, so a kept drawing and a fresh one look the same.
 */
/** Sends pixels kept as `hit` (bytes, a picture, or a mark of nothing drawn), or says they will not do. */
async function sendKept(
    id: number,
    job: RasterJob,
    hit: Response,
    kind: string | null,
    held: Context[],
): Promise<boolean> {
    if (kind === "empty") {
        self.postMessage({ id, w: job.w, h: job.h, empty: true, cached: true });
        return true;
    }
    if (kind === "bytes") {
        const pixels = await hit.arrayBuffer();
        if (pixels.byteLength !== job.w * job.h * 4) return false;
        self.postMessage({ id, w: job.w, h: job.h, pixels, cached: true }, { transfer: [pixels] });
        return true;
    }
    const bitmap = await createImageBitmap(await hit.blob(), {
        premultiplyAlpha: "premultiply",
        colorSpaceConversion: "none",
    });
    if (bitmap.width !== job.w || bitmap.height !== job.h) {
        bitmap.close();
        return false;
    }
    if (BITMAPS) {
        self.postMessage({ id, w: job.w, h: job.h, bitmap, cached: true }, { transfer: [bitmap] });
        return true;
    }
    const c = take(job.w, job.h);
    if (!c) {
        bitmap.close();
        return false;
    }
    held.push(c);
    c.drawImage(bitmap, 0, 0);
    bitmap.close();
    const pixels = c.getImageData(0, 0, job.w, job.h).data.buffer;
    self.postMessage({ id, w: job.w, h: job.h, pixels, cached: true }, { transfer: [pixels] });
    return true;
}

async function fromKept(
    id: number,
    job: RasterJob,
    keep: { store: string; key: string },
    held: Context[],
): Promise<boolean> {
    try {
        const store = await keptIn(keep.store);
        const at = keptAt(keep.key);
        const hit = await store?.match(at);
        if (!hit || !store) return false;
        // the oldest written go first past the most kept, so a drawing read is written again, once a
        // visit, and what a family comes back to is what is kept
        if (!refreshed.has(at)) {
            refreshed.add(at);
            const again = hit.clone();
            void store
                .delete(at)
                .then(() => store.put(at, again))
                .catch(() => undefined);
        }
        return await sendKept(id, job, hit, hit.headers.get("x-art"), held);
    } catch {
        return false;
    }
}
/** The kept drawings read and written again this visit. */
const refreshed = new Set<string>();

self.onmessage = async (e: MessageEvent<RasterMessage>) => {
    const { id, sketchId, forget } = e.data;
    for (const gone of forget) sketches.delete(gone);
    if (e.data.sketch) sketches.set(sketchId, e.data.sketch);
    const sketch = sketches.get(sketchId);
    if (!sketch) {
        self.postMessage({ id });
        return;
    }
    const job: RasterJob = { ...e.data.job, sketch };
    marks = 0;
    const held: Context[] = [];
    const keep = job.keep;
    try {
        // pixels this device drew on an earlier visit are sent as they were kept; a copy that will not
        // read is treated as none, and the drawing is drawn
        if (keep && (await fromKept(id, job, keep, held))) return;
        await fonts(job.sketch);
        const c = take(job.w, job.h);
        if (!c) throw new Error("No worker canvas");
        held.push(c);
        const sx = job.w / job.box.w,
            sy = job.h / job.box.h;
        const into = (target: Context) => {
            target.setTransform(sx, 0, 0, sy, -job.box.x * sx, -job.box.y * sy);
            for (const node of job.sketch.root) draw(target, node, 1, job, false);
        };
        const glow = job.only === null ? job.sketch.glow : [];
        if (glow.length) {
            // a glow is cast by the drawing as a whole, so it is drawn apart and laid down with each shadow
            const l = take(job.w, job.h);
            if (!l) throw new Error("No worker canvas");
            held.push(l);
            into(l);
            // each shadow is cast by a copy drawn a canvas away, so only the shadows land here
            for (const g of glow) {
                c.save();
                c.shadowColor = g.colour;
                c.shadowBlur = g.blur * job.glowScale;
                c.shadowOffsetX = job.w;
                c.drawImage(l.canvas, -job.w, 0);
                c.restore();
            }
            c.drawImage(l.canvas, 0, 0);
        } else into(c);
        if (!marks) {
            self.postMessage({ id, w: job.w, h: job.h, empty: true });
            if (keep) void keepAs(keep, null).catch(() => undefined);
            return;
        }
        const canvas = c.canvas;
        // the canvas's own bitmap goes to the page as it is, with no reading back and no copy; the canvas
        // is left blank for the next job
        if (
            BITMAPS &&
            canvas instanceof OffscreenCanvas &&
            canvas.width === job.w &&
            canvas.height === job.h
        ) {
            // what is kept on the device is encoded from the pixels as they are when this is asked
            if (keep)
                void canvas
                    .convertToBlob({ type: "image/webp", quality: 1 })
                    .then((blob) => keepAs(keep, blob))
                    .catch(() => undefined);
            const bitmap = canvas.transferToImageBitmap();
            self.postMessage({ id, w: job.w, h: job.h, bitmap }, { transfer: [bitmap] });
            return;
        }
        const read = c.getImageData(0, 0, job.w, job.h);
        // where the page takes bytes it is kept as bytes, a copy of the ones it is sent, which costs a
        // copy rather than an encoding WebKit does slowly and only as PNG, and reads back with no decoding
        if (keep) void keepAs(keep, read.data.buffer.slice(0)).catch(() => undefined);
        const pixels = read.data.buffer;
        self.postMessage({ id, w: job.w, h: job.h, pixels }, { transfer: [pixels] });
    } catch {
        self.postMessage({ id });
    } finally {
        for (const c of held) give(c);
    }
};
