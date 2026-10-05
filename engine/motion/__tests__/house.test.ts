// A house of rooms: a room stands only on the ground or wholly on rooms below and never overlaps
// another; a room with something on it cannot be taken away; snapping finds the nearest spot and the
// keys step to the next one; things keep to their room and their layer; a room cannot shrink past
// what is in it; the way between rooms goes along floors, through shared walls and up the stairs; the
// empty slots a house offers are its shell's and those beside and over its rooms; and a wall shared
// with a room beside it is known, for its doorway.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
    areaOf,
    boxOf,
    canLeave,
    canResize,
    canStand,
    nearestPlace,
    nearestSpot,
    roomAt,
    sharedWalls,
    slotsOf,
    stepPlace,
    stepSpot,
    thingFits,
    travel,
    wayBetween,
    type Plot,
    type Room,
    type Thing,
} from "../house";

const PLOT: Plot = { x0: 0, ground: 12, cols: 12, floors: 3, storey: 3, least: 2, most: 8 };

const room = (id: number, col: number, floor: number, w: number, climbs = false): Room => ({
    id,
    kind: climbs ? "stairs" : "room",
    col,
    floor,
    w,
    ...(climbs ? { climbs: true as const } : {}),
});

test("a room stands on the ground or wholly on rooms below, inside the plot, never over another", () => {
    const rooms = [room(1, 0, 0, 4)];
    assert.ok(canStand(PLOT, rooms, { col: 4, floor: 0, w: 3 }));
    assert.ok(!canStand(PLOT, rooms, { col: 2, floor: 0, w: 3 }), "it overlaps");
    assert.ok(canStand(PLOT, rooms, { col: 0, floor: 1, w: 4 }));
    assert.ok(
        !canStand(PLOT, rooms, { col: 2, floor: 1, w: 4 }),
        "half of it has nothing under it",
    );
    assert.ok(!canStand(PLOT, rooms, { col: 10, floor: 0, w: 4 }), "it runs off the plot");
    assert.ok(!canStand(PLOT, rooms, { col: 4, floor: 0, w: 1 }), "too narrow");
    assert.equal(areaOf(PLOT, { w: 4 }), 12);
});

test("a room with another on it stays, and one without can go", () => {
    const rooms = [room(1, 0, 0, 4), room(2, 0, 1, 3), room(3, 6, 0, 2)];
    assert.ok(!canLeave(rooms, 1));
    assert.ok(canLeave(rooms, 2));
    assert.ok(canLeave(rooms, 3));
});

test("a room snaps to the nearest spot within reach, and the keys step to the next one each way", () => {
    const rooms = [room(1, 0, 0, 4)];
    const near = nearestSpot(PLOT, rooms, 3, { x: 5.4, y: 10.6 }, 3);
    assert.deepEqual(near, { col: 4, floor: 0 });
    assert.equal(nearestSpot(PLOT, rooms, 3, { x: 30, y: 30 }, 3), null);
    assert.deepEqual(stepSpot(PLOT, rooms, 3, { col: 4, floor: 0 }, 1, 0), { col: 5, floor: 0 });
    assert.deepEqual(stepSpot(PLOT, rooms, 3, { col: 4, floor: 0 }, 0, -1), { col: 1, floor: 1 });
    assert.deepEqual(stepSpot(PLOT, rooms, 3, { col: 1, floor: 1 }, 0, 1), { col: 4, floor: 0 });
});

test("things keep to their room and their layer, and the keys step them along and between rooms", () => {
    const rooms = [room(1, 0, 0, 4), room(2, 4, 0, 4), room(3, 8, 0, 2, true)];
    const things: Thing[] = [{ id: 9, room: 1, x: 0.1, w: 2, layer: "floor" }];
    assert.ok(!thingFits(rooms, things, 1, 1.1, 2, "floor"), "it overlaps the first");
    assert.ok(thingFits(rooms, things, 1, 1.1, 2, "wall"), "the wall is another layer");
    assert.ok(thingFits(rooms, things, 1, 2.1, 1.5, "floor"));
    assert.ok(!thingFits(rooms, things, 1, 2.6, 1.5, "floor"), "it runs through the wall");
    assert.ok(!thingFits(rooms, things, 3, 0.1, 1, "floor"), "stairs take nothing");
    const p = nearestPlace(PLOT, rooms, things, 1, "floor", { x: 1, y: 10 }, 2);
    assert.deepEqual(p, { room: 1, x: 2.1 });
    const on = stepPlace(PLOT, rooms, things, 1, "floor", { room: 1, x: 2.1 }, 1, 0);
    assert.deepEqual(on, { room: 1, x: 2.6 });
    const next = stepPlace(PLOT, rooms, things, 1, "floor", { room: 1, x: 2.9 }, 1, 0);
    assert.equal(next.room, 2);
    assert.equal(roomAt(PLOT, rooms, { x: 5, y: 10 })?.id, 2);
});

test("a room grows into the space beside it and shrinks no narrower than what is in it", () => {
    const rooms = [room(1, 0, 0, 4), room(2, 6, 0, 3)];
    const things: Thing[] = [{ id: 9, room: 1, x: 2.6, w: 1, layer: "floor" }];
    assert.ok(canResize(PLOT, rooms, things, 1, 6));
    assert.ok(!canResize(PLOT, rooms, things, 1, 7), "it would run into the next room");
    assert.ok(!canResize(PLOT, rooms, things, 1, 3), "the thing at 2.6 would be outside it");
    const upstairs = [room(1, 0, 0, 4), room(2, 0, 1, 4)];
    assert.ok(!canResize(PLOT, upstairs, [], 1, 3), "the room upstairs would lose its floor");
});

