// The tracks a family turns on, and each subject's title, what it covers and its marker. They are
// here rather than in year.ts because a child's map reads year.ts and never needs any of this, and a
// shared module puts its whole weight in the child's first screens (tools/__tests__/first-view.test.ts).

import type { Marker } from "./year";

/**
 * The tracks a family turns on for a child, in the order .docs/tracks.md gives them. A subject with
 * lessons that is not one of them is a loose subject: real lessons, and not a track to turn on.
 */
export const TRACK_IDS = [
    "maths",
    "coding",
    "physics",
    "chemistry",
    "reading",
    "writing",
    "music",
    "nature",
] as const;

export type Track = (typeof TRACK_IDS)[number];

/**
 * Where a year at each grade starts: the days a week each track is worked for a child whose family
 * has changed nothing. It is a default and not a rule. A `track` op in the family's log wins over it
 * for that track, so turning a subject off is an ordinary plan change with `on: false`, and a family
 * that has never touched theirs follows this table as it changes. A track the grade does not name is
 * off. Nothing here is written into the log (.docs/api.md, "The plan a family reads back").
 *
 * The paces come from the corpus's own counts rather than from taste. Every grade holds the same
 * number of lessons in each track (maths 15, chemistry 12, physics 12, coding 9, reading 9,
 * writing 9, music 6, nature 6), `defaultTerms` in family/calendar.ts lays out 39 teaching weeks, and
 * a lesson gets three planned days until a family's own record says otherwise, so a track of twelve
 * lessons at one day a week reaches its last in week 36 and one of nine reaches its last in week 27.
 * Art is not a track and is never planned. Grades 3 and 4 carry one and two more subjects because
 * their lessons are shorter, not because their tracks are longer.
 */
export const DEFAULT_TRACKS: Readonly<Record<number, Readonly<Partial<Record<Track, number>>>>> = {
    1: { maths: 2, reading: 2, writing: 1, physics: 1, nature: 1 },
    2: { maths: 2, reading: 2, writing: 1, physics: 1, nature: 1 },
    3: { maths: 2, reading: 2, writing: 1, physics: 1, nature: 1, coding: 1 },
    4: { maths: 2, reading: 2, writing: 1, physics: 1, nature: 1, coding: 1, chemistry: 1 },
};

/**
 * The default for a grade, with a grade outside the four the corpus covers reading the nearest one,
 * since a child of any grade needs a plan and `laneOf` gives them the whole of each track.
 */
export const defaultTracks = (grade: number): Readonly<Partial<Record<Track, number>>> =>
    DEFAULT_TRACKS[Math.min(4, Math.max(1, Math.round(grade)))] ?? {};

/**
 * How far along a child's school week each subject leans, which `pickWeekdays` in family/family.ts
 * turns its days by. Without it every track at one day a week falls on the same Wednesday, and the
 * default above would give a child one five-subject day and four empty ones. The numbers are chosen
 * so that the subjects the default turns on land on different days: no day of any grade's default
 * holds more than two, and none is empty. Eight tracks do not fit five days, so a family that puts
 * every track on at one day a week still has some sharing a day, and that is theirs to arrange.
 */
export const TRACK_TURN: Readonly<Record<Track, number>> = {
    maths: 0,
    coding: 1,
    physics: 4,
    chemistry: 2,
    reading: 1,
    writing: 3,
    music: 4,
    nature: 0,
};

interface SubjectFacts {
    title: string;
    about: string;
    /** One marker for every grade, so a child knows the subject by its colour in every year. */
    marker: Marker;
}

/**
 * Each subject's title, what it covers and its marker. The lesson counts are not here: they are
 * counted off the pack. Seven tracks and five markers do not divide, so some subjects share one, which
 * .docs/parent-app.md carries as an open question.
 */
export const TRACK_FACTS: Readonly<Record<string, SubjectFacts>> = {
    maths: {
        title: "Maths",
        about: "Counting, the four operations, fractions, measures, time, money, shape and data.",
        marker: "sky",
    },
    reading: {
        title: "Reading",
        about: "Sounds and letters, then whole words, sentences, what a passage says, and reading between the lines.",
        marker: "berry",
    },
    writing: {
        title: "Writing",
        about: "Letters and sentences, then the things children write for someone: lists, labels, signs, postcards, instructions, letters and stories. The machine marks the choices and a grown-up reads the writing.",
        marker: "tang",
    },
    physics: {
        title: "Physics",
        about: "Forces, heat, light and motion, measured with the instruments on the shelf.",
        marker: "mint",
    },
    coding: {
        title: "Coding",
        about: "Running and building programs: following them, repeating, making a picture, a dance or a tune, finding the mistake, deciding, and sorting and searching.",
        marker: "glow",
    },
    chemistry: {
        title: "Chemistry",
        about: "What things are made of, the three states, and what a change does, in a container with an amount in it.",
        marker: "mint",
    },
    music: {
        title: "Music",
        about: "Rhythm and the keyboard, drawn on the same grid and playable without a sound.",
        marker: "berry",
    },
    nature: {
        title: "Nature",
        about: "Living things and how to tell them, growing, the year outside, small creatures, habitats, food chains, maps and the weather, seen in the marsh, the long grass and the reef.",
        marker: "mint",
    },
    science: {
        title: "Science",
        about: "Living things, and materials and forces.",
        marker: "mint",
    },
    geography: {
        title: "Geography",
        about: "Maps from above, and a grid reference.",
        marker: "tang",
    },
    logic: {
        title: "Thinking",
        about: "Sorting, deduction and the puzzles maths has no room for.",
        marker: "glow",
    },
    art: {
        title: "Art",
        about: "Colour mixed the way paint mixes, pattern and print, drawing from looking, and a technique learned from an artist. The machine proves the colours and the mirrors, and a grown-up responds to the paintings.",
        marker: "glow",
    },
};

/** A subject's facts, with a title made from its name for a subject the table does not hold yet. */
export const subjectFacts = (id: string): SubjectFacts =>
    TRACK_FACTS[id] ?? {
        title: id.charAt(0).toUpperCase() + id.slice(1),
        about: "",
        marker: "sky",
    };
