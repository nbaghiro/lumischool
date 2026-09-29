// The land and the sea as the GPU draws them (.docs/overworld-gpu.md): the exported tile pyramid, and
// over it the thin strokes as geometry, the washes as filled shapes, and the masks of what the child's
// map knows and how far its colour has come, which the GPU draws again every frame from the reach.
import { smallDevice } from "./device";
import rough from "roughjs";
import {
    hash,
    intersects,
    visibleRect,
    LIMITS,
    TERRAIN_WASH,
    type Camera,
    type MapReach,
    type MapView,
    type Rect,
    type Size,
} from "../space";
import type { Tokens } from "../paper";
import {
    IDENTITY,
    type GlDraw,
    type GlMask,
    type GlRun,
    type GlShape,
    type GlStrokes,
    type GlTexture,
    type CanvasGl,
    type MaskChannel,
    type MaskShape,
    translation,
} from "./gl";
import { MAP_TILES } from "./map-tile-manifest";
import { tileCoverage, type TileCell as Cell } from "./map-tile-layout";
import {
    isRecord,
    isRect,
    lineDescriptor,
    numbers,
    readTileIndex,
    TILE_LAYERS,
    tileDescriptor,
    type TileLayer,
    type TileDescriptor,
    type TileIndex,
} from "./map-tile-schema";
import { tileImages, type TileLease, type TilePixels } from "./tile-cache";

/**
 * What each layer is seen through: the landscape's marks in pencil only where the colour has not come,
 * as the painter chose a pen for each.
 */
const MASKS: Record<TileLayer, MaskChannel | undefined> = {
    sea: undefined,
    pencil: "known",
    land: "colour",
    colour: "colour",
    "marks-pencil": "pencil",
    "marks-colour": "reached",
    waves: undefined,
};

/**
 * The camera zoom closer than which the finest tiles would show the landscape's marks and waves
 * magnified, so the painter draws them as the camera comes near instead (map.ts); up to 1.3 times it
 * both are drawn, so the one hands over to the other without a gap.
 */
export function landscapeZoom(density: number): number {
    const finest = MAP_TILES.levels[MAP_TILES.levels.length - 1]?.span ?? MAP_TILES.bounds.w;
    return MAP_TILES.tileSize / finest / density;
}

/** The waves drift 22 world units either way, eased there and back over 11 s, as overworld.css has them. */
const DRIFT = { reach: 22, period: 11_000 };
/**
 * How long a frame may spend putting tiles' layers on the GPU, in ms; one layer goes whatever it
 * takes, so a slow device still gets there.
 */
const UPLOADING = 4;
/** How many frames a tile still loading is kept once no view wants it, so a flight's path is not let go of and fetched again. */
const STALE = 60;
/** How much larger each radius a wash's rim is made at is than the last. */
const RIM = 1.25;
/** How long the tiles' marks take to fade as the live landscape takes over from them, in ms. */
const HANDOFF = 150;
function driftAt(now: number): number {
    const u = (now % (2 * DRIFT.period)) / DRIFT.period,
        t = u > 1 ? 2 - u : u;
    const eased = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
    return DRIFT.reach * (2 * eased - 1);
}

let indexRead: Promise<TileIndex> | undefined;
function loadIndex(): Promise<TileIndex> {
    indexRead ??= fetch(`/assets/map-tiles/${MAP_TILES.version}/index.json`, {
        signal: AbortSignal.timeout(20_000),
        cache: "force-cache",
    })
        .then(async (response) => {
            if (!response.ok) throw new Error("Map imagery index is unavailable");
            const index = readTileIndex((await response.json()) as unknown);
            if (index instanceof Error) throw index;
            return index;
        })
        .catch((error: unknown) => {
            indexRead = undefined;
            throw error;
        });
    return indexRead;
}

/** A run's segments as the GPU strokes them, `[ax, ay, bx, by, along]` each. */
interface Run {
    stroke: string;
    width: number;
    dash: number[];
    segments: Float32Array;
    gpu: GlStrokes | null;
}
interface Lines {
    pencil: { alpha: number; runs: Run[] }[];
    colour: { alpha: number; runs: Run[] }[];
}

/** How much of a curve's control polygon each flattened piece stands for, in world units. */
const FLAT = 12;

/**
 * An SVG path's subpaths as straight segments, each with how far along its subpath it starts, since a
 * canvas starts its dash pattern again at every subpath. A curve is cut into a piece for every `FLAT`
 * of its control polygon.
 */
