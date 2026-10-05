// Charlie's dollhouse: every variation of every job is built to its win by a finger and by the keys
// through the real game, and those hands replay to the same house; a room needs something under it
// and coins to pay for it, and comes back as coins when taken away; the shell shows its slots while
// building, a tap on a room while decorating eases the view into it and the back button out again, and
// a held piece glows where it fits; a tap lights a lamp and turns a sofa round; a person sent upstairs
// walks up the stairs; random hands rarely finish a job; and the house, the people and a kept design
// are plain data that reads back.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SHELF_IDS } from "./shelf";
import { emptyPad, type Pad } from "../../../engine/motion/pad";
import { boxOf, floorLine } from "../../../engine/motion/house";
import { faults } from "../../../engine/motion/tune";
import {
    BACK_AT,
    DOLL,
    MOST_ROOMS,
    DOLL_LEVELS,
    MODE_AT,
    PLOT,
    PRICE,
    ROOM_KINDS,
    SHOP_ITEMS,
    TAB_ITEMS,
    chipAt,
    dollhouseGame,
    readDesign,
    startDoll,
    thingBox,
    trayAt,
    worldOf,
    type DollState,
} from "../dollhouse";
import {
    dollChallenge,
    isDollConfiguration,
    openDollConfiguration,
    solve,
    type Act,
} from "../dollhouse-challenges";
import { ROOM_FLOOR } from "../../../engine/parts/home/dollroom";

const pad = (more: Partial<Pad> = {}): Pad => ({ ...emptyPad(), ...more });
const tick = (s: DollState, p: Pad = pad()) => dollhouseGame.step(s, p);

function drag(s: DollState, from: { x: number; y: number }, to: { x: number; y: number }): void {
    tick(s, pad({ touch: from }));
    tick(s, pad({ touch: to }));
    tick(s, pad({ lifted: to }));
}

function tap(s: DollState, at: { x: number; y: number }): void {
    tick(s, pad({ touch: at }));
    tick(s, pad({ lifted: at }));
}

/** A drag from a fixed control, given in the view's own squares, to a place in the house. */
function fromView(
    s: DollState,
    view: { x: number; y: number },
    to: { x: number; y: number },
): void {
    tick(s, pad({ touch: worldOf(s, view), view }));
    tick(s, pad({ touch: to }));
    tick(s, pad({ lifted: to }));
}

/** A tap on a fixed control, then the steps the view takes to settle. */
function press(s: DollState, view: { x: number; y: number }): void {
    tick(s, pad({ touch: worldOf(s, view), view }));
    tick(s, pad({ lifted: worldOf(s, view), view }));
    for (let i = 0; i < 120; i++) tick(s);
}

/** Where a piece's chip is in the drawer's open tab. */
function chip(s: DollState, kind: string): { x: number; y: number } {
    const items = TAB_ITEMS[s.tab];
    const i = items.findIndex((n) => {
        const it = SHOP_ITEMS[n];
        return it?.what === "thing" && it.kind === kind;
    });
    assert.ok(i >= 0, `no ${kind} in the ${s.tab} tab`);
    return chipAt(i, items.length);
}

const replay = (c: { phase: number; variant: number }, acts: readonly Act[]): DollState => {
    const s = openDollConfiguration(c);
    for (const a of acts) {
        if ("pad" in a)
            tick(s, { ...a.pad, holding: [...a.pad.holding], pressed: [...a.pad.pressed] });
        else dollhouseGame.command?.(s, a.command);
    }
    return s;
};

test("every variation of every job is built to its win by a finger and by the keys, and the hands replay to the same house", () => {
    for (const [phase, L] of DOLL_LEVELS.entries()) {
        for (let variant = 0; variant < 4; variant++) {
            const c = { phase, variant };
            if (!isDollConfiguration(c, phase)) continue;
            for (const hands of ["touch", "keys"] as const) {
                const acts = solve(c, hands);
                assert.ok(acts, `${L.title}, variant ${variant}, cannot be built by ${hands}`);
                const s = replay(c, acts ?? []);
                assert.equal(
                    s.won,
                    L.ask.kind !== "free",
                    `${L.title}, variant ${variant}, by ${hands}`,
                );
                assert.deepEqual(
                    JSON.parse(JSON.stringify(replay(c, acts ?? []))),
                    JSON.parse(JSON.stringify(s)),
                    "the same hands build the same house",
                );
            }
        }
    }
    assert.deepEqual(dollChallenge(5, 2), { phase: 2, variant: 1 });
});

