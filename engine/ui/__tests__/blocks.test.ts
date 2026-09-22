import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
    add,
    can,
    count,
    deepen,
    EMPTY,
    move,
    placedFrom,
    remove,
    slotWords,
    type Build,
    type Pad,
} from "../blocks";

const PAD: Pad = {
    tray: ["right 1", "down 1", "repeat 2", "if wall ahead", "otherwise"],
    slots: 4,
    once: false,
};
const CARDS: Pad = { tray: ["up 2", "left 1"], slots: 2, once: true };

/** A build made by a list of changes, each of which must change something. */
function made(...steps: ((b: Build) => { build: Build | null; said: string })[]): Build {
    let b = EMPTY;
    for (const step of steps) {
        const c = step(b);
        assert.ok(c.build, `a step changed nothing: ${c.said}`);
        b = c.build;
    }
    return b;
}

const lines = (b: Build): string[] => b.blocks.map((x) => `${"  ".repeat(x.depth)}${x.text}`);

describe("a program built in a pad", () => {
    it("adds a tray block at a slot, chooses it, and says where it went", () => {
        const c = add(EMPTY, PAD, 0, 0);
        assert.deepEqual(c.build, { blocks: [{ text: "right 1", depth: 0, from: 0 }], chosen: 0 });
        assert.equal(c.said, "right 1 is in slot 1.");
        const b = made(
            (x) => add(x, PAD, 0, 0),
            (x) => add(x, PAD, 1, 0),
        );
        assert.deepEqual(lines(b), ["down 1", "right 1"]);
        assert.equal(b.chosen, 0);
    });

    it("puts a block inside a repeat above it, and never further in than that", () => {
        const b = made(
            (x) => add(x, PAD, 2, 0),
            (x) => add(x, PAD, 0, 1),
            (x) => add(x, PAD, 1, 2),
        );
        assert.deepEqual(
            lines(b),
            ["repeat 2", "  right 1", "  down 1"],
            "a block under a repeat starts inside it",
        );
        const out = deepen({ ...b, chosen: 2 }, -1);
        assert.deepEqual(lines(out.build ?? EMPTY), ["repeat 2", "  right 1", "down 1"]);
        assert.equal(out.said, "down 1 is out of the block above.");
        const again = deepen({ ...b, chosen: 2 }, 1);
        assert.equal(again.build, null);
        assert.match(again.said, /^It cannot go further in/);
        assert.equal(deepen({ ...b, chosen: 0 }, -1).said, "It is already at the left edge.");
    });

    it("lines an otherwise up with its if", () => {
        const b = made(
            (x) => add(x, PAD, 3, 0),
            (x) => add(x, PAD, 0, 1),
            (x) => add(x, PAD, 4, 2),
        );
        assert.deepEqual(lines(b), ["if wall ahead", "  right 1", "otherwise"]);
    });

    it("moves a block, and keeps what was inside a repeat no deeper than the block now above it", () => {
        const b = made(
            (x) => add(x, PAD, 2, 0),
            (x) => add(x, PAD, 0, 1),
        );
        const moved = move({ ...b, chosen: 0 }, 1);
        assert.deepEqual(lines(moved.build ?? EMPTY), ["right 1", "repeat 2"]);
        assert.equal(moved.said, "repeat 2 is in slot 2.");
        assert.equal(move({ ...b, chosen: 0 }, -1).build, null);
    });

    it("changes a block's number from 1 to 20, and not a card's", () => {
        let b = made((x) => add(x, PAD, 0, 0));
        for (let i = 0; i < 25; i++) b = count(b, PAD, 1).build ?? b;
        assert.deepEqual(lines(b), ["right 20"]);
        b = count(b, PAD, -1).build ?? b;
        assert.equal(count(b, PAD, 1).said, "right 20.");
        const noNumber = made((x) => add(x, PAD, 4, 0));
        assert.equal(count(noNumber, PAD, 1).said, "otherwise has no number to change.");
        const card = made((x) => add(x, CARDS, 0, 0));
        assert.equal(count(card, CARDS, 1).build, null);
        assert.equal(can(card, CARDS).count, false);
    });

    it("takes a card once, and fills no more slots than the pad has", () => {
        const b = made((x) => add(x, CARDS, 0, 0));
        assert.equal(add(b, CARDS, 0, 1).said, "That card is already in a slot.");
        const full = made(
            (x) => add(x, CARDS, 0, 0),
            (x) => add(x, CARDS, 1, 1),
        );
        assert.equal(
            add(full, { ...CARDS, once: false }, 0, 2).said,
            "The 2 slots are full. Take a block out first.",
        );
    });

    it("takes the chosen block out, and says so", () => {
        const b = made(
            (x) => add(x, PAD, 0, 0),
            (x) => add(x, PAD, 1, 1),
        );
        const gone = remove(b);
        assert.deepEqual(lines(gone.build ?? EMPTY), ["right 1"]);
        assert.equal(gone.build?.chosen, 0);
        assert.equal(gone.said, "down 1 is taken out.");
        assert.equal(remove(EMPTY).build, null);
    });

    it("says what the tools can do with the chosen block, and how each slot reads", () => {
        const b = made(
            (x) => add(x, PAD, 2, 0),
            (x) => add(x, PAD, 0, 1),
        );
        assert.deepEqual(can(b, PAD), {
            up: true,
            down: false,
            in: false,
            out: true,
            count: true,
            take: true,
        });
        assert.deepEqual(can(EMPTY, PAD), {
            up: false,
            down: false,
            in: false,
            out: false,
            count: false,
            take: false,
        });
        assert.equal(slotWords(b, 1), "Slot 2: right 1, inside one block");
        assert.equal(slotWords(b, 3), "Slot 4: empty");
    });

    it("places a program already written as blocks from the tray", () => {
        assert.deepEqual(
            placedFrom(
                [
                    { text: "up 2", depth: 0 },
                    { text: "down 5", depth: 1 },
                ],
                CARDS,
            ),
            [
                { text: "up 2", depth: 0, from: 0 },
                { text: "down 5", depth: 1, from: -1 },
            ],
        );
    });
});
