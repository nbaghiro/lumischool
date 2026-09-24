// The rule machine, on the board.
//
// The rule mechanic in rule.ts is untouched: feed a number in, watch what comes out, then name the
// rule the machine is using, with one guess. It stays a puzzle, because the question is which number to
// feed and the machine does the rest; what this file adds is the machine itself, so the answer is
// something that happens rather than a number that appears. The numbers to feed are balls in a basket
// and the rules are cards pinned up over the machine. A ball dropped into the hopper, or tapped, goes in;
// the lever pulls, the cogs turn, and a ball with the answer rolls out of the chute and into the table
// of what has been found out. A card posted into the slot on the machine's roof names the rule, and the
// machine lights up when it is the one. The tray of moves stays as it was. Every beat ends on the next
// position's scene, which test/games.test.ts checks for every move of every level. See .docs/games.md.
import type { Choice, Ctx, Handle, Release, Session } from "./hands";
import type { Target } from "./pieces";
import type { Part, Scene } from "../../engine/motion/scene";
import { score, type Beat } from "../../engine/motion/beat";
import { atLeast, type Pt } from "../../engine/motion/geometry";
import { seeded } from "../../engine/motion/spawn";
import { SPRINGS } from "../../engine/motion/spring";
import { easeBack, timeline } from "../../engine/motion/timeline";
import { ACTIVITIES } from "./activities";
import type { TurnGame } from "./game";
import type { Position, Round } from "./games";

/**
 * In the drawings' own squares: the rule machine's hopper, the slot on its roof, its chute's top and
 * lower end and its foot (src/art/rulemachine.ts); a number ball's box; a pinned card ten squares
 * wide with its rule as one centred line below the pin, at a size the tray's numbers are, which fits
 * the longest rule with a square of margin, drawn at 9.2 squares across so five fit a row of the board; and
 * where the in and out table writes the answer of row `i` (src/art/algebra.ts).
 */
const MACHINE = {
    hopper: { x: 4.5, y: 0.6 },
    slot: { x: 10, y: 3.2 },
    chute: { x: 11.8, y: 12.6 },
    out: { x: 16, y: 14.2 },
    foot: 14.6,
};
const BALL = 3;
const CARD = { own: 10, w: 9.2, h: (1 * 2 + 5) * (9.2 / 10), text: 34 };
const outCell = (i: number): Pt => ({ x: 9.25, y: 5.4 + 2 * i });

/** Where everything stands on the sheet. */
function layout(bench: Bench) {
    const ground = bench.wide ? 31 : 37;
    return {
        width: bench.wide ? 75 : 46,
        ground,
        machine: { x: bench.wide ? 42.5 : 14.5, y: ground - MACHINE.foot },
        basket: { x: bench.wide ? 30 : 2, y: ground - 7.6 },
        table: { x: bench.wide ? 60.5 : 32.5, y: bench.wide ? 16 : 22 },
    };
}
const TONES = ["sky", "berry", "glow", "mint"];
const on = (at: Pt, p: Pt): Pt => ({ x: at.x + p.x, y: at.y + p.y });

/** What the rule round is made of, read once from its start: every number that can be fed, and every card's rule, in order. */
interface Bench {
    wide?: boolean;
    inputs: number[];
    cards: string[];
}

export function benchOf(round: Round): Bench {
    const feeds = round.start.moves.filter((m) => m.say.startsWith("Feed in "));
    const inputs = feeds.map((m) => Number(m.say.slice("Feed in ".length)));
    const after = feeds[0]?.next();
    const cards = (after?.moves ?? [])
        .filter((m) => m.say.startsWith("The rule is "))
        .map((m) => m.say.slice("The rule is ".length));
    return { inputs, cards };
}

/** Array.isArray on its own reads as a list of anything; this keeps what is in it unknown. */
const isList = (x: unknown): x is readonly unknown[] => Array.isArray(x);

