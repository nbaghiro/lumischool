// The variations of Charlie's dollhouse, and the hands that build each one. A variation changes a
// job's numbers: the squares a room should have, the pieces and the coins, the rooms compared. Each
// is proven buildable before a child is given it, by planning the rooms and pieces that meet it and
// then playing that plan through the real game, either by the finger (a room dragged up from the
// drawer into its slot and stretched by its handle, then the switch tapped to decorate, the room
// tapped to look inside and a piece dragged in from its chip) or by the keys (the same, with the
// highlight stepped to each card, tab, chip and room, and B and D for the switch).
import { boxOf, floorLine } from "../../engine/motion/house";
import { emptyPad, type Dir, type Pad } from "../../engine/motion/pad";
import type { Pt } from "../../engine/motion/geometry";
import { FURNITURE, type Furniture } from "../../engine/parts/home/furniture";
import {
    CASTS,
    DOLL_LEVELS,
    PLOT,
    PRICE,
    ROOM_KINDS,
    MODE_AT,
    ROOM_TAB,
    SHOP_ITEMS,
    TABS,
    TAB_ITEMS,
    chipAt,
    command,
    goalOf,
    sizeOf,
    startDoll,
    step,
    targets,
    tabAt,
    trayAt,
    worldOf,
    type Ask,
    type DollLevel,
    type DollState,
    type Mode,
    type RoomKind,
    type Tab,
    type Target,
} from "./dollhouse";
import { ROOM_FLOOR } from "../../engine/parts/home/dollroom";

export interface DollConfiguration {
    phase: number;
    variant: number;
}

/** The asks each job can be given, the first being the authored one. */
const VARIANTS: Partial<Record<Ask["kind"], Ask[]>> = {
    bed: (["picture", "shelf", "rug"] as const).map((thing): Ask => ({ kind: "bed", with: thing })),
    area: [15, 9, 18, 6].map((area): Ask => ({ kind: "area", room: "bedroom", area })),
    upstairs: (["bedroom", "attic", "bathroom"] as const).map((room): Ask => ({
        kind: "upstairs",
        room,
    })),
    furnish: [
        {
            kind: "furnish",
            room: "kitchen",
            items: ["table", "chair", "chair", "fridge"],
            most: 20,
        },
        { kind: "furnish", room: "kitchen", items: ["cooker", "fridge", "table"], most: 23 },
        { kind: "furnish", room: "kitchen", items: ["table", "chair", "chair", "chair"], most: 15 },
        {
            kind: "furnish",
            room: "kitchen",
            items: ["fridge", "cooker", "chair", "chair"],
            most: 23,
        },
    ],
    beds: [3, 2, 4].map((n): Ask => ({ kind: "beds", n })),
    twice: (
        [
            ["living", "bathroom"],
            ["bedroom", "shed"],
            ["kitchen", "bathroom"],
        ] as const
    ).map(([big, small]): Ask => ({ kind: "twice", big, small })),
    spend: [40, 45, 35, 50].map((total): Ask => ({ kind: "spend", room: "living", total })),
    whole: [36, 45, 54, 60].map((area): Ask => ({ kind: "whole", area })),
};

// a free build's variations are who lives in the house
const variantsOf = (L: DollLevel): Ask[] =>
    L.ask.kind === "free" ? CASTS.map(() => L.ask) : (VARIANTS[L.ask.kind] ?? [L.ask]);

/** A level given its variant's ask, its goal said to match; a free build is given another household. */
export function vary(L: DollLevel, variant: number): DollLevel {
    const list = variantsOf(L);
    if (L.ask.kind === "free") return { ...L, cast: variant % CASTS.length };
    const ask = list[variant % list.length] ?? L.ask;
    return { ...L, ask, goal: goalOf(ask) };
}

export function dollChallenge(seed: number, phase: number): DollConfiguration {
    const p = Number.isInteger(phase) && phase >= 0 && phase < DOLL_LEVELS.length ? phase : 0;
    const L = DOLL_LEVELS[p] ?? DOLL_LEVELS[0];
    return { phase: p, variant: (seed >>> 0) % variantsOf(L).length };
}

export function isDollConfiguration(v: unknown, phase: number): v is DollConfiguration {
    if (typeof v !== "object" || v === null || !("phase" in v) || !("variant" in v)) return false;
    const L = DOLL_LEVELS[phase];
    return (
        Object.keys(v).length === 2 &&
        v.phase === phase &&
        L !== undefined &&
        typeof v.variant === "number" &&
        Number.isInteger(v.variant) &&
        v.variant >= 0 &&
        v.variant < variantsOf(L).length
    );
}