test("a room needs ground or rooms under all of it and the coins to pay for it, and comes back as coins", () => {
    const s = startDoll(DOLL_LEVELS[1] ?? DOLL_LEVELS[0], 1);
    const bedroom = trayAt(ROOM_KINDS.indexOf("bedroom"));
    fromView(s, bedroom, { x: PLOT.x0 + 10, y: PLOT.ground - 7.5 });
    assert.equal(s.rooms.length, 0, "a room in the air does not stand");
    fromView(s, bedroom, { x: PLOT.x0 + 10, y: PLOT.ground - 1.5 });
    assert.equal(s.rooms.length, 1);
    assert.equal(s.rooms[0]?.col, 8, "it drops into the shell's slot");
    assert.equal(s.spent, 12, "a bedroom four squares wide costs a coin a square");
    fromView(s, bedroom, { x: PLOT.x0 + 6, y: PLOT.ground - 1.5 });
    fromView(s, bedroom, { x: PLOT.x0 + 14, y: PLOT.ground - 1.5 });
    fromView(s, bedroom, { x: PLOT.x0 + 2, y: PLOT.ground - 1.5 });
    assert.equal(s.rooms.length, 3, "the fourth costs more than the coins left");
    assert.match(s.said, /costs 12 coins, and there are 4 left/);
    const r = s.rooms[0];
    assert.ok(r);
    const b = boxOf(PLOT, r);
    drag(s, { x: b.x + 1, y: b.y + 1.5 }, worldOf(s, trayAt(0)));
    assert.equal(s.rooms.length, 2);
    assert.equal(s.spent, 24, "taking it away gives its coins back");
    assert.ok(dollhouseGame.back?.(s));
    assert.equal(s.rooms.length, 3, "and Undo puts it back");
});

test("a tap lights a lamp and turns a sofa round, and a lit lamp shines in the frame", () => {
    const s = startDoll(DOLL_LEVELS[0], 0);
    fromView(s, trayAt(ROOM_KINDS.indexOf("living")), { x: PLOT.x0 + 8.5, y: PLOT.ground - 1.5 });
    press(s, MODE_AT.decorate);
    tap(s, { x: PLOT.x0 + 8.5, y: PLOT.ground - 2.8 });
    for (let i = 0; i < 120; i++) tick(s);
    assert.equal(s.tab, "sit", "a living room opens the drawer on things to sit on");
    const floor = floorLine(PLOT, 0) - ROOM_FLOOR;
    fromView(s, chip(s, "lamp"), { x: PLOT.x0 + 6.6, y: floor - 1 });
    fromView(s, chip(s, "sofa"), { x: PLOT.x0 + 9, y: floor - 0.7 });
    assert.equal(s.things.length, 2);
    assert.equal(s.spent, 15 + PRICE.lamp + PRICE.sofa);
    for (const t of s.things) {
        const b = thingBox(s, t);
        assert.ok(b);
        tap(s, { x: (b?.x ?? 0) + (b?.w ?? 0) / 2, y: (b?.y ?? 0) + (b?.h ?? 0) / 2 });
    }
    assert.ok(s.things.find((t) => t.kind === "lamp")?.on, "the lamp is lit");
    assert.ok(s.things.find((t) => t.kind === "sofa")?.flip, "the sofa turned round");
    assert.equal(dollhouseGame.frame(s).lights?.length, 1);
});

test("someone tapped and sent upstairs walks there by the stairs, and cannot be sent where no stairs go", () => {
    const s = startDoll(DOLL_LEVELS[3] ?? DOLL_LEVELS[0], 3);
    const charlie = s.folk[0];
    assert.ok(charlie);
    fromView(s, trayAt(ROOM_KINDS.indexOf("bedroom")), { x: PLOT.x0 + 9, y: PLOT.ground - 4.5 });
    assert.equal(s.rooms.length, 2, "a bedroom on top of the living room");
    tap(s, { x: charlie.at.x, y: charlie.at.y - 1 });
    tap(s, { x: PLOT.x0 + 9, y: PLOT.ground - 4.5 });
    assert.match(s.said, /cannot get there/);
    fromView(s, trayAt(ROOM_KINDS.indexOf("stairs")), { x: PLOT.x0 + 13, y: PLOT.ground - 1.5 });
    fromView(s, trayAt(ROOM_KINDS.indexOf("bathroom")), {
        x: PLOT.x0 + 12.5,
        y: PLOT.ground - 4.5,
    });
    assert.equal(s.rooms.length, 4, "stairs, and a bathroom over them beside the bedroom");
    tap(s, { x: charlie.at.x, y: charlie.at.y - 1 });
    tap(s, { x: PLOT.x0 + 9, y: PLOT.ground - 4.5 });
    const to = s.rooms.find((r) => r.floor === 1 && r.col === 7);
    assert.ok(to);
    for (let i = 0; i < 60 * 30 && charlie.way.length; i++) tick(s);
    assert.equal(charlie.where.room, to?.id);
    assert.equal(charlie.at.y, floorLine(PLOT, 1), "she is on the upper floor");
    assert.ok(s.won, "a bedroom upstairs with stairs up to it is the job done");
});

