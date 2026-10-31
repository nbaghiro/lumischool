import { canvasGl, IDENTITY, type GlImage } from "../../../engine/ui/gl";

declare global {
    interface Window {
        renderingProbe(): { samples: number[][]; errors: number[] };
    }
}

window.renderingProbe = () => {
    const canvas = document.createElement("canvas");
    const renderer = canvasGl(canvas, () => {});
    const native = canvas.getContext("webgl2");
    if (!native) throw new Error("WebGL2 unavailable");
    const red = renderer.upload(
        new ImageData(new Uint8ClampedArray([255, 0, 0, 128]), 1, 1),
        1,
        1,
        false,
    );
    const blue = renderer.upload(
        new ImageData(new Uint8ClampedArray([0, 0, 255, 128]), 1, 1),
        1,
        1,
        false,
    );
    if (!red || !blue) throw new Error("Texture upload failed");
    const rect = { x: 0, y: 0, w: 64, h: 64 };
    const old: GlImage = { kind: "image", texture: red, rect, at: IDENTITY, alpha: 1 };
    const next: GlImage = { ...old, texture: blue };
    const stroke = renderer.strokes(new Float32Array([0, 32, 64, 32, 0]));
    if (!stroke) throw new Error("Stroke upload failed");
    const camera = { x: 32, y: 32, z: 1 };
    const size = { w: 64, h: 64 };
    const samples: number[][] = [],
        errors: number[] = [];
    const read = () => {
        const pixel = new Uint8Array(4);
        native.readPixels(32, 32, 1, 1, native.RGBA, native.UNSIGNED_BYTE, pixel);
        samples.push([...pixel]);
        errors.push(native.getError());
    };
    try {
        for (const mix of [0, 0.25, 0.5, 0.75, 1]) {
            renderer.draw(camera, size, {
                draws: [{ ...next, previous: { texture: red, rect, mix } }],
            });
            read();
            renderer.draw(camera, size, {
                draws: [
                    {
                        kind: "region",
                        rect: { x: 17, y: 7, w: 30, h: 40 },
                        from: [old],
                        to: [next],
                        mix,
                    },
                ],
            });
            read();
            renderer.draw(camera, size, {
                draws: [
                    {
                        kind: "region",
                        rect: { x: 17, y: 7, w: 30, h: 40 },
                        from: [old],
                        to: [
                            {
                                kind: "strokes",
                                runs: [{ strokes: stroke, colour: "#0000ff", width: 64, dash: [] }],
                                alpha: 128 / 255,
                            },
                        ],
                        mix,
                    },
                ],
            });
            read();
        }
        renderer.draw(camera, size, {
            draws: [{ kind: "region", rect, from: [old, old], to: [next], mix: 0.5 }],
        });
        read();
        return { samples, errors };
    } finally {
        renderer.stop();
    }
};

import { claim, hold } from "../../../engine/ui/handoff";
import { rasterize, type Sketch } from "../../../engine/ui/sprites";
import { decode } from "../../../engine/ui/tile-cache";

declare global {
    interface Window {
        handoffProbe(): boolean[];
        rasterProbe(): Promise<boolean>;
        decodeProbe(): Promise<boolean>;
        probeWorkers: Worker[];
    }
}
window.handoffProbe = () => {
    const el = document.createElement("div");
    el.style.cssText = "width:100px;height:100px";
    document.body.append(el);
    let first = 0,
        second = 0;
    hold(el, "map", () => first++);
    const a = claim();
    hold(el, "roll", () => second++);
    const b = claim();
    const stale = a?.release(false) ?? true;
    const current = b?.release(false) ?? false;
    const repeated = b?.release(false) ?? true;
    el.remove();
    return [!stale, current, !repeated, first === 1, second === 1];
};
const sketch: Sketch = {
    box: { x: 0, y: 0, w: 16, h: 16 },
    root: [
        {
            kind: "path",
            d: "M0 0L16 0L16 16L0 16Z",
            fill: "#ff0000",
            evenOdd: false,
            stroke: null,
            width: 0,
            cap: "butt",
            join: "miter",
            dash: [],
            alpha: 1,
            m: null,
        },
    ],
    parts: 0,
    partBoxes: [],
    glow: [],
    fonts: [],
};
window.rasterProbe = async () => {
    const got = await rasterize({
        sketch,
        box: sketch.box,
        w: 16,
        h: 16,
        only: null,
        withoutParts: false,
        glowScale: 1,
    });
    const valid = !!got?.pixels && got.w === 16 && got.h === 16;
    if (got?.pixels instanceof ImageBitmap) got.pixels.close();
    return valid;
};
window.decodeProbe = async () => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 16;
    const blob = await new Promise<Blob | null>((done) => canvas.toBlob(done));
    if (!blob) throw new Error("PNG unavailable");
    try {
        const pixels = await decode(blob);
        const valid = pixels.width === 16 && pixels.height === 16;
        if (pixels instanceof ImageBitmap) pixels.close();
        return valid;
    } catch {
        return false;
    }
};

import { resourceBudget } from "../../../engine/ui/render-memory";
declare global {
    interface Window {
        allocationProbe(): boolean[];
    }
}
window.allocationProbe = () => {
    const budget = resourceBudget(8);
    const owner = budget.owner(() => {});
    const canvas = document.createElement("canvas");
    const renderer = canvasGl(canvas, () => {}, owner);
    const old = renderer.upload(new ImageData(1, 1), 1, 1, false);
    const replacement = renderer.upload(new ImageData(2, 2), 2, 2, false);
    const result = [
        !!old,
        replacement === null,
        !!old && renderer.live(old),
        budget.stats().bytes === 4,
    ];
    renderer.stop();
    owner.stop();
    result.push(budget.stats().bytes === 0);
    return result;
};
