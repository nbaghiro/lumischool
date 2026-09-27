// Draws a drawing's display list (sprites.ts) with a canvas of the worker's own and posts its pixels
// back, so rasterising never runs on the page's thread.
import type { Gradient, Paint, RasterJob, Sketch, SketchNode } from "./sprites";

type Context = OffscreenCanvasRenderingContext2D;

// A canvas's pixels are freed only when the worker collects it, which WebKit does long after a phone
// has run out of memory, so every canvas here is taken from this pool and shrunk to nothing when given back.
const spare: OffscreenCanvas[] = [];
function take(w: number, h: number): Context | null {
    const canvas = spare.pop() ?? new OffscreenCanvas(1, 1);
    canvas.width = w;
    canvas.height = h;
    return canvas.getContext("2d");
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
                had = face
                    .load()
                    .then((done) => {
                        faces?.add(done);
                    })
                    .catch(() => undefined);
                loaded.set(f.url, had);
            }
            return had;
        }),
    );
}

const paint = (c: Context, p: Paint): string | CanvasGradient | null => {
    if (p === null || typeof p === "string") return p;
    const g: Gradient = p;
    const made = c.createLinearGradient(g.x1, g.y1, g.x2, g.y2);
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
        const apart = node.alpha < 1 && node.children.length > 1;
        if (apart) {
            const l = take(c.canvas.width, c.canvas.height);
            if (l) {
                l.setTransform(c.getTransform());
                for (const child of node.children) draw(l, child, 1, job, within);
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
        }
        c.restore();
        return;
    }
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

self.onmessage = async (e: MessageEvent<{ id: number; job: RasterJob }>) => {
    const { id, job } = e.data;
    const held: Context[] = [];
    try {
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
        const pixels = c.getImageData(0, 0, job.w, job.h).data.buffer;
        self.postMessage({ id, w: job.w, h: job.h, pixels }, { transfer: [pixels] });
    } catch {
        self.postMessage({ id });
    } finally {
        for (const c of held) give(c);
    }
};