/** What a position has done: the rows of the table, the numbers fed, and the card named, by its index, or null. */
export function readRule(pos: Position): {
    rows: [number, number][];
    fed: number[];
    named: number | null;
    shown: string;
} {
    // The table's rows and the machine's rule come off the board's parameters, which are unknown
    // until they have been read: a part's params are whatever the drawing takes.
    const table = pos.board.parts.find((p) => p.art === "inout")?.params.rows;
    const rows = isList(table)
        ? table.flatMap((r): [number, number][] =>
              isList(r) ? [[Number(r[0]), Number(r[1])]] : [],
          )
        : [];
    const tail = pos.key.split("|")[1] ?? "-";
    const rule = pos.board.parts.find((p) => p.art === "machine")?.params.rule;
    return {
        rows,
        fed: rows.map((r) => r[0]),
        named: tail === "-" ? null : Number(tail),
        shown: typeof rule === "string" ? rule : "",
    };
}

function ballSpot(bench: Bench, n: number): Pt {
    const i = Math.max(0, bench.inputs.indexOf(n));
    const row = Math.floor(i / 3),
        col = i % 3,
        inRow = Math.min(3, bench.inputs.length - row * 3);
    return {
        x: layout(bench).basket.x + 4.5 + (col - (inRow - 1) / 2) * 3.1 - BALL / 2,
        y: layout(bench).basket.y + 4.1 + 0.6 - BALL - row * 2.7,
    };
}

function cardSpot(bench: Bench, i: number): Pt {
    const per = bench.wide ? 3 : bench.cards.length > 9 ? 4 : 5;
    const row = Math.floor(i / per),
        col = i % per;
    return {
        x: (bench.wide ? 0 : (layout(bench).width - per * CARD.w) / 2) + col * CARD.w,
        y: 0.5 + row * (CARD.h + 0.5),
    };
}

const hopper = (bench: Bench): Pt => on(layout(bench).machine, MACHINE.hopper);
const slot = (bench: Bench): Pt => on(layout(bench).machine, MACHINE.slot);

function sceneOf(bench: Bench, pos: Position): Scene {
    const r = readRule(pos);
    const turns = r.fed.length + (r.named === null ? 0 : 1);
    const parts: Part[] = [
        {
            art: "arcade.ground",
            key: "ground",
            at: { x: 0, y: layout(bench).ground - 0.4 },
            params: { w: layout(bench).width },
            z: 1,
        },
        {
            art: "inout",
            key: "table",
            at: layout(bench).table,
            params: { rule: pos.won ? r.shown : "", rows: r.rows, blanks: [] },
            z: 20,
        },
        {
            art: "rulemachine",
            key: "machine",
            at: layout(bench).machine,
            params: { rule: r.shown, pull: 0, turn: turns, lit: pos.won },
            z: 30,
        },
        {
            art: "basket",
            key: "basket",
            at: layout(bench).basket,
            params: { item: "ball", count: 0, label: "" },
            z: 35,
        },
        ...bench.inputs
            .filter((n) => !r.fed.includes(n))
            .map((n, i): Part => ({
                art: "numberball",
                key: `ball:${n}`,
                at: ballSpot(bench, n),
                params: {
                    n: String(n),
                    tone: TONES[bench.inputs.indexOf(n) % TONES.length] ?? "sky",
                },
                z: 32 + i,
                hold: { x: BALL / 2, y: 0.2 },
            })),
        ...bench.cards
            .map((label, i): Part | null =>
                r.named === i
                    ? null
                    : {
                          art: "pinned",
                          key: `card:${i}`,
                          at: cardSpot(bench, i),
                          params: {
                              hold: "pin",
                              lines: [label],
                              width: CARD.own,
                              size: CARD.text,
                              align: "middle",
                          },
                          size: CARD.w,
                          z: 40,
                          hold: { x: CARD.w / 2, y: 1.5 },
                      },
            )
            .filter((p): p is Part => p !== null),
    ];
    return { parts, size: { w: layout(bench).width, h: layout(bench).ground + 0.9 } };
}

