// The ten activities, as data.
//
// This is what an authored `.lumi` activity file would produce once the notation has the node type
// sketched in .docs/activities.md. It is written here by hand until that node type exists, and it is
// deliberately dull data rather than code: if any of this needed a function, the claim that
// activities can be authored would be wrong.
import { jump, type JumpVersion } from "./jump";
import { race, type RaceVersion, type Trackside } from "./race";
import { pay, type PayVersion } from "./pay";
import { pour, type PourVersion } from "./pour";
import { rule, type RuleVersion } from "./rule";
import { share, type ShareVersion } from "./share";
import { shunt, type ShuntVersion } from "./shunt";
import { spell, type SpellVersion } from "./spell";
import { weigh, type WeighVersion } from "./weigh";
import { bind, type Activity, type Mechanic, type Round } from "./games";

const weighing: Activity<WeighVersion> = {
    id: "weigh.same-weight",
    title: "Balance the pans",
    kind: "weigh",
    skills: ["equivalence", "bonds-to-10"],
    grades: [1, 3],
    paper: "balance.chain",
    versions: [
        {
            values: "cube = 6, ball = 2, star = 1",
            v: {
                fixed: ["cube"],
                tray: { ball: 4, star: 2 },
                worth: { cube: 6, ball: 2, star: 1 },
                pans: "right",
                capacity: 6,
            },
        },
        {
            values: "apple = 3, ball = 2, star = 1, either pan",
            v: {
                fixed: ["apple", "apple"],
                tray: { ball: 4, star: 3 },
                worth: { apple: 3, ball: 2, star: 1 },
                pans: "both",
                capacity: 6,
            },
        },
        {
            values: "two cubes, cube = 4, apple = 5, ball = 2, star = 1",
            v: {
                fixed: ["cube", "cube"],
                tray: { apple: 2, ball: 4, star: 2 },
                worth: { cube: 4, apple: 5, ball: 2, star: 1 },
                pans: "right",
                capacity: 6,
            },
        },
        {
            values: "no stars, cube = 7, apple = 3, ball = 2",
            v: {
                fixed: ["cube"],
                tray: { apple: 3, ball: 4 },
                worth: { cube: 7, apple: 3, ball: 2 },
                pans: "right",
                capacity: 6,
            },
        },
        {
            // Nothing in the tray makes 5 on the right, so the win has a ball going in with the cube.
            values: "a ball goes in with the cube, cube = 5, apple = 4, ball = 3, either pan",
            v: {
                fixed: ["cube"],
                tray: { apple: 2, ball: 2 },
                worth: { cube: 5, apple: 4, ball: 3 },
                pans: "both",
                capacity: 6,
            },
        },
        {
            // Three props make at most 11 on the right and never 10, so both pans are loaded.
            values: "pans that hold three, apple = 5, cube = 5, ball = 3, star = 1, either pan",
            v: {
                fixed: ["apple", "apple"],
                tray: { cube: 1, ball: 3, star: 2 },
                worth: { apple: 5, cube: 5, ball: 3, star: 1 },
                pans: "both",
                capacity: 3,
            },
        },
    ],
};

const jumping: Activity<JumpVersion> = {
    id: "jump.land-on",
    title: "Land on the number",
    kind: "jump",
    skills: ["bonds-to-10", "place-value.tens", "negative-numbers"],
    grades: [1, 4],
    paper: "numberline.missing-jump",
    versions: [
        {
            values: "0 to 20, land on 13",
            v: { from: 0, to: 20, step: 1, start: 0, target: 13, cards: [10, 5, 2, 1, -1] },
        },
        {
            values: "-10 to 10, land on -4",
            v: { from: -10, to: 10, step: 1, start: 0, target: -4, cards: [-5, 3, -2, 6, -3] },
        },
    ],
};

/** The nine cards on the table. The machine is using one of them. */
const CARDS: RuleVersion["cards"] = [
    { op: "add", a: 2 },
    { op: "add", a: 5 },
    { op: "add", a: 9 },
    { op: "mul", a: 2 },
    { op: "mul", a: 3 },
    { op: "mul", a: 4 },
    { op: "mul", a: 10 },
    { op: "muladd", a: 2, b: 1 },
    { op: "muladd", a: 3, b: -1 },
];

/**
 * Twelve cards in pairs and threes that give the same number for some number fed in: + 2 and × 2 both
 * make 4 from 2, and × 2 shares an answer with another card at every number from 1 to 4. Only 5 comes
 * close to telling all twelve apart at once, so which number to feed is the whole question.
 */