test("random hands rarely finish a job", () => {
    let seed = 7;
    const rand = () => {
        seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
        return seed / 4294967296;
    };
    for (const [phase, L] of DOLL_LEVELS.entries()) {
        if (L.ask.kind === "free") continue;
        let wins = 0;
        for (let k = 0; k < 10; k++) {
            const s = startDoll(L, phase);
            for (let i = 0; i < 400 && !s.won; i++) {
                const at = { x: rand() * 48, y: rand() * 27 };
                const r = rand();
                if (r < 0.3) drag(s, at, { x: rand() * 48, y: rand() * 27 });
                else if (r < 0.4) tap(s, at);
                else if (r < 0.7)
                    tick(
                        s,
                        pad({
                            pressed: [
                                (["left", "right", "up", "down"] as const)[
                                    Math.floor(rand() * 4)
                                ] ?? "left",
                            ],
                        }),
                    );
                else if (r < 0.9) tick(s, pad({ tapped: true }));
                else tick(s, pad({ brake: true }));
            }
            if (s.won) wins++;
        }
        assert.ok(wins <= 2, `${L.title} is finished by ${wins} of 10 random tries`);
    }
});

test("the house is plain data, a kept design reads back, and one that cannot stand is refused", () => {
    const c = { phase: 5, variant: 0 };
    const acts = solve(c, "touch");
    assert.ok(acts);
    const s = replay(c, acts ?? []);
    assert.deepEqual(JSON.parse(JSON.stringify(s)), s);
    const kept: unknown = JSON.parse(JSON.stringify(dollhouseGame.checkpoint?.(s)));
    const fresh = startDoll(DOLL_LEVELS[0], 0);
    assert.ok(dollhouseGame.restore?.(fresh, kept));
    assert.equal(fresh.rooms.length, s.rooms.length);
    assert.equal(fresh.things.length, s.things.length);
    const older: unknown = JSON.parse(
        JSON.stringify(kept, (k, v: unknown) => (k === "born" ? undefined : v)),
    );
    assert.ok(
        dollhouseGame.restore?.(startDoll(DOLL_LEVELS[0], 0), older),
        "a house kept before rooms settled still loads",
    );
    assert.equal(
        readDesign({
            rooms: [
                {
                    id: 1,
                    kind: "bedroom",
                    col: 0,
                    floor: 2,
                    w: 4,
                    paper: "plain",
                    tone: "sky",
                    floorKind: "boards",
                    window: true,
                },
            ],
            things: [],
            spent: 0,
            cast: 0,
            next: 2,
        }),
        null,
    );
    assert.equal(readDesign({ rooms: "no" }), null);
    dollhouseGame.command?.(fresh, "new");
    assert.equal(fresh.rooms.length, 0, "a new house starts from the empty shell");
});

test("the frame draws only the shelf's drawings, the words have no dashes, and the tuning is sound", () => {
    const c = { phase: 7, variant: 0 };
    const s = replay(c, solve(c, "touch") ?? []);
    dollhouseGame.command?.(s, "who");
    const f = dollhouseGame.frame(s);
    for (const sp of f.sprites) assert.ok(SHELF_IDS.has(sp.art), `${sp.art} is not on the shelf`);
    assert.ok(SHELF_IDS.has(dollhouseGame.cover.art));
    for (const L of DOLL_LEVELS)
        assert.doesNotMatch(`${L.goal} ${L.title} ${dollhouseGame.hint}`, /[—!]/);
    assert.doesNotMatch(dollhouseGame.say(s), /[—!]/);
    assert.deepEqual(faults(DOLL), []);
    assert.equal(dollhouseGame.card, null);
});

test("under reduced motion a press settles once everyone has stopped walking", () => {
    const s = startDoll(DOLL_LEVELS[1] ?? DOLL_LEVELS[0], 1);
    fromView(s, trayAt(ROOM_KINDS.indexOf("bedroom")), { x: PLOT.x0 + 10, y: PLOT.ground - 1.5 });
    const charlie = s.folk[0];
    assert.ok(charlie);
    tap(s, { x: charlie.at.x, y: charlie.at.y - 1 });
    tap(s, { x: PLOT.x0 + 10, y: PLOT.ground - 1.5 });
    assert.ok(dollhouseGame.still.settling?.(s));
    for (let i = 0; i < 60 * 20 && dollhouseGame.still.settling?.(s); i++) tick(s);
    assert.equal(dollhouseGame.still.settling?.(s), false);
});

