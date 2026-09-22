// The invented half of the demo family, the Harlows, which `npm run db:demo` writes (.docs/api.md).
// Everything here is made up: the family, its grown-ups and children, what each child is like, the
// weekly timetable, the days off, who marks what, and the question a parent wrote. Everything the
// children are asked is real: server/db/seed/demo.ts takes the lessons in each track's own order
// from content/curriculum/, and tools/scripts/demo-work.ts works out each question's variant,
// answer, named mistakes and hints with the notation engine, and each game round with the prover.
// Dates are laid backwards from the day the demo is seeded, so its last school day is always the
// last weekday before that day.

import type { EventData } from "../../../engine/answer";
import { idFor } from "./seed";

export type Track = "maths" | "reading" | "writing" | "coding" | "physics";

/** How a child is at one track. Invented, and different per child, which is the point of the demo. */
export interface Learner {
    /** The chance of a right answer first time on the first day of a lesson, and on its last. */
    first: [number, number];
    /** The chance a wrong first try is one of the item's named mistakes rather than a slip. */
    named: number;
    /** The chance of opening a hint after a wrong try, when the item has one. */
    hint: number;
    /** The chance the next try is right. */
    retry: number;
    /** Seconds to the first keystroke, as a range. A child reading slowly takes longer. */
    think: [number, number];
}

export interface DemoTrack {
    track: Track;
    /** Days a week, on the weekdays .docs/api.md gives for each count. */
    perWeek: number;
    /** Sittings each lesson gets before the family moves on, lesson by lesson, in track order. */
    days: number[];
    learner: Learner;
    /** The share of this track's sittings done on a printed sheet rather than on the tablet. */
    paper: number;
}

export interface DemoKid {
    key: string;
    name: string;
    grade: number;
    /** What a parent chose: the picture on the tablet's switcher, the guide and how lessons are taught. */
    settings: Record<string, unknown>;
    /**
     * The journal's worlds as a parent chose them, written as a `world-chosen` event when the plan is
     * first set up. They hold only what differs from each world's own and only what that world offers
     * (school/worlds/choice.ts drops anything else when it reads them back).
     */
    worlds: EventData["world-chosen"];
    tracks: DemoTrack[];
    /**
     * The subjects this child's grade would otherwise start with, which Anna turned off when she set
     * the plan up. A plan nobody has changed carries its grade's default (`DEFAULT_TRACKS` in
     * school/tracks.ts), so a family that does three subjects has said so about the rest, and this
     * invented family says it here. A test folds each child and fails if the two drift apart.
     */
    off: string[];
    /** Minutes past eight in the morning when this child's first sitting of the day starts. */
    morning: number;
    /** How often a game follows a screen sitting. */
    games: number;
    /** The parent who prints this child's sheets, and the one who marks them unless a tutor does. */
    prints: string;
    marks: string[];
}

export interface DemoAdult {
    key: string;
    name: string;
    email: string;
}

export const DEMO_FAMILY_KEY = "harlow";

export const DEMO = {
    family: { id: idFor("demo", DEMO_FAMILY_KEY), name: "Harlow", time_zone: "America/Denver" },
    /** Two parents with equal rights. Anna started the family and Ben joined the next day. */
    parents: [
        { key: "anna", name: "Anna Harlow", email: "demo-parent1@lumischool.ai" },
        { key: "ben", name: "Ben Harlow", email: "demo-parent2@lumischool.ai" },
    ] satisfies DemoAdult[],
    /** The family's PIN, for leaving a children's view. The seed keeps only its keyed hash. */
    pin: "2468",
    /** The browser Anna opened the children's view on, again each time the last one ran out. */
    kidView: { name: "Safari on an iPad", weeks: 12 },
};

/**
 * Two tutors. Marcus tutored Ivy's maths from the third week and was removed in the seventh, so an
 * ended membership with marks of his is in the log; Grace tutors Leo's reading from the ninth week
 * and her window is open on the day the demo is seeded. Weeks count from 0, the first school week.
 */