const TWELVE: RuleVersion["cards"] = [
    { op: "add", a: 2 },
    { op: "mul", a: 2 },
    { op: "add", a: 3 },
    { op: "muladd", a: 2, b: 1 },
    { op: "add", a: 4 },
    { op: "mul", a: 3 },
    { op: "add", a: 6 },
    { op: "mul", a: 4 },
    { op: "add", a: 8 },
    { op: "muladd", a: 3, b: 2 },
    { op: "mul", a: 5 },
    { op: "muladd", a: 4, b: -2 },
];

// One version per card, which is what `let answer=0..8` would generate. Three are listed; the
// prover is run over all nine in the tests, since that is the point of listing them. The three after
// them take a number away to feed, then give twelve cards that agree, then take away the 1.
const finding: Activity<RuleVersion> = {
    id: "rule.which-machine",
    title: "Find the rule",
    kind: "rule",
    skills: ["multiplication.tables", "function-machines", "inverse"],
    grades: [3, 4],
    paper: "inout.find-the-rule",
    versions: [
        ...[4, 7, 1].map((answer) => ({
            values: `the machine is doing ${answer === 4 ? "× 3" : answer === 7 ? "× 2 + 1" : "+ 5"}`,
            v: { cards: CARDS, answer, inputs: [1, 2, 3, 4] },
        })),
        {
            values: "three numbers to feed, the machine is doing × 3 - 1",
            v: { cards: CARDS, answer: 8, inputs: [2, 3, 4] },
        },
        {
            values: "twelve cards, the machine is doing × 2",
            v: { cards: TWELVE, answer: 1, inputs: [1, 2, 3, 4] },
        },
        {
            values: "twelve cards and no 1, the machine is doing + 4",
            v: { cards: TWELVE, answer: 4, inputs: [2, 3, 4, 5] },
        },
    ],
};

/** Every version of the rule activity, for the prover to run over. */
const everyRuleVersion: Activity<RuleVersion> = {
    ...finding,
    versions: CARDS.map((_, answer) => ({
        values: `answer ${answer}`,
        v: { cards: CARDS, answer, inputs: [1, 2, 3, 4] },
    })),
};

// The race, in two tiers. One mechanic, two activities, because the track shape changes both the
// controls and the skill. On a track one lane deep the only legal changes are faster, slower and
// hold, and the question is where to start braking; on a circuit the velocity is a pair and the
// question is when to start turning. Two activities rather than two versions, because those are
// different things to have learned and they are two grades apart.

const birds = (at: [number, number], near: [number, number]): Trackside => ({
    art: "birdrow",
    params: { count: 3, facing: [1, -1, 1], wire: true },
    at,
    near,
    name: "the birds on the wire",
});
const medals = (at: [number, number], near: [number, number]): Trackside => ({
    art: "medalrow",
    params: { labels: ["1", "2", "3"] },
    at,
    near,
    name: "the medals",
});

/** Eleven cells, so the ten marks of the scale under the lanes drawing land on the cells. */
const STRAIGHT = ["S#########F"];

const stopping: Activity<RaceVersion> = {
    id: "race.stop-on-the-line",
    title: "Stop on the line",
    kind: "race",
    skills: ["counting-in-steps", "speed.per-turn", "estimating-distance"],
    grades: [1, 2],
    paper: "numberline.count-in-tens",
    versions: [
        {
            values: "100 metres in tens, up to 30 a turn",
            v: {
                track: STRAIGHT,
                from: [0, 0],
                finish: "stop",
                top: 3,
                look: "lanes",
                metres: 100,
                around: [medals([0, 7], [10, 0])],
            },
        },
        {
            values: "50 metres in fives, up to 10 a turn",
            v: {
                track: STRAIGHT,
                from: [0, 0],
                finish: "stop",
                top: 2,
                look: "lanes",
                metres: 50,
                around: [birds([0, 7], [5, 0])],
            },
        },
    ],
};

/**
 * A closed ring two cells wide, with the start band, the finish band one cell behind it and the lap
 * marker on the far straight, so the finish only counts after a whole lap either way round.
 */
const RING = [
    "######C######",
    "######C######",
    "##.........##",
    "##.........##",
    "##.........##",
    "##.........##",
    "#####FS######",
    "#####FS######",
];

/** The same idea with the middle pushed across, so one corner tightens as the next one opens. */
const CHICANE = [
    "######C#####",
    "######C#####",
    "##......####",
    "##......####",
    "####......##",
    "####......##",
    "#####FS#####",
];