function handlesOf(bench: Bench, pos: Position, minTarget: number): Handle[] {
    const r = readRule(pos);
    const feed = (n: number): number => pos.moves.findIndex((m) => m.say === `Feed in ${n}`);
    const name = (label: string): number =>
        pos.moves.findIndex((m) => m.say === `The rule is ${label}`);
    const into = atLeast({ cx: hopper(bench).x, cy: hopper(bench).y + 0.6, r: 2.6 }, minTarget);
    const roof = atLeast({ cx: slot(bench).x, cy: slot(bench).y, r: 3 }, minTarget);
    const balls = bench.inputs
        .filter((n) => !r.fed.includes(n))
        .map((n): Handle => {
            const i = feed(n);
            const choice: Choice = i >= 0 ? { moves: [i] } : { moves: [] };
            return {
                key: `ball:${n}`,
                mode: "free",
                home: ballSpot(bench, n),
                targets: [{ id: "hopper", shape: into, carries: choice }],
                tap: choice,
            };
        });
    const cards = bench.cards
        .map((label, c): Handle | null => {
            if (r.named === c) return null;
            const i = name(label);
            const choice: Choice =
                i >= 0
                    ? { moves: [i] }
                    : {
                          moves: [],
                          refuse: "Feed the machine a number first, so there is something to go on.",
                      };
            const targets: Target<Choice>[] = [{ id: "slot", shape: roof, carries: choice }];
            return { key: `card:${c}`, mode: "free", home: cardSpot(bench, c), targets };
        })
        .filter((h): h is Handle => h !== null);
    return [...balls, ...cards];
}