export function openDollConfiguration(c: DollConfiguration): DollState {
    const L = DOLL_LEVELS[c.phase];
    if (!L) throw new Error("No such dollhouse job");
    return startDoll(vary(L, c.variant), c.phase);
}

/** A step of a plan: a room of a kind at a spot and a width, or a piece in the room at a spot, its left side `x` along it. */
type Op =
    | { op: "room"; kind: RoomKind; col: number; floor: number; w: number }
    | { op: "thing"; kind: Furniture; col: number; floor: number; x: number };

const DEFAULT_W: Record<RoomKind, number> = {
    bedroom: 4,
    kitchen: 4,
    bathroom: 3,
    living: 5,
    shed: 2,
    attic: 4,
    stairs: 2,
};

/** The pieces in a row along a room's floor from its left wall, each where the house would put it. */
function row(kinds: readonly Furniture[], col: number, floor: number): Op[] {
    const out: Op[] = [];
    const along: Record<string, number> = {};
    for (const kind of kinds) {
        const layer =
            kind === "picture" || kind === "shelf" ? "wall" : kind === "rug" ? "rug" : "floor";
        const x = 0.1 + (along[layer] ?? 0);
        out.push({ op: "thing", kind, col, floor, x });
        along[layer] = (along[layer] ?? 0) + sizeOf(kind).w;
    }
    return out;
}

/** A way to spend exactly `total` coins on a living room at `col` and what is in it, or null. */
function spending(total: number, col: number): Op[] | null {
    const kinds = FURNITURE.filter((k) => k !== "bath");
    for (let w = 3; w <= 8; w++) {
        const rest = total - w * PLOT.storey;
        if (rest < 0) continue;
        const pick: Furniture[] = [];
        const search = (from: number, left: number, n: number): boolean => {
            if (left === 0) return fits(pick, w);
            if (n === 0) return false;
            for (let i = from; i < kinds.length; i++) {
                const k = kinds[i];
                if (!k || PRICE[k] > left) continue;
                pick.push(k);
                if (search(i, left - PRICE[k], n - 1)) return true;
                pick.pop();
            }
            return false;
        };
        if (search(0, rest, 4))
            return [{ op: "room", kind: "living", col, floor: 0, w }, ...row(pick, col, 0)];
    }
    return null;
}

function fits(pick: readonly Furniture[], w: number): boolean {
    const by: Record<string, number> = {};
    for (const k of pick) {
        const layer = k === "picture" || k === "shelf" ? "wall" : k === "rug" ? "rug" : "floor";
        by[layer] = (by[layer] ?? 0) + sizeOf(k).w;
    }
    return Object.values(by).every((n) => n <= w - 0.2 + 1e-9);
}

/** The rooms and pieces that meet a job's ask, in the order they are built, left to right, each room in the shell's slot for it. */
function planFor(L: DollLevel): Op[] | null {
    const a = L.ask;
    const at = L.shell[0]?.col ?? 0;
    switch (a.kind) {
        case "free":
            return [];
        case "bed":
            return [
                { op: "room", kind: "bedroom", col: at, floor: 0, w: 4 },
                ...row(["bed", a.with], at, 0),
            ];
        case "area":
            return a.area % PLOT.storey === 0
                ? [{ op: "room", kind: a.room, col: at, floor: 0, w: a.area / PLOT.storey }]
                : null;
        case "upstairs": {
            // the stairs go in the shell's ground slot beside the living room, and the room over both
            const w = DEFAULT_W[a.room];
            return [
                { op: "room", kind: "stairs", col: at, floor: 0, w: 2 },
                { op: "room", kind: a.room, col: at + 2 - w, floor: 1, w },
            ];
        }
        case "furnish": {
            const kitchen = L.built[0];
            return kitchen ? row(a.items, kitchen.col, kitchen.floor) : null;
        }
        case "beds": {
            const rooms = Math.ceil(a.n / 2);
            const out: Op[] = [];
            for (let i = 0; i < rooms; i++)
                out.push({ op: "room", kind: "bedroom", col: at + i * 8, floor: 0, w: 8 });
            for (let i = 0; i < a.n; i++)
                out.push({
                    op: "thing",
                    kind: "bed",
                    col: at + Math.floor(i / 2) * 8,
                    floor: 0,
                    x: i % 2 ? 3.6 : 0.1,
                });
            return out;
        }
        case "twice":
            return [
                { op: "room", kind: a.small, col: at, floor: 0, w: 2 },
                { op: "room", kind: a.big, col: at + 2, floor: 0, w: 4 },
            ];
        case "spend":
            return spending(a.total, at);
        case "whole": {
            const cols = a.area / PLOT.storey;
            if (!Number.isInteger(cols) || at + cols > PLOT.cols) return null;
            const out: Op[] = [];
            let col = 0;
            while (col < cols) {
                let w = Math.min(8, cols - col);
                if (cols - col - w === 1) w -= 1;
                const kind: RoomKind = w >= 5 ? "living" : w >= 4 ? "bedroom" : "shed";
                out.push({ op: "room", kind, col: at + col, floor: 0, w });
                col += w;
            }
            return out;
        }
    }
}