export function segmentsOf(d: string, out: number[] = []): number[] {
    const tokens = d.match(/[MmLlCcZz]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) ?? [];
    let i = 0,
        command = "",
        x = 0,
        y = 0,
        startX = 0,
        startY = 0,
        along = 0;
    const next = (): number => Number(tokens[i++]);
    const line = (tx: number, ty: number): void => {
        if (tx === x && ty === y) return;
        out.push(x, y, tx, ty, along);
        along += Math.hypot(tx - x, ty - y);
        x = tx;
        y = ty;
    };
    while (i < tokens.length) {
        const token = tokens[i] ?? "";
        if (/[A-Za-z]/.test(token)) {
            command = token;
            i++;
            if (command === "Z" || command === "z") {
                line(startX, startY);
                continue;
            }
        }
        const relative = command === command.toLowerCase();
        const ox = relative ? x : 0,
            oy = relative ? y : 0;
        if (command === "M" || command === "m") {
            x = startX = next() + ox;
            y = startY = next() + oy;
            along = 0;
            // further pairs after a move are lines, as SVG reads them
            command = relative ? "l" : "L";
        } else if (command === "L" || command === "l") line(next() + ox, next() + oy);
        else if (command === "C" || command === "c") {
            const x1 = next() + ox,
                y1 = next() + oy,
                x2 = next() + ox,
                y2 = next() + oy,
                x3 = next() + ox,
                y3 = next() + oy;
            const reach =
                Math.hypot(x1 - x, y1 - y) +
                Math.hypot(x2 - x1, y2 - y1) +
                Math.hypot(x3 - x2, y3 - y2);
            const n = Math.max(1, Math.min(64, Math.ceil(reach / FLAT)));
            const x0 = x,
                y0 = y;
            for (let k = 1; k <= n; k++) {
                const t = k / n,
                    u = 1 - t;
                line(
                    u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
                    u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3,
                );
            }
        } else i++;
    }
    return out;
}

/** A chunk's strokes as the GPU draws them, or a problem if the file is not what the exporter writes. */
function readLines(value: unknown): Lines | Error {
    if (!isRecord(value)) return new Error("Map lines are not an object");
    const out: Lines = { pencil: [], colour: [] };
    for (const layer of ["pencil", "colour"] as const) {
        const groups = value[layer];
        if (groups === undefined) continue;
        if (!Array.isArray(groups)) return new Error(`Map lines for ${layer} are not a list`);
        for (const group of groups as unknown[]) {
            if (!isRecord(group) || typeof group.alpha !== "number" || !Array.isArray(group.runs))
                return new Error("A map line group is malformed");
            const runs: Run[] = [];
            for (const run of group.runs as unknown[]) {
                if (
                    !isRecord(run) ||
                    typeof run.stroke !== "string" ||
                    typeof run.width !== "number" ||
                    !numbers(run.dash) ||
                    !Array.isArray(run.parts)
                )
                    return new Error("A map line is malformed");
                const flat: number[] = [];
                for (const part of run.parts as unknown[]) {
                    if (!isRecord(part) || typeof part.d !== "string" || !isRect(part.box))
                        return new Error("A map line's part is malformed");
                    segmentsOf(part.d, flat);
                }
                runs.push({
                    stroke: run.stroke,
                    width: run.width,
                    dash: run.dash,
                    segments: new Float32Array(flat),
                    gpu: null,
                });
            }
            out[layer].push({ alpha: group.alpha, runs });
        }
    }
    return out;
}

function cells(level: number, seen: Rect): Cell[] {
    const span = MAP_TILES.levels[level]?.span ?? MAP_TILES.bounds.w;
    const b = MAP_TILES.bounds;
    const out: Cell[] = [];
    for (
        let y = Math.max(0, Math.floor((seen.y - b.y) / span));
        y < Math.min(Math.ceil(b.h / span), Math.ceil((seen.y + seen.h - b.y) / span));
        y++
    )
        for (
            let x = Math.max(0, Math.floor((seen.x - b.x) / span));
            x < Math.min(Math.ceil(b.w / span), Math.ceil((seen.x + seen.w - b.x) / span));
            x++
        )
            out.push({
                level,
                x,
                y,
                key: `${level}/${x}-${y}`,
                rect: { x: b.x + x * span, y: b.y + y * span, w: span, h: span },
            });
    return out;
}

const grown = (r: Rect, by: number): Rect => ({
    x: r.x - r.w * by,
    y: r.y - r.h * by,
    w: r.w * (1 + 2 * by),
    h: r.h * (1 + 2 * by),
});