/** A number fed in, or a card posted, worked out from what changed between the two positions. */
function ruleBeat(
    bench: Bench,
    from: Position,
    to: Position,
    was: Scene,
    hand: Release | null,
    seed: number,
): Beat {
    const s = score(),
        rnd = seeded(seed),
        a = readRule(from),
        b = readRule(to);
    const machineAt = layout(bench).machine;
    const turn0 = a.fed.length + (a.named === null ? 0 : 1);
    const leaving = (key: string): Part | undefined => was.parts.find((p) => p.key === key);
    /** The lever pulled and let go, the cogs turned once, and the machine shaking while they turn. Returns when the cogs stop. */
    const work = (at: number): number => {
        s.track("machine", "param:pull", at, 0, 1, { ease: "out" }, 0.22);
        s.track("machine", "param:pull", at + 0.22, 1, 0, {
            spring: { hz: 2.6, zeta: 0.45 },
            v0: 0,
        });
        s.cue(at + 0.2, "bump");
        const stop = s.track(
            "machine",
            "param:turn",
            at + 0.3,
            turn0,
            turn0 + 1,
            { ease: "inOut" },
            0.9,
        );
        let t = at + 0.3,
            was = 0;
        for (const q of [0.025, -0.02, 0.015, 0]) {
            t = s.track("machine", "squash", t, was, q, { ease: "inOut" }, 0.22);
            was = q;
        }
        return stop;
    };
    const carry = (key: string, home: Pt, over: Pt): number => {
        s.z(key, 0, 60);
        if (hand?.key === key) {
            s.track(key, "angle", 0, hand.angle, 0, { ease: "out" }, 0.25);
            return Math.max(0.25, s.glide(key, 0, hand.at, over, SPRINGS.snap, hand.v));
        }
        s.cue(0, "lift");
        return s.lob(key, 0, home, over, 2.2);
    };

    const fedNow = b.fed.find((n) => !a.fed.includes(n));
    if (fedNow !== undefined) {
        const key = `ball:${fedNow}`,
            part = leaving(key);
        if (part) s.extra(part);
        const mouth = hopper(bench),
            over = { x: mouth.x - BALL / 2, y: mouth.y - BALL - 2.4 };
        const inside = { x: over.x, y: mouth.y - BALL * 0.6 };
        const dropped =
            s.drop(key, carry(key, ballSpot(bench, fedNow), over), over, inside, 0)[0] ?? 0;
        s.track(key, "y", dropped, inside.y, inside.y + 1.4, { ease: "inOut" }, 0.24);
        s.track(key, "scale", dropped, 1, 0, { ease: "inOut" }, 0.24);
        s.cue(dropped, "place");
        const worked = work(dropped + 0.1);
        // The answer comes out of the chute on a ball of its own, rolls down it, and is thrown up into the table's next row.
        const row = b.rows.length - 1,
            answer = b.rows[row]?.[1] ?? 0;
        const top = on(machineAt, MACHINE.chute),
            end = on(machineAt, MACHINE.out);
        const out = "answer";
        s.extra({
            art: "numberball",
            key: out,
            at: { x: top.x - BALL / 2, y: top.y - BALL / 2 },
            params: { n: String(answer), tone: "glow" },
            scale: 0,
            z: 50,
        });
        const appear = worked - 0.35;
        s.track(out, "scale", appear, 0, 1, { ease: "back" }, 0.2);
        const rolled = s.glide(
            out,
            appear + 0.1,
            { x: top.x - BALL / 2, y: top.y - BALL / 2 },
            { x: end.x - BALL / 2, y: end.y - BALL + 0.2 },
            SPRINGS.drive,
        );
        s.cue(appear + 0.1, "lift");
        const cell = on(layout(bench).table, outCell(row)),
            into = { x: cell.x - BALL / 2, y: cell.y - BALL / 2 };
        const landed = s.lob(
            out,
            rolled,
            { x: end.x - BALL / 2, y: end.y - BALL + 0.2 },
            into,
            2.4 + rnd(),
        );
        s.track(out, "scale", landed, 1, 0, { ease: "inOut" }, 0.18);
        s.set("table", 0, { rows: a.rows });
        s.set("table", landed + 0.05, { rows: b.rows });
        s.burst(landed + 0.05, "sparkle", cell.x, cell.y, 6);
        s.cue(landed + 0.05, "ring");
        return s.beat();
    }

    const named = b.named;
    if (named === null) return s.beat();
    const key = `card:${named}`,
        part = leaving(key);
    if (part) s.extra(part);
    const mouth = slot(bench),
        over = { x: mouth.x - CARD.w / 2, y: mouth.y - CARD.h - 1.2 };
    s.set("machine", 0, { rule: a.shown, lit: false });
    s.set("table", 0, { rule: "" });
    const above = carry(key, cardSpot(bench, named), over);
    // Into the slot: behind the machine's front from here, so the card goes in rather than over it, and
    // then the last of it is pulled down out of sight.
    s.z(key, above, 25);
    const posted = s.track(key, "y", above, over.y, mouth.y - 1.4, { ease: "inOut" }, 0.38);
    s.track(key, "y", posted + 0.25, mouth.y - 1.4, mouth.y + 0.2, { ease: "inOut" }, 0.3);
    s.track(key, "scale", posted + 0.25, 1, 0, { ease: "inOut" }, 0.3);
    s.cue(posted, "place");
    const worked = work(posted);
    s.set("machine", worked, { rule: b.shown, lit: to.won });
    s.set("table", worked, { rule: to.won ? b.shown : "" });
    if (to.won) {
        s.cue(worked, "ring");
        s.burst(worked, "sparkle", machineAt.x + 12.4, machineAt.y + 2.2, 14);
    } else {
        s.cue(worked, "nope");
    }
    return s.beat();
}