export const TUTORS = [
    {
        key: "marcus",
        name: "Marcus Reid",
        email: "marcus.reid@example.com",
        kid: "ivy",
        invitedBy: "anna",
        fromWeek: 2,
        toWeek: 13,
        removedWeek: 6,
    },
    {
        key: "grace",
        name: "Grace Okafor",
        email: "grace.okafor@example.com",
        kid: "leo",
        invitedBy: "anna",
        fromWeek: 8,
        toWeek: 26,
        removedWeek: null,
    },
] as const;

const NEEDS_HINTS: Learner = {
    first: [0.42, 0.72],
    named: 0.75,
    hint: 0.85,
    retry: 0.72,
    think: [6, 16],
};

export const KIDS: DemoKid[] = [
    {
        key: "rosie",
        name: "Rosie",
        grade: 1,
        // A six-year-old who needs hints: she opens the ladder after most wrong tries, and her
        // named mistakes repeat ("That is how many are in the frame") until a lesson lands.
        settings: {
            picture: "hedgehog",
            guide: "firefly",
            teaching: {
                dayLength: { kind: "minutes", value: 25 },
                hints: "after-one-try",
                marks: "as-you-go",
                readAloud: true,
                defaultMode: "screen",
            },
        },
        worlds: { terms: {}, tweaks: { meadow: { weather: "breezy" } } },
        tracks: [
            {
                track: "maths",
                perWeek: 5,
                days: [9, 10, 11, 10, 11, 10, 9, 11, 12, 11],
                learner: NEEDS_HINTS,
                paper: 0.2,
            },
            {
                track: "reading",
                perWeek: 2,
                days: [8, 9, 9, 8, 9, 9],
                learner: { ...NEEDS_HINTS, first: [0.48, 0.78] },
                paper: 0.1,
            },
            {
                track: "writing",
                perWeek: 1,
                days: [4, 5, 4, 5, 4, 5],
                learner: { ...NEEDS_HINTS, first: [0.5, 0.75] },
                paper: 0.5,
            },
        ],
        off: ["physics", "nature"],
        morning: 45,
        games: 0.45,
        prints: "ben",
        marks: ["ben", "anna"],
    },
    {
        key: "leo",
        name: "Leo",
        grade: 3,
        // Strong in maths and quick with it; slower and less sure in reading, where Grace joins him.
        settings: {
            picture: "owl",
            guide: "snail",
            teaching: {
                dayLength: { kind: "minutes", value: 40 },
                hints: "on-request",
                marks: "at-the-end",
                readAloud: false,
                defaultMode: "screen",
            },
        },
        worlds: { terms: {}, tweaks: { "night-sky": { guide: "snail" } } },
        tracks: [
            {
                track: "maths",
                perWeek: 5,
                days: [10, 11, 10, 12, 11, 11, 10, 12, 11, 10],
                learner: { first: [0.84, 0.97], named: 0.8, hint: 0.1, retry: 0.9, think: [3, 8] },
                paper: 0.15,
            },
            {
                track: "reading",
                perWeek: 2,
                days: [9, 10, 11, 10, 9, 10],
                learner: {
                    first: [0.5, 0.68],
                    named: 0.7,
                    hint: 0.45,
                    retry: 0.62,
                    think: [8, 20],
                },
                paper: 0.3,
            },
            {
                track: "coding",
                perWeek: 1,
                days: [4, 5, 4, 5, 4, 5],
                learner: { first: [0.72, 0.9], named: 0.6, hint: 0.2, retry: 0.85, think: [4, 10] },
                paper: 0,
            },
        ],
        off: ["writing", "physics", "nature"],
        morning: 75,
        games: 0.25,
        prints: "anna",
        marks: ["anna", "ben"],
    },
    {
        key: "ivy",
        name: "Ivy",
        grade: 4,
        // Works mostly on paper at the kitchen table: her sheets are printed the evening before and
        // marked by whichever parent gets to them, a few days later or not yet.
        settings: {
            picture: "fox",
            guide: "bird",
            teaching: {
                dayLength: { kind: "minutes", value: 45 },
                hints: "on-request",
                marks: "at-the-end",
                readAloud: false,
                defaultMode: "paper",
            },
        },
        worlds: { terms: {}, tweaks: { mountains: { weather: "clear" } } },
        tracks: [
            {
                track: "maths",
                perWeek: 5,
                days: [11, 10, 12, 11, 11, 12, 10, 11, 11, 10],
                learner: { first: [0.7, 0.9], named: 0.7, hint: 0.3, retry: 0.8, think: [4, 11] },
                paper: 0.78,
            },
            {
                track: "writing",
                perWeek: 2,
                days: [12, 13, 12, 13, 12, 13],
                learner: {
                    first: [0.66, 0.84],
                    named: 0.65,
                    hint: 0.3,
                    retry: 0.8,
                    think: [5, 12],
                },
                paper: 0.7,
            },
            {
                track: "physics",
                perWeek: 1,
                days: [9, 10, 9],
                learner: { first: [0.7, 0.88], named: 0.7, hint: 0.25, retry: 0.8, think: [5, 12] },
                paper: 0.5,
            },
        ],
        off: ["reading", "nature", "coding", "chemistry"],
        morning: 125,
        games: 0.1,
        prints: "anna",
        marks: ["ben", "anna"],
    },
];