/** A layer as a texture shared by its file's address, holding its decoded image until it is one. */
type Layer = { url: string; image?: TilePixels } | { solid: readonly number[] } | { empty: true };

/**
 * What the tiles may hold on the GPU, mipmaps included, before the least recently drawn are let go;
 * a tile's image is dropped as soon as it is a texture, so this is all the tiles hold.
 */
const TEXTURES = (smallDevice ? 64 : 160) * 1024 * 1024;
/** What one view's tiles may take of that: a large desktop window at the finest level needs about this. */
const VIEW = 0.6;

interface Chunk {
    rect: Rect;
    lines: Lines | null;
    users: number;
    fetching: AbortController;
    ready: Promise<void>;
}
interface Held {
    leases: TileLease<TilePixels>[];
    chunks: string[];
    layers: Layer[] | null;
    failed: boolean;
    ready: Promise<void>;
    /** The frame it was last drawn in. */
    drawn: number;
    /** The frame it was last wanted in, for the view, a flight ahead, or to stand in. */
    wanted: number;
}

export interface Terrain {
    /**
     * What lies under everything else for this camera, in drawing order, the masks they are seen
     * through, and how many milliseconds on the waves will have drifted far enough to draw again;
     * with `ahead`, where the camera is flying to, the tiles it will want there asked for as the
     * flight begins.
     */
    draws(
        camera: Camera,
        size: Size,
        density: number,
        ahead?: Camera | null,
        /** Whether the drawings over the terrain are still being drawn, when its marks stay until they are. */
        drawing?: boolean,
    ): { draws: GlDraw[]; mask: GlMask; again: number | null };
    setReach(reach: MapReach): void;
    /** Whether the last frame drew every tile it wanted at the level it wanted. */
    complete(): boolean;
    /**
     * Lets go of every tile but the ones that stand in for the rest and the last view's, while the map
     * waits off the page; with `bare`, the last view's too.
     */
    park(bare?: boolean): void;
    stop(): void;
}

/**
 * The terrain for one map. It waits for the index and the root tile, so the first frame has land; the
 * finer tiles and the strokes come in as they load, each asking for another frame through `wake`.
 */