/** What a driver does at a step: a pad for the game to read, or one of its commands. */
export type Act = { pad: Pad } | { command: string };

const pad = (more: Partial<Pad> = {}): Pad => ({ ...emptyPad(), ...more });

function act(s: DollState, a: Act, log: Act[]): void {
    if ("pad" in a) step(s, { ...a.pad, holding: [...a.pad.holding], pressed: [...a.pad.pressed] });
    else command(s, a.command);
    log.push(a);
}

const roomAtSpot = (s: DollState, col: number, floor: number) =>
    s.rooms.find((r) => r.col === col && r.floor === floor);

const sameTarget = (a: Target | undefined, b: Target): boolean =>
    JSON.stringify(a) === JSON.stringify(b);

/** Steps the keys' highlight onto a target, one press a step. */
function highlight(s: DollState, want: Target, log: Act[]): boolean {
    for (let i = 0; i < 200; i++) {
        if (sameTarget(targets(s)[s.sel], want)) return true;
        act(s, { pad: pad({ pressed: ["right"] }) }, log);
    }
    return false;
}

function press(s: DollState, d: Dir, log: Act[]): void {
    act(s, { pad: pad({ pressed: [d] }) }, log);
}

/** The tab of the drawer a piece is taken from in a room: the room's own tab where it holds the piece, else the first that does. */
function tabFor(s: DollState, item: number): Tab {
    const r = s.rooms.find((o) => o.id === s.zoom);
    const own = r ? ROOM_TAB[r.kind] : s.tab;
    return TAB_ITEMS[own].includes(item)
        ? own
        : (TABS.find((t) => TAB_ITEMS[t].includes(item)) ?? own);
}

/** Waits for the view to finish easing, so the next press lands on what the child sees. */
function settle(s: DollState, log: Act[]): void {
    for (let i = 0; i < 90; i++) act(s, { pad: pad() }, log);
}

/** Builds a plan with the keys, and gives the presses and commands it took, or null where it could not. */
function byKeys(s: DollState, plan: readonly Op[]): Act[] | null {
    const log: Act[] = [];
    const mode = (m: Mode) => {
        if (s.mode !== m) act(s, { command: m }, log);
    };
    for (const o of plan) {
        if (o.op === "room") {
            mode("build");
            if (!highlight(s, { k: "tray", kind: o.kind }, log)) return null;
            act(s, { pad: pad({ tapped: true }) }, log);
            for (let i = 0; i < 80; i++) {
                const h = s.hand;
                if (h?.what !== "room" || !h.spot) return null;
                if (h.spot.col === o.col && h.spot.floor === o.floor) break;
                press(
                    s,
                    h.spot.floor !== o.floor
                        ? o.floor > h.spot.floor
                            ? "up"
                            : "down"
                        : o.col > h.spot.col
                          ? "right"
                          : "left",
                    log,
                );
            }
            act(s, { pad: pad({ tapped: true }) }, log);
            const r = roomAtSpot(s, o.col, o.floor);
            if (!r) return null;
            if (r.w !== o.w) {
                if (!highlight(s, { k: "room", id: r.id }, log)) return null;
                for (let i = 0; i < 8 && r.w !== o.w; i++)
                    act(s, { command: o.w > r.w ? "wider" : "narrower" }, log);
                if (r.w !== o.w) return null;
            }
        } else {
            mode("decorate");
            const r = roomAtSpot(s, o.col, o.floor);
            const item = SHOP_ITEMS.findIndex((it) => it.what === "thing" && it.kind === o.kind);
            if (!r || item < 0) return null;
            if (s.zoom !== r.id) {
                if (!highlight(s, { k: "room", id: r.id }, log)) return null;
                act(s, { pad: pad({ tapped: true }) }, log);
                if (s.zoom !== r.id) return null;
            }
            const tab = tabFor(s, item);
            if (s.tab !== tab) {
                if (!highlight(s, { k: "tab", tab }, log)) return null;
                act(s, { pad: pad({ tapped: true }) }, log);
            }
            if (!highlight(s, { k: "chip", item }, log)) return null;
            act(s, { pad: pad({ tapped: true }) }, log);
            for (let k = 0; k < 120; k++) {
                const h = s.hand;
                if (h?.what !== "thing" || !h.place) return null;
                const here = s.rooms.find((x) => x.id === h.place?.room);
                if (!here) return null;
                if (h.place.room === r.id && Math.abs(h.place.x - o.x) < 1e-6) break;
                const d: Dir =
                    here.floor !== r.floor
                        ? r.floor > here.floor
                            ? "up"
                            : "down"
                        : boxOf(PLOT, here).x + h.place.x < boxOf(PLOT, r).x + o.x
                          ? "right"
                          : "left";
                press(s, d, log);
            }
            act(s, { pad: pad({ tapped: true }) }, log);
        }
    }
    return log;
}