const cornering: Activity<RaceVersion> = {
    id: "race.take-the-corner",
    title: "Take the corner",
    kind: "race",
    skills: ["coordinates.grid", "speed.acceleration", "planning-ahead"],
    grades: [3, 4],
    paper: "coords.plot-the-route",
    versions: [
        {
            values: "the ring, up to 3 cells a turn",
            v: {
                track: RING,
                from: [6, 7],
                finish: "reach",
                top: 3,
                look: "circuit",
                metres: 0,
                around: [
                    {
                        art: "minibeasts",
                        params: { kinds: ["ladybird", "butterfly", "bee"], spots: 7, legs: false },
                        at: [7, 7],
                        near: [2, 4],
                        name: "the minibeasts in the middle",
                    },
                ],
            },
        },
        {
            values: "the chicane, up to 3 cells a turn",
            v: {
                track: CHICANE,
                from: [6, 6],
                finish: "reach",
                top: 3,
                look: "circuit",
                metres: 0,
                around: [birds([0, 18], [6, 6])],
            },
        },
    ],
};

// The yard. Three versions and they are three different problems rather than three sizes of one.
// The first is a single carriage out of place, which is one push, one run round and one pull. The
// second is a train standing backwards, where nothing works until the child sees that pulling out
// of the far end reverses what went in. The third is four carriages jumbled, which needs both
// ideas.

const shunting: Activity<ShuntVersion> = {
    id: "shunt.into-order",
    title: "Shunt the carriages",
    kind: "shunt",
    skills: ["ordering", "position.sequence", "planning-ahead"],
    grades: [1, 3],
    paper: "sequence.put-in-order",
    versions: [
        {
            values: "3 1 2, and room for two in the siding",
            v: { train: ["3", "1", "2"], order: ["1", "2", "3"], siding: 2, windows: 2 },
        },
        {
            values: "3 2 1, standing backwards",
            v: { train: ["3", "2", "1"], order: ["1", "2", "3"], siding: 3, windows: 2 },
        },
        {
            values: "2 4 1 3, and room for three",
            v: { train: ["2", "4", "1", "3"], order: ["1", "2", "3", "4"], siding: 3, windows: 2 },
        },
    ],
};

// The bench. Six versions, and the third is the puzzle everyone has met: five and three, measure
// four. The first two are the same idea at a size a seven-year-old can hold, in millilitres off a
// scale they have read in a lesson, so the classic arrives as the third rather than as a wall. The
// last three take eight, eight and six pours, on jugs whose scales are read in litres, in hundreds
// of millilitres and in a litre against a small jug. A version with three jugs offers more than the
// eight moves a position may, so there is none.

const pouring: Activity<PourVersion> = {
    id: "pour.measure-it-out",
    title: "Measure it out",
    kind: "pour",
    skills: ["capacity.read-a-scale", "addition.bridging", "subtraction.difference"],
    grades: [2, 4],
    paper: "jug.read-the-scale",
    versions: [
        {
            values: "500 and 300, measure 200",
            v: {
                jugs: [
                    { max: 500, step: 100 },
                    { max: 300, step: 100 },
                ],
                target: 200,
                unit: "ml",
            },
        },
        {
            values: "500 and 300, measure 100",
            v: {
                jugs: [
                    { max: 500, step: 100 },
                    { max: 300, step: 100 },
                ],
                target: 100,
                unit: "ml",
            },
        },
        {
            values: "5 and 3, measure 4",
            v: {
                jugs: [
                    { max: 5, step: 1 },
                    { max: 3, step: 1 },
                ],
                target: 4,
                unit: "l",
            },
        },
        {
            values: "7 and 3, measure 5",
            v: {
                jugs: [
                    { max: 7, step: 1 },
                    { max: 3, step: 1 },
                ],
                target: 5,
                unit: "l",
            },
        },
        {
            values: "900 and 400, measure 600",
            v: {
                jugs: [
                    { max: 900, step: 100 },
                    { max: 400, step: 100 },
                ],
                target: 600,
                unit: "ml",
            },
        },
        {
            values: "1 litre and 300, measure 100",
            v: {
                jugs: [
                    { max: 1000, step: 100 },
                    { max: 300, step: 100 },
                ],
                target: 100,
                unit: "ml",
            },
        },
    ],
};

// The shop. One activity with the two framings money has: make the amount, and make the change. The
// limit on the counter is the difficulty and it is visible, since the goal sentence says it.

const paying: Activity<PayVersion> = {
    id: "pay.make-the-amount",
    title: "Make the amount",
    kind: "pay",
    skills: ["money.coins", "money.change", "addition.to-100"],
    grades: [1, 4],
    paper: "change.count-up",
    versions: [
        {
            values: "65 cents in four coins",
            v: {
                price: 65,
                paid: 0,
                drawer: { quarter: 3, dime: 4, nickel: 3, penny: 5 },
                most: 4,
            },
        },
        {
            values: "change from a dollar for 48 cents",
            v: {
                price: 48,
                paid: 100,
                drawer: { quarter: 3, dime: 4, nickel: 3, penny: 5 },
                most: 5,
            },
        },
        {
            values: "$1.87 in seven pieces",
            v: {
                price: 187,
                paid: 0,
                drawer: { "1": 2, quarter: 4, dime: 3, nickel: 2, penny: 4 },
                most: 7,
            },
        },
    ],
};