/** Twenty calendar weeks: nineteen school weeks and a week off. */
export const WEEKS = 20;

/** The week off, which Ben moved the plan past with a `shift` on the Friday before. */
export const HOLIDAY_WEEK = 11;

/**
 * The museum day: a Friday Ben set off in the plan on the Tuesday before, and Anna recorded for each
 * child as a day of teaching that was not a lesson.
 */
export const MUSEUM = {
    week: 9,
    weekday: 4,
    minutes: 210,
    subject: "science",
    note: "The Denver Museum of Nature & Science: the space gallery, the dinosaur hall, and lunch on the steps.",
};

/** Days a child did nothing at all, by week and weekday (0 is Monday). Rosie's is a cold. */
export const MISSED: Record<string, { week: number; weekday: number; why: string }[]> = {
    rosie: [
        { week: 16, weekday: 1, why: "a cold" },
        { week: 16, weekday: 2, why: "a cold" },
        { week: 16, weekday: 3, why: "a cold" },
        { week: 5, weekday: 4, why: "a birthday party" },
    ],
    leo: [{ week: 6, weekday: 3, why: "the dentist" }],
    ivy: [{ week: 14, weekday: 0, why: "a swim meet" }],
};

/** A sitting Rosie stopped after two questions. */
export const UNFINISHED = { kid: "rosie", week: 13, weekday: 3 };

/** Leo's reading goes to three days a week when Grace starts. */
export const MORE_READING = { kid: "leo", week: 8, perWeek: 3 };

/**
 * The question a parent wrote: a real item (`money.change`) with the museum's prices, written by Ben
 * the week after the trip. His first draft had the scene one size too small for the longer sentence,
 * which the verifier refused; the second, `body`, verified clean and went on one of Ivy's sheets.
 */
export const AUTHORED = {
    by: "ben",
    kid: "ivy",
    week: 10,
    draft: { find: "scene 30x11", replace: "scene 30x9" },
    body: `# Written for Ivy after the museum trip, from money.change with the prices on the day.
item harlow.museum-change v=1 skills=[money.change] {
  title "Change at the museum"
  let note={20, 50} price={17.50, 23.75, 31.25, 44.50}
  where (price < note)

  scene 30x11 {
    text ask "Two museum tickets cost {price} dollars and we pay with a {note} dollar note." width=28 at=canvas(1, 0)
    text q "How much change do we get, in dollars?" width=28 below=ask gap=1
    number-input answer below=q gap=1
  }

  answer (note - price)
  feedback {
    when (answer == price) point=q {
      say "That is what the tickets cost, not the change. Take it away from the note."
    }
    when (answer == note + price) point=q {
      say "Change is what is left, so this is a subtraction and not an addition."
    }
  }
  hint "Count on from {price} to the next whole dollar first, then on to {note}."
}
`,
};