/** A finger pressed at one point, dragged to another and lifted there, as three steps; a point given in the view's own squares is a fixed control's. */
function drag(s: DollState, from: Pt | { view: Pt }, to: Pt, log: Act[]): void {
    const start =
        "view" in from ? { touch: worldOf(s, from.view), view: from.view } : { touch: from };
    act(s, { pad: pad(start) }, log);
    act(s, { pad: pad({ touch: to }) }, log);
    act(s, { pad: pad({ lifted: to }) }, log);
}

/** A tap with a finger on a fixed control, at a point in the view's own squares. */
function tapView(s: DollState, view: Pt, log: Act[]): void {
    const at = worldOf(s, view);
    act(s, { pad: pad({ touch: at, view }) }, log);
    act(s, { pad: pad({ lifted: at, view }) }, log);
}

/** Builds a plan with a finger, and gives the steps it took, or null where it could not. */
function byTouch(s: DollState, plan: readonly Op[]): Act[] | null {
    const log: Act[] = [];
    const mode = (m: Mode) => {
        if (s.mode === m) return;
        tapView(s, MODE_AT[m], log);
        settle(s, log);
    };
    for (const o of plan) {
        if (o.op === "room") {
            mode("build");
            const i = ROOM_KINDS.indexOf(o.kind);
            const b = boxOf(PLOT, { col: o.col, floor: o.floor, w: DEFAULT_W[o.kind] });
            drag(s, { view: trayAt(i) }, { x: b.x + b.w / 2, y: b.y + b.h / 2 }, log);
            const r = roomAtSpot(s, o.col, o.floor);
            if (!r) return null;
            if (r.w !== o.w) {
                const rb = boxOf(PLOT, r);
                drag(
                    s,
                    { x: rb.x + rb.w, y: rb.y + rb.h / 2 },
                    { x: rb.x + o.w, y: rb.y + rb.h / 2 },
                    log,
                );
                if (r.w !== o.w) return null;
            }
        } else {
            mode("decorate");
            const r = roomAtSpot(s, o.col, o.floor);
            const item = SHOP_ITEMS.findIndex((it) => it.what === "thing" && it.kind === o.kind);
            if (!r || item < 0) return null;
            if (s.zoom !== r.id) {
                // the room is tapped near its ceiling, above anyone standing in it
                const b = boxOf(PLOT, r);
                const at = { x: b.x + b.w / 2, y: b.y + 0.25 };
                act(s, { pad: pad({ touch: at }) }, log);
                act(s, { pad: pad({ lifted: at }) }, log);
                if (s.zoom !== r.id) return null;
                settle(s, log);
            }
            const tab = tabFor(s, item);
            if (s.tab !== tab) tapView(s, tabAt(TABS.indexOf(tab)), log);
            const items = TAB_ITEMS[s.tab];
            const b = boxOf(PLOT, r),
                z = sizeOf(o.kind);
            drag(
                s,
                { view: chipAt(items.indexOf(item), items.length) },
                { x: b.x + o.x + z.w / 2, y: floorLine(PLOT, r.floor) - ROOM_FLOOR - z.h / 2 },
                log,
            );
            if (
                !s.things.some(
                    (t) => t.room === r.id && t.kind === o.kind && Math.abs(t.x - o.x) < 1e-6,
                )
            )
                return null;
        }
    }
    return log;
}

/** A plan built through the game, and the steps after it until the job is won. */
export function solve(c: DollConfiguration, hands: "keys" | "touch"): Act[] | null {
    const s = openDollConfiguration(c);
    const plan = planFor(s.L);
    if (!plan) return null;
    const log = hands === "keys" ? byKeys(s, plan) : byTouch(s, plan);
    if (!log) return null;
    for (let i = 0; i < 4 && !s.won; i++) act(s, { pad: pad() }, log);
    return s.won || s.L.ask.kind === "free" ? log : null;
}

/** Whether a job's variation can be built, by both hands. */
export function dollCertified(c: DollConfiguration): boolean {
    return solve(c, "touch") !== null && solve(c, "keys") !== null;
}