test("building shows the shell's slots; decorating, a tapped room fills the view and the back button leaves it", () => {
    const s = startDoll(DOLL_LEVELS[7] ?? DOLL_LEVELS[0], 7);
    const boxes = (dollhouseGame.frame(s).marks ?? []).filter((m) => m.kind === "box");
    assert.ok(
        boxes.some((m) => m.kind === "box" && m.on),
        "the job's slot is outlined",
    );
    assert.ok(
        dollhouseGame.frame(s).sprites.some((sp) => sp.art === "dollshell"),
        "the shell stands on its plinth",
    );
    fromView(s, trayAt(ROOM_KINDS.indexOf("living")), { x: PLOT.x0 + 10.5, y: PLOT.ground - 1.5 });
    assert.equal(s.rooms[0]?.col, 8);
    dollhouseGame.command?.(s, "decorate");
    for (let i = 0; i < 120; i++) tick(s);
    const whole = s.lens.k;
    assert.ok(whole > 1.5, "the house is framed large in the middle");
    assert.equal(s.mode, "decorate");
    tap(s, { x: PLOT.x0 + 10.5, y: PLOT.ground - 2.8 });
    for (let i = 0; i < 120; i++) tick(s);
    assert.equal(s.zoom, s.rooms[0]?.id);
    assert.ok(s.lens.k > whole * 1.3, "the room fills most of the field");
    assert.equal(dollhouseGame.frame(s).camera?.zoom, s.lens.k);
    // a held sofa glows along the room's floor, and a ghost shows where it lands
    const sofa = chip(s, "sofa");
    tick(s, pad({ touch: worldOf(s, sofa), view: sofa }));
    tick(s, pad({ touch: { x: PLOT.x0 + 10, y: PLOT.ground - 1 } }));
    const held = dollhouseGame.frame(s).sprites;
    assert.ok(held.some((sp) => sp.art === "dollshell" && sp.params?.kind === "glow"));
    assert.ok(held.some((sp) => sp.key === "ghost"));
    tick(s, pad({ lifted: { x: PLOT.x0 + 10, y: PLOT.ground - 1 } }));
    assert.equal(s.things.length, 1);
    press(s, BACK_AT);
    assert.equal(s.zoom, null);
    assert.equal(s.lens.k, whole, "and the back button eases out to the whole house");
    dollhouseGame.command?.(s, "zoom");
    assert.equal(s.zoom, s.rooms[0]?.id, "Z looks into a room from the keys");
    dollhouseGame.command?.(s, "build");
    assert.equal(s.zoom, null);
});

test("a free build grows past the old plot to the right and the left, the view follows and pans, and the big house keeps and loads", () => {
    const s = startDoll(DOLL_LEVELS[0], 0);
    const bedroom = trayAt(ROOM_KINDS.indexOf("bedroom"));
    const ground = PLOT.ground - 1.5;
    const ends = () => ({
        left: Math.min(...s.rooms.map((r) => r.col)),
        right: Math.max(...s.rooms.map((r) => r.col + r.w)),
    });
    fromView(s, bedroom, { x: PLOT.x0 + 8, y: ground });
    assert.equal(s.rooms.length, 1);
    for (let n = 0; n < 10; n++) {
        fromView(s, bedroom, { x: PLOT.x0 + ends().right + 2, y: ground });
        for (let i = 0; i < 90; i++) tick(s);
    }
    for (let n = 0; n < 6; n++) {
        fromView(s, bedroom, { x: PLOT.x0 + ends().left - 2, y: ground });
        for (let i = 0; i < 90; i++) tick(s);
    }
    assert.equal(s.rooms.length, 17);
    assert.ok(
        ends().right > PLOT.cols + 20,
        `the house runs to column ${ends().right}, far past the old 20`,
    );
    assert.ok(ends().left < -10, `and back to column ${ends().left}`);
    const last = s.rooms[s.rooms.length - 1];
    assert.ok(last);
    const lb = boxOf(PLOT, last);
    assert.ok(
        Math.abs(s.lens.x - (lb.x + lb.w / 2)) < 25,
        "the view keeps the room just put down in sight",
    );
    const before = s.lens.x;
    tick(s, pad({ intents: [{ kind: "pan", x: 0.5, y: 0 }] }));
    for (let i = 0; i < 60; i++) tick(s);
    assert.ok(s.lens.x > before + 10, "the wheel or two fingers move the view along the house");
    dollhouseGame.command?.(s, "fit");
    for (let i = 0; i < 200; i++) tick(s);
    const half = 24 / s.lens.k;
    assert.ok(
        s.lens.x - half <= PLOT.x0 + ends().left && s.lens.x + half >= PLOT.x0 + ends().right,
        "the whole-house button shows every room",
    );
    const kept: unknown = JSON.parse(JSON.stringify(dollhouseGame.checkpoint?.(s)));
    const fresh = startDoll(DOLL_LEVELS[0], 0);
    assert.ok(dollhouseGame.restore?.(fresh, kept));
    assert.equal(fresh.rooms.length, 17, "the long house keeps and loads");
    assert.ok(MOST_ROOMS >= 40, "a house may hold many rooms");
});