// The plates. Halves and quarters first, then eighths, then thirds and sixths between three plates,
// which is the order the fraction lessons take them in. The pieces are deliberately not all the
// same size: that is what makes the share a question about equivalence rather than about counting.

const sharing: Activity<ShareVersion> = {
    id: "share.fair-shares",
    title: "Share it out",
    kind: "share",
    skills: ["fractions.equivalence", "fractions.add", "division.sharing"],
    grades: [2, 4],
    paper: "fraction.fair-shares",
    versions: [
        {
            values: "halves and quarters between two",
            v: { pieces: [2, 2, 1, 1, 1, 1], whole: 4, names: ["Ann", "Ben"] },
        },
        {
            values: "eighths between two",
            v: { pieces: [4, 4, 2, 2, 1, 1], whole: 8, names: ["Ann", "Ben"] },
        },
        {
            values: "sixths between three",
            v: { pieces: [3, 3, 2, 2, 1, 1], whole: 6, names: ["Ann", "Ben", "Cal"] },
        },
    ],
};

// The boxes. Four words and each one is a decision about spelling rather than about letters. Star
// is three sounds in four letters. Bus is the easy one and it is first on purpose. Train has to
// choose between ai and ay, and clock between ck and k, which are the two choices English makes a
// child learn by meeting them.

const spelling: Activity<SpellVersion> = {
    id: "spell.the-picture",
    title: "Spell the picture",
    kind: "spell",
    skills: ["phonics.segmenting", "phonics.graphemes", "spelling.choices"],
    grades: [1, 2],
    paper: "soundboxes.spell-it",
    versions: [
        {
            values: "bus, three sounds",
            v: {
                sounds: ["b", "u", "s"],
                tiles: ["b", "u", "s", "d", "o", "ss"],
                word: "bus",
                picture: { art: "bus", params: { windows: 5, on: 3, sign: "12" } },
            },
        },
        {
            values: "star, three sounds in four letters",
            v: {
                sounds: ["s", "t", "ar"],
                tiles: ["s", "t", "ar", "or", "sh", "c"],
                word: "star",
                picture: { art: "prop.star", params: {} },
            },
        },
        {
            values: "clock, and the ck at the end",
            v: {
                sounds: ["c", "l", "o", "ck"],
                tiles: ["c", "l", "o", "ck", "ch", "u"],
                word: "clock",
                picture: { art: "clock", params: { h: 3, m: 0 } },
            },
        },
        {
            values: "train, and the ai in the middle",
            v: {
                sounds: ["t", "r", "ai", "n"],
                tiles: ["t", "r", "ai", "n", "ay", "m"],
                word: "train",
                picture: { art: "train", params: { carriages: 2, windows: 3, on: 4 } },
            },
        },
    ],
};

/** An activity with its mechanic already matched to it, so nothing outside carries the types. */
export interface Listed {
    id: string;
    title: string;
    kind: string;
    skills: string[];
    grades: [number, number];
    paper: string;
    versions: string[];
    round(version: number): Round;
}

const listed = <V, S, M>(m: Mechanic<V, S, M>, a: Activity<V>): Listed => ({
    id: a.id,
    title: a.title,
    kind: a.kind,
    skills: a.skills,
    grades: a.grades,
    paper: a.paper,
    versions: a.versions.map((x) => x.values),
    round: (version: number) => bind(m, a, version),
});

/**
 * A mechanic with its three types forgotten: what a gate over the contracts reads, which is the
 * same question whatever a position turns out to be. The functions are left out rather than
 * widened, since their arguments and their results are the forgotten types and a mechanic over real
 * positions is not a mechanic over `never`.
 */
export type AnyMechanic = Pick<
    Mechanic<never, never, never>,
    "id" | "title" | "reversible" | "contract"
>;

/** Every mechanic the activities use, so nothing can be added without the gate seeing it. */
export const MECHANICS: AnyMechanic[] = [weigh, jump, rule, race, shunt, pour, pay, share, spell];

export const ACTIVITIES: Listed[] = [
    listed(weigh, weighing),
    listed(jump, jumping),
    listed(rule, finding),
    listed(race, stopping),
    listed(race, cornering),
    listed(shunt, shunting),
    listed(pour, pouring),
    listed(pay, paying),
    listed(share, sharing),
    listed(spell, spelling),
];

export const ruleRound = (version: number): Round => bind(rule, everyRuleVersion, version);
export const RULE_VERSIONS = everyRuleVersion.versions.length;