export async function terrain(o: {
    gl: CanvasGl;
    view: MapView;
    tokens: Tokens;
    wake: () => void;
    /** Nothing drifts, under reduced motion and on a map drawn still. */
    still: boolean;
    signal?: AbortSignal;
}): Promise<Terrain> {
    const { gl, view, tokens } = o;
    const index = await loadIndex();
    o.signal?.throwIfAborted();
    for (const key of ["x", "y", "w", "h"] as const)
        if (MAP_TILES.bounds[key] !== view.country.bounds[key])
            throw new Error("Map imagery does not match this world layout");
    const descriptor = (cell: Cell): TileDescriptor[] =>
        TILE_LAYERS.map((part) => {
            const result = tileDescriptor(index, cell.level, cell.x, cell.y, part);
            if (!result) throw new Error("Map imagery is incomplete");
            return result;
        });
    const url = (path: string): string => `/assets/map-tiles/${MAP_TILES.version}/${path}`;
    const requestsFor = (wanted: Cell[]): { url: string; bytes: number }[] => {
        const unique = new Map<string, number>();
        for (const cell of wanted)
            for (const layer of descriptor(cell))
                if (layer.kind === "image") unique.set(url(layer.path), layer.bytes);
        return [...unique].map(([u, bytes]) => ({ url: u, bytes }));
    };

    let disposed = false,
        level = 0,
        retry = 0,
        reach = view.reach;
    const owned = new Map<string, Held>();
    const attempts = new Map<string, number>();
    const locations = new Map<string, Cell>();
    const chunks = new Map<string, Chunk>();
    const bleed = index.lines.bleed;
    const bled = (r: Rect): Rect => ({
        x: r.x - bleed,
        y: r.y - bleed,
        w: r.w + 2 * bleed,
        h: r.h + 2 * bleed,
    });
    const chunksOver = (rect: Rect): Cell[] =>
        cells(index.lines.level, bled(rect)).filter(
            (c) => lineDescriptor(index, c.level, c.x, c.y)?.kind === "lines",
        );
    const claim = (cell: Cell): string => {
        const had = chunks.get(cell.key);
        if (had) {
            had.users++;
            return cell.key;
        }
        const d = lineDescriptor(index, cell.level, cell.x, cell.y);
        if (d?.kind !== "lines") throw new Error("Map lines are incomplete");
        const fetching = new AbortController();
        const chunk: Chunk = {
            rect: bled(cell.rect),
            lines: null,
            users: 1,
            fetching,
            ready: Promise.resolve(),
        };
        chunk.ready = fetch(url(d.path), { signal: fetching.signal, cache: "force-cache" }).then(
            async (response) => {
                if (!response.ok) throw new Error("Map lines are unavailable");
                const lines = readLines((await response.json()) as unknown);
                if (lines instanceof Error) throw lines;
                chunk.lines = lines;
                o.wake();
            },
        );
        void chunk.ready.catch(() => undefined);
        chunks.set(cell.key, chunk);
        return cell.key;
    };
    const unclaim = (key: string): void => {
        const chunk = chunks.get(key);
        if (!chunk || --chunk.users > 0) return;
        chunk.fetching.abort();
        chunks.delete(key);
    };

    // identical tiles are one file, and so one texture, however many cells draw it
    const textures = new Map<string, { texture: GlTexture; users: number }>();
    let frames = 0;
    const held = (): number => [...textures.values()].reduce((sum, t) => sum + t.texture.bytes, 0);
    const solids = new Map<string, GlTexture>();
    const scratch = document.createElement("canvas");
    const solid = (rgba: readonly number[]): GlTexture | null => {
        const key = rgba.join(",");
        const had = solids.get(key);
        if (had && gl.live(had)) return had;
        scratch.width = scratch.height = 1;
        const c = scratch.getContext("2d");
        if (!c) return null;
        c.clearRect(0, 0, 1, 1);
        c.fillStyle = `rgba(${rgba[0] ?? 0},${rgba[1] ?? 0},${rgba[2] ?? 0},${(rgba[3] ?? 0) / 255})`;
        c.fillRect(0, 0, 1, 1);
        const t = gl.upload(scratch, 1, 1);
        if (t) solids.set(key, t);
        return t;
    };
    const share = (url: string, image: TilePixels): boolean => {
        const had = textures.get(url);
        if (had && gl.live(had.texture)) {
            had.users++;
            return true;
        }
        const texture = gl.upload(image, image.width, image.height);
        if (!texture) return false;
        textures.set(url, { texture, users: had ? had.users + 1 : 1 });
        return true;
    };
    const unshare = (url: string): void => {
        const had = textures.get(url);
        if (!had || --had.users > 0) return;
        gl.release(had.texture);
        textures.delete(url);
    };

    /** Whether every layer of a tile is on the GPU. */
    const uploaded = (entry: Held): boolean =>
        !!entry.layers && entry.layers.every((layer) => !("url" in layer) || !layer.image);
    /**
     * Makes a loaded tile's images textures as it is first drawn, and lets the decoded copies go once
     * they all are; while the GPU is lost it waits, and tries again on a later frame.
     */
    const settle = (entry: Held, until = Infinity): boolean => {
        if (!entry.layers) return false;
        for (const layer of entry.layers) {
            if (!("url" in layer) || !layer.image) continue;
            if (performance.now() > until) return false;
            if (!share(layer.url, layer.image)) return false;
            delete layer.image;
        }
        if (entry.leases.length) {
            entry.leases.forEach((lease) => lease.release());
            entry.leases = [];
        }
        return true;
    };

    const acquire = (cell: Cell, priority: number): Held | null => {
        locations.set(cell.key, cell);
        const existing = owned.get(cell.key);
        if (existing) return existing;
        if ((attempts.get(cell.key) ?? 0) >= 3) return null;
        if (!tileImages.canAcquire(requestsFor([cell]))) return null;
        const leases: TileLease<TilePixels>[] = [];
        const layers: Promise<Layer>[] = [];
        for (const layer of descriptor(cell)) {
            if (layer.kind === "empty" || layer.kind === "lines")
                layers.push(Promise.resolve({ empty: true }));
            else if (layer.kind === "solid") layers.push(Promise.resolve({ solid: layer.rgba }));
            else {
                const path = url(layer.path);
                const lease = tileImages.acquire(path, layer.bytes, priority);
                if (!lease) {
                    for (const got of leases) got.release();
                    return null;
                }
                leases.push(lease);
                layers.push(lease.ready.then((image): Layer => ({ url: path, image })));
            }
        }
        // every raster but the root leaves the thin strokes out, so it waits for the strokes it shows
        const needed = cell.level ? chunksOver(cell.rect) : [];
        const entry: Held = {
            leases,
            chunks: needed.map(claim),
            layers: null,
            failed: false,
            ready: Promise.resolve(),
            drawn: frames,
            wanted: frames,
        };
        owned.set(cell.key, entry);
        const strokes = entry.chunks.map(
            (key) => chunks.get(key)?.ready ?? Promise.reject(new Error("Map lines are missing")),
        );
        entry.ready = Promise.all([Promise.all(layers), Promise.all(strokes)]).then(([done]) => {
            if (disposed || owned.get(cell.key) !== entry) return;
            entry.layers = done;
            attempts.delete(cell.key);
            o.wake();
        });
        void entry.ready.catch(() => {
            entry.failed = true;
            attempts.set(cell.key, (attempts.get(cell.key) ?? 0) + 1);
            if (!disposed && !retry)
                retry = window.setTimeout(() => {
                    retry = 0;
                    for (const [key, item] of owned) if (item.failed) remove(key);
                    o.wake();
                }, 30_000);
        });
        return entry;
    };
    const remove = (key: string): void => {
        const entry = owned.get(key);
        if (!entry) return;
        for (const layer of entry.layers ?? [])
            if ("url" in layer && !layer.image) unshare(layer.url);
        entry.leases.forEach((lease) => lease.release());
        entry.chunks.forEach(unclaim);
        owned.delete(key);
        locations.delete(key);
    };

    const root = cells(0, MAP_TILES.bounds)[0];
    if (!root) throw new Error("Map tile manifest has no coverage");
    const coarse: Cell = root;
    const first = acquire(coarse, 100);
    if (!first) throw new Error("Map imagery is busy; try again");
    try {
        await first.ready;
        o.signal?.throwIfAborted();
    } catch (error) {
        disposed = true;
        for (const key of owned.keys()) remove(key);
        throw error;
    }
    // the root has the coast's strokes in it, which magnified are dark blurs, so what stands in for a
    // tile still loading is the first level down, which has none and is kept for as long as the map is
    const resident = cells(1, MAP_TILES.bounds);
    const residentKeys = new Set(resident.map((c) => c.key));
    for (const cell of resident) acquire(cell, 90);
    /** How much of the tiles' marks shows, and when it was last worked out, as the live landscape takes over. */
    let marksShown = 1,
        marksAt = 0;
    /** The tiles the last frame wanted, which a map parked off the page keeps. */
    let lastWant = new Set<string>();
    /** The level a camera at `scale` wants over `over`, without the hysteresis the camera's own level has. */
    const levelFor = (scale: number, over: Rect): number => {
        let at = 0;
        while (
            at < MAP_TILES.levels.length - 1 &&
            scale > (MAP_TILES.tileSize / (MAP_TILES.levels[at]?.span ?? 1)) * 1.3
        )
            at++;
        while (
            at > 0 &&
            requestsFor(cells(at, over)).reduce((sum, r) => sum + (r.bytes * 4) / 3, 0) >
                TEXTURES * VIEW
        )
            at--;
        return at;
    };
    const unsubscribe = tileImages.subscribe(o.wake);

    // what the child's map knows and how far the colour has come, as the page's masks drew them
    const generator = rough.generator();
    const rims = new Map<
        string,
        { segments: Float32Array; width: number; gpu: GlStrokes | null }[]
    >();
    let rimsUsed = new Set<string>();
    const shapes = new WeakMap<readonly { x: number; y: number }[], GlShape>();
    const shapeOf = (points: readonly { x: number; y: number }[]): GlShape | null => {
        const had = shapes.get(points);
        if (had && gl.live(had)) return had;
        const made = gl.shape(
            new Float32Array(points.flatMap((p) => [Math.round(p.x), Math.round(p.y)])),
        );
        if (made) shapes.set(points, made);
        return made;
    };
    const strokesOf = (run: {
        segments: Float32Array;
        gpu: GlStrokes | null;
    }): GlStrokes | null => {
        if (run.gpu && gl.live(run.gpu)) return run.gpu;
        run.gpu = gl.strokes(run.segments);
        return run.gpu;
    };
    /**
     * The rough rim round a circle the colour has reached, made at the next of a set of radii a quarter
     * apart and drawn shrunk to the circle's own, so a wash growing is not hatched again every frame.
     */
    const hatch = (c: { x: number; y: number; r: number }) => {
        const r = RIM ** Math.ceil(Math.log(Math.max(c.r, 1)) / Math.log(RIM));
        const key = `${Math.round(c.x / 10)},${Math.round(c.y / 10)},${Math.round(r)}`;
        rimsUsed.add(key);
        const had = rims.get(key);
        if (had) return { made: had, f: c.r / r };
        const made = generator
            .toPaths(
                generator.circle(c.x, c.y, r * 2, {
                    seed: (hash(key) % 9999) + 1,
                    roughness: 2.2,
                    bowing: 1,
                    stroke: "none",
                    fill: "#fff",
                    fillStyle: "hachure",
                    hachureGap: 46,
                    fillWeight: 24,
                    hachureAngle: -41,
                }),
            )
            .map((p) => ({
                segments: new Float32Array(segmentsOf(p.d)),
                width: p.strokeWidth,
                gpu: null,
            }));
        rims.set(key, made);
        return { made, f: c.r / r };
    };
    const mask = (seen: Rect): GlMask => {
        const near = (k: { x: number; y: number; r: number }) =>
            intersects({ x: k.x - k.r, y: k.y - k.r, w: k.r * 2, h: k.r * 2 }, seen);
        const wholes: MaskShape[] = reach.whole.flatMap((ring) => {
            const shape = shapeOf(ring);
            return shape ? [{ kind: "fill" as const, shape }] : [];
        });
        const known: MaskShape[] | null = reach.known
            ? [
                  ...reach.known
                      .filter((k) => k.r > 0 && near(k))
                      .map((k) => ({ kind: "disc" as const, x: k.x, y: k.y, r: k.r, soft: 0.72 })),
                  ...wholes,
              ]
            : null;
        rimsUsed = new Set();
        const colour: MaskShape[] = [];
        // what the colour has reached, without its rim: the painter's rule for the landscape's pen
        const reached: MaskShape[] = [];
        for (const k of reach.circles) {
            if (!near(k)) continue;
            const disc = {
                kind: "disc" as const,
                x: k.x,
                y: k.y,
                r: Math.max(0, k.r * 0.8),
                soft: 1,
            };
            colour.push(disc);
            reached.push(disc);
            const { made, f } = hatch(k);
            for (const rim of made) {
                const strokes = strokesOf(rim);
                if (strokes)
                    colour.push({
                        kind: "strokes",
                        strokes,
                        width: rim.width,
                        grow: { f, x: k.x, y: k.y },
                    });
            }
        }
        for (const [key, made] of rims)
            if (!rimsUsed.has(key)) {
                for (const rim of made) if (rim.gpu) gl.release(rim.gpu);
                rims.delete(key);
            }
        colour.push(...wholes);
        reached.push(...wholes);
        for (const isle of view.country.isles)
            if (!reach.isles.includes(isle.node)) {
                const shape = shapeOf(isle.outline);
                if (shape) {
                    colour.push({ kind: "cut", shape });
                    reached.push({ kind: "cut", shape });
                }
            }
        return { known, colour, reached };
    };
    const washes = (): GlDraw[] => [
        ...view.country.patches.flatMap((patch): GlDraw[] => {
            const shape = shapeOf(patch.outline);
            return shape
                ? [
                      {
                          kind: "fill",
                          shape,
                          colour: tokens[patch.marker],
                          alpha: LIMITS.washCap * TERRAIN_WASH.patch,
                          mask: "colour",
                      },
                  ]
                : [];
        }),
        ...view.country.isles.flatMap((isle): GlDraw[] => {
            const shape = shapeOf(isle.outline);
            return shape
                ? [
                      {
                          kind: "fill",
                          shape,
                          colour: tokens.glow,
                          alpha: LIMITS.washCap * TERRAIN_WASH.isle,
                          mask: "colour",
                      },
                  ]
                : [];
        }),
    ];
    // the same fades as the raster's edge masks: nothing at the bounds, whole from the inner rect in
    const fade = { outer: view.country.bounds, inner: index.lines.inner };
    /** A layer's strokes over what is seen, a group to each alpha, as SVG composites them. */
    const strokes = (layer: "pencil" | "colour", seen: Rect): GlDraw[] => {
        const groups = new Map<number, GlRun[]>();
        for (const chunk of chunks.values()) {
            if (!chunk.lines || !intersects(chunk.rect, seen)) continue;
            for (const group of chunk.lines[layer]) {
                const runs = groups.get(group.alpha) ?? [];
                groups.set(group.alpha, runs);
                for (const run of group.runs) {
                    const gpu = strokesOf(run);
                    if (gpu)
                        runs.push({
                            strokes: gpu,
                            colour: run.stroke,
                            width: run.width,
                            dash: run.dash,
                        });
                }
            }
        }
        return [...groups].map(([alpha, runs]) => ({
            kind: "strokes",
            runs,
            alpha,
            mask: layer === "pencil" ? "known" : "colour",
            fade,
        }));
    };
    let covered = false;

    return {
        complete: () => covered,
        draws(camera, size, density, ahead, drawing) {
            if (disposed || camera.z <= 0 || size.w <= 0 || size.h <= 0)
                return { draws: [], mask: { known: null, colour: [], reached: [] }, again: null };
            const aheadKeys = new Set<string>();
            if (ahead && ahead.z > 0) {
                // just behind what the camera wants now, so the view it is in comes first
                const there = grown(visibleRect(ahead, size), 0.1);
                for (const cell of cells(levelFor(ahead.z * density, there), there)) {
                    acquire(cell, 9);
                    aheadKeys.add(cell.key);
                }
            }
            const seen = visibleRect(camera, size);
            const wanted = grown(seen, 0.1);
            const scale = camera.z * density;
            let next = level;
            while (
                next < MAP_TILES.levels.length - 1 &&
                scale > (MAP_TILES.tileSize / (MAP_TILES.levels[next]?.span ?? 1)) * 1.3
            )
                next++;
            while (
                next > 0 &&
                scale < (MAP_TILES.tileSize / (MAP_TILES.levels[next - 1]?.span ?? 1)) * 0.85
            )
                next--;
            // a level whose textures would take more than the view's share of the budget is too fine for it
            while (
                next > 0 &&
                requestsFor(cells(next, wanted)).reduce((sum, r) => sum + (r.bytes * 4) / 3, 0) >
                    TEXTURES * VIEW
            )
                next--;
            level = next;
            const want = cells(level, wanted),
                wantKeys = new Set(want.map((c) => c.key));
            lastWant = wantKeys;
            for (const cell of want) acquire(cell, 10);
            // what the camera has left before it came is let go of, loaded or not, so nothing is fetched
            // or put on the GPU for a view that has gone; what stands in for the rest stays
            const keeps = (key: string): boolean =>
                wantKeys.has(key) ||
                aheadKeys.has(key) ||
                key === coarse.key ||
                residentKeys.has(key);
            for (const [key, entry] of owned)
                if (keeps(key)) entry.wanted = frames;
                else if (frames - entry.wanted > STALE && !(entry.layers && uploaded(entry)))
                    remove(key);
            // a few layers go to the GPU a frame, those in view first, and a tile still waiting to is
            // stood in for by what is there already, so no frame is held up uploading them all at once
            const until = performance.now() + UPLOADING;
            const first = (key: string): number =>
                key === coarse.key ? 3 : wantKeys.has(key) ? 2 : residentKeys.has(key) ? 1 : 0;
            const waiting = [...owned].filter(([, entry]) => entry.layers && !uploaded(entry));
            if (waiting.length > 1) waiting.sort((a, b) => first(b[0]) - first(a[0]));
            let started = false;
            for (const [, entry] of waiting) {
                // the first layer goes whatever the time, so a slow frame still makes headway
                if (!settle(entry, started ? until : Infinity) && performance.now() > until) {
                    o.wake();
                    break;
                }
                started = true;
            }
            const available = [...owned].flatMap(([key, entry]) => {
                const cell = entry.layers && uploaded(entry) ? locations.get(key) : undefined;
                return cell ? [cell] : [];
            });
            const regions = tileCoverage(want, available, coarse, seen);
            covered = want.every((cell) => {
                const entry = owned.get(cell.key);
                return !!entry && uploaded(entry);
            });
            const used = new Set([coarse.key, ...resident.map((c) => c.key)]);
            const layered = new Map<TileLayer, GlDraw[]>(TILE_LAYERS.map((l) => [l, []]));
            // far out a drift is under a pixel, so the waves rest there as the page's did
            const drifting = !o.still && camera.z * DRIFT.reach >= 1;
            const drift = drifting ? translation(driftAt(performance.now()), 0) : IDENTITY;
            frames++;
            // close in, the live landscape takes over from the marks in the tiles; they stay until what
            // is in view has been drawn, then fade out, so there is no moment with neither
            const now = performance.now();
            const close = camera.z > landscapeZoom(density) * 1.3;
            const aim = close && !drawing ? 0 : 1;
            marksShown =
                o.still || !marksAt
                    ? aim
                    : aim > marksShown
                      ? Math.min(aim, marksShown + (now - marksAt) / HANDOFF)
                      : Math.max(aim, marksShown - (now - marksAt) / HANDOFF);
            marksAt = now;
            const lost = new Set<string>();
            for (const region of regions) {
                const entry = owned.get(region.source.key);
                if (!entry?.layers || !settle(entry)) continue;
                used.add(region.source.key);
                entry.drawn = frames;
                const s = region.source.rect,
                    gutter = (s.w * MAP_TILES.gutter) / MAP_TILES.tileSize,
                    full = s.w + 2 * gutter;
                const source = {
                    x: (region.rect.x - (s.x - gutter)) / full,
                    y: (region.rect.y - (s.y - gutter)) / full,
                    w: region.rect.w / full,
                    h: region.rect.h / full,
                };
                // standing in closer than its own zoom the root keeps only its fills
                const fills = region.source.level === 0 && level > 0;
                entry.layers.forEach((layer, i) => {
                    const name = TILE_LAYERS[i];
                    if (!name || (fills && name !== "sea" && name !== "land")) return;
                    const marks = name.startsWith("marks") || name === "waves";
                    if (marks && marksShown <= 0) return;
                    const shared = "url" in layer ? textures.get(layer.url)?.texture : undefined;
                    // a lost context took the tile's textures, so it is fetched again
                    if (shared && !gl.live(shared)) lost.add(region.source.key);
                    const texture = shared ?? ("solid" in layer ? solid(layer.solid) : null);
                    if (!texture || lost.has(region.source.key)) return;
                    layered.get(name)?.push({
                        kind: "image",
                        texture,
                        rect: region.rect,
                        at: name === "waves" ? drift : IDENTITY,
                        source: "url" in layer ? source : undefined,
                        alpha: marks ? marksShown : 1,
                        mask: MASKS[name],
                        // soft ink out past the colour and ink within it, as the painter drew them
                        tint:
                            name === "waves"
                                ? { from: tokens["ink-soft"], to: tokens.ink }
                                : undefined,
                    });
                });
            }
            const layer = (name: TileLayer): GlDraw[] => layered.get(name) ?? [];
            const out = [
                ...layer("sea"),
                ...layer("pencil"),
                ...strokes("pencil", seen),
                ...layer("land"),
                ...washes(),
                ...layer("colour"),
                ...strokes("colour", seen),
                ...layer("waves"),
                ...layer("marks-colour"),
                ...layer("marks-pencil"),
            ];
            let freed = lost.size > 0;
            for (const key of lost) remove(key);
            // what stands in for the rest is taken up again, as it was when the map was first drawn
            if (lost.has(coarse.key)) acquire(coarse, 100);
            for (const cell of resident) if (lost.has(cell.key)) acquire(cell, 90);
            // tiles are kept as the camera moves on, and over the budget what was drawn longest ago goes
            if (held() > TEXTURES)
                for (const [key] of [...owned]
                    .filter(([k, e]) => e.drawn < frames && !wantKeys.has(k) && !used.has(k))
                    .sort((a, b) => a[1].drawn - b[1].drawn)) {
                    if (held() <= TEXTURES) break;
                    remove(key);
                    freed = true;
                }
            if (freed) o.wake();
            // the eased drift is at its quickest three times its average; half a device pixel of it takes this long
            const fastest = (3 * 2 * DRIFT.reach) / DRIFT.period;
            const settling = marksShown !== (close && !drawing ? 0 : 1);
            const again = settling
                ? 16
                : drifting
                  ? Math.max(16, 0.5 / (fastest * camera.z * density))
                  : null;
            return { draws: out, mask: mask(seen), again };
        },
        setReach(next) {
            reach = next;
            o.wake();
        },
        park(bare) {
            // the view it was left at comes back with it, so a map taken up again is sharp at once
            const kept = new Set([coarse.key, ...residentKeys, ...(bare ? [] : lastWant)]);
            for (const key of owned.keys()) if (!kept.has(key)) remove(key);
        },
        stop() {
            disposed = true;
            unsubscribe();
            clearTimeout(retry);
            for (const key of owned.keys()) remove(key);
            for (const t of solids.values()) gl.release(t);
            solids.clear();
            for (const made of rims.values())
                for (const rim of made) if (rim.gpu) gl.release(rim.gpu);
            rims.clear();
            for (const chunk of chunks.values())
                for (const layer of [chunk.lines?.pencil ?? [], chunk.lines?.colour ?? []])
                    for (const group of layer)
                        for (const run of group.runs) if (run.gpu) gl.release(run.gpu);
        },
    };
}