/** The machine lit: it hops on its legs and sparkles from its bulb. */
function ruleFinish(bench: Bench, seed: number): Beat {
    const s = score(),
        rnd = seeded(seed);
    const up = s.track(
        "machine",
        "y",
        0.1,
        layout(bench).machine.y,
        layout(bench).machine.y - 0.9,
        { ease: "out" },
        0.18,
    );
    s.squash(
        "machine",
        s.track(
            "machine",
            "y",
            up,
            layout(bench).machine.y - 0.9,
            layout(bench).machine.y,
            { fall: 42 },
            0.21,
        ),
        0.05,
    );
    s.burst(
        0.05,
        "sparkle",
        layout(bench).machine.x + 12.4,
        layout(bench).machine.y + 1.6,
        10 + Math.floor(rnd() * 4),
    );
    s.burst(up, "dust", layout(bench).machine.x + 7, layout(bench).ground, 6);
    return s.beat();
}

function activity(kind: string) {
    const a = ACTIVITIES.find((x) => x.kind === kind);
    if (!a) throw new Error(`no activity plays ${kind}`);
    return a;
}

const listed = activity("rule");

export const ruleGame: TurnGame = {
    id: "rule",
    title: "Find the rule",
    group: "puzzle",
    cover: { art: "rulemachine", params: { rule: "", pull: 0, turn: 0, lit: false } },
    hint: "Drop a number ball into the machine or tap it, then post the card with its rule into the slot on its roof",
    // The titles do not say the version's values, because for this game the values are the answer.
    levels: [
        {
            title: "The first machine",
            grades: [3, 4],
            round: () => listed.round(0),
            intro: "The machine is using one of the rules on the cards. Feed it a number and watch what comes out.",
        },
        {
            title: "The second machine",
            grades: [3, 4],
            round: () => listed.round(1),
            intro: "Another machine, and the same nine cards to choose from.",
        },
        {
            title: "The third machine",
            grades: [3, 4],
            round: () => listed.round(2),
            intro: "A third machine. Some numbers tell the cards apart better than others.",
        },
        {
            title: "Three numbers to feed",
            grades: [3, 4],
            round: () => listed.round(3),
            intro: "Only three numbers to feed this time, and no 1 among them.",
        },
        {
            title: "Twelve cards that agree",
            grades: [4, 4],
            round: () => listed.round(4),
            intro: "Twelve cards now, and some of them give the same answer for the same number.",
        },
        {
            title: "Twelve cards, and no 1",
            grades: [4, 4],
            round: () => listed.round(5),
            intro: "The same twelve cards, and no 1 to feed.",
        },
    ],
    ends: {
        won: "That is the rule the machine was using.",
        stuck: "The machine is showing its own rule now. Start again to find it from the numbers.",
    },
    win: timeline(
        [{ name: "star", from: 0, to: 1, at: 0.5, dur: 0.4, ease: easeBack }],
        [{ at: 0.9, cue: "win" }],
    ),
    open(round: Round, ctx: Ctx): Session<Position> {
        const bench = benchOf(round);
        bench.wide = ctx.stage.room >= 900;
        return {
            glide: SPRINGS.back,
            parts: (pos) => {
                bench.wide = ctx.stage.room >= 900;
                return sceneOf(bench, pos);
            },
            handles: (pos) => handlesOf(bench, pos, ctx.minTarget()),
            preview(_pos, handle) {
                const at = handle.key.startsWith("ball:") ? hopper(bench) : slot(bench);
                ctx.stage.marks("receiver", [{ kind: "ring", x: at.x, y: at.y, r: 1.2 }]);
            },
            unpreview() {
                ctx.stage.marks("receiver", []);
            },
            after(pos) {
                for (const n of bench.inputs) ctx.stage.tag(`ball:${n}`, "grab", !pos.won);
                bench.cards.forEach((_, i) =>
                    ctx.stage.tag(`card:${i}`, "grab", !pos.won && pos.moves.length > 0),
                );
            },
            beat: (from, to, o) => ruleBeat(bench, from, to, o.was, o.hand, o.seed),
            finish: (_pos, o) => ruleFinish(bench, o.seed),
            star: () => on(layout(bench).machine, { x: 12.4, y: 0.6 }),
        };
    },
};