test("the way to a room goes in from outside, through shared walls and up the stairs, and is null with no way", () => {
    const rooms = [room(1, 0, 0, 4), room(2, 4, 0, 2, true), room(3, 2, 1, 4), room(4, 0, 2, 2)];
    const way = wayBetween(PLOT, rooms, { room: null, x: -2 }, { room: 3, x: 1 });
    assert.ok(way, "upstairs is reached by the stairs");
    assert.deepEqual(way?.at(0), { x: -2, y: 12 });
    assert.deepEqual(way?.at(-1), { x: 3, y: 9 });
    assert.ok(
        way?.some((p) => p.y === 9 && p.x === 5.6),
        "it climbs to the top of the stairs",
    );
    assert.equal(
        wayBetween(PLOT, rooms, { room: 1, x: 1 }, { room: 4, x: 1 }),
        null,
        "nothing climbs to the top storey",
    );
    assert.equal(boxOf(PLOT, rooms[2] ?? room(0, 0, 0, 2)).y, 6);
});

test("a walker travels along its way at the distance given, turning the way it goes", () => {
    const moved = travel(
        [
            { x: 3, y: 0 },
            { x: 3, y: 4 },
        ],
        { x: 0, y: 0 },
        5,
    );
    assert.deepEqual(moved.at, { x: 3, y: 2 });
    assert.equal(moved.way.length, 1);
    assert.equal(moved.facing, 1);
    const back = travel([{ x: -1, y: 0 }], { x: 0, y: 0 }, 5);
    assert.deepEqual(back, { at: { x: -1, y: 0 }, way: [], facing: -1 });
});

test("the slots offered are the shell's still empty, and those beside and over each room", () => {
    const shell = [
        { col: 2, floor: 0, w: 4 },
        { col: 6, floor: 0, w: 4 },
    ];
    assert.deepEqual(slotsOf(PLOT, [], shell, 4), shell);
    const rooms = [room(1, 2, 0, 4)];
    assert.deepEqual(slotsOf(PLOT, rooms, shell, 4), [
        { col: 6, floor: 0, w: 4 },
        { col: 2, floor: 1, w: 4 },
        { col: 0, floor: 0, w: 2 },
    ]);
    const full = [room(1, 0, 0, 6), room(2, 6, 0, 6)];
    assert.deepEqual(
        slotsOf(PLOT, full, [], 4).map((s) => s.floor),
        [1, 1],
        "a full ground storey offers only the storey over it",
    );
});

test("a wall shared with a room beside it on its storey is known, and one over another storey is not", () => {
    const rooms = [room(1, 0, 0, 4), room(2, 4, 0, 3), room(3, 7, 1, 2)];
    assert.deepEqual(sharedWalls(rooms, rooms[0] ?? room(0, 0, 0, 2)), {
        left: false,
        right: true,
    });
    assert.deepEqual(sharedWalls(rooms, rooms[1] ?? room(0, 0, 0, 2)), {
        left: true,
        right: false,
    });
    assert.deepEqual(sharedWalls(rooms, rooms[2] ?? room(0, 0, 0, 2)), {
        left: false,
        right: false,
    });
});

test("an open plot lets a house grow past its start to the left, to the right and up, offering a slot at each end and on top", () => {
    const open: Plot = { ...PLOT, open: { left: 200, right: 200, top: 30 } };
    let rooms: Room[] = [{ id: 1, kind: "a", col: 4, floor: 0, w: 4 }];
    for (let n = 0; n < 12; n++) {
        const right = Math.max(...rooms.map((r) => r.col + r.w)),
            left = Math.min(...rooms.map((r) => r.col));
        const slots = slotsOf(open, rooms, [], 4);
        assert.ok(
            slots.some((s) => s.floor === 0 && s.col === right),
            `a slot past the right end at ${right}`,
        );
        assert.ok(
            slots.some((s) => s.floor === 0 && s.col + s.w === left),
            `a slot past the left end at ${left}`,
        );
        rooms = [
            ...rooms,
            { id: rooms.length + 1, kind: "a", col: right, floor: 0, w: 4 },
            { id: rooms.length + 2, kind: "a", col: left - 4, floor: 0, w: 4 },
        ];
    }
    assert.ok(
        Math.max(...rooms.map((r) => r.col + r.w)) > PLOT.cols + 40,
        "far past the start's right side",
    );
    assert.ok(Math.min(...rooms.map((r) => r.col)) < -40, "and far past its left");
    let tower: Room[] = [{ id: 1, kind: "a", col: 0, floor: 0, w: 2 }];
    for (let f = 1; f < 10; f++) {
        assert.ok(
            slotsOf(open, tower, [], 2).some((s) => s.floor === f),
            `a slot on top at storey ${f}`,
        );
        tower = [...tower, { id: f + 1, kind: "a", col: 0, floor: f, w: 2 }];
    }
    assert.ok(
        canStand(open, tower, { col: 0, floor: 10, w: 2 }),
        "a tower goes past the start's three storeys",
    );
    assert.equal(
        canStand(open, tower, { col: 0, floor: 30, w: 2 }),
        false,
        "but not past the plot's top",
    );
    assert.ok(!canStand(PLOT, [], { col: 12, floor: 0, w: 2 }), "a closed plot keeps its sides");
});
