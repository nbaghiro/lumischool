// One figure for every person the shelf draws, as the drawing a lesson places: a child, a grown-up
// or an older person in any pose and any look. The construction is figure.ts; the kit and its rules
// are in .docs/shelf.md.
import { HAIR_COLOURS, MARKERS, U } from "../../paper";
import { defineDrawing } from "../drawing";
import { MOODS, type Mood } from "../speech";
import {
    AGES,
    AIDS,
    HAIRS,
    HEARING,
    POSES,
    WEAR,
    figure,
    lookOf,
    pick,
    type Age,
    type Hair,
    type PersonParams,
    type Pose,
} from "./figure";

function boxOf(p: PersonParams): { w: number; h: number } {
    const age = pick(AGES, p.age, "child"),
        aid = pick(AIDS, p.aid, "none");
    const tall = age === "child" ? 6 : 8;
    if (aid === "wheelchair")
        return { w: (age === "child" ? 5 : 6) + (p.pose === "point" ? 1 : 0), h: tall };
    return { w: p.pose === "point" ? 6 : p.pose === "run" && age !== "child" ? 5 : 4, h: tall };
}

/** The look a person has when a setting says nothing else. */
const REST: PersonParams = {
    pose: "stand",
    age: "child",
    tone: 3,
    hair: "short",
    colour: "brown",
    top: "sky",
    wear: "trousers",
    glasses: false,
    hearing: "none",
    aid: "none",
    mood: "happy",
    dir: 1,
    holding: "",
};

export const person = defineDrawing<PersonParams>({
    id: "person",
    family: "people",
    title: "A person",
    group: "Characters",
    about: "Anyone a question is about, in one figure: a child, a grown-up or an older person, standing, sitting or in a wheelchair, waving, pointing, holding something up or thinking. Skin tone, hair, glasses, a hearing aid, crutches or a wheelchair are settings, never separate drawings, so any child can be in any line-up.",
    params: REST,
    settings: {
        pose: { kind: "one of", of: POSES },
        age: { kind: "one of", of: AGES },
        tone: { kind: "whole", min: 1, max: 6 },
        hair: { kind: "one of", of: HAIRS },
        colour: { kind: "one of", of: HAIR_COLOURS },
        top: { kind: "one of", of: MARKERS },
        wear: { kind: "one of", of: WEAR },
        glasses: { kind: "flag" },
        hearing: { kind: "one of", of: HEARING },
        aid: { kind: "one of", of: AIDS },
        mood: { kind: "one of", of: MOODS },
        dir: { kind: "whole", min: -1, max: 1 },
        holding: { kind: "text", most: 12 },
    },
    takes: [
        {
            label: "Waving, coily hair",
            params: { ...REST, pose: "wave", tone: 6, hair: "coily", colour: "black", top: "tang" },
        },
        {
            label: "A grown-up pointing, glasses",
            params: {
                ...REST,
                pose: "point",
                age: "grownup",
                tone: 2,
                hair: "bun",
                colour: "auburn",
                top: "mint",
                glasses: true,
            },
        },
        {
            label: "In a wheelchair",
            params: {
                ...REST,
                aid: "wheelchair",
                tone: 5,
                hair: "short",
                colour: "black",
                top: "berry",
            },
        },
        {
            label: "Holding an apple, braids",
            params: {
                ...REST,
                pose: "hold",
                tone: 3,
                hair: "braids",
                colour: "brown",
                top: "mint",
                holding: "apple",
            },
        },
        {
            label: "Forearm crutches",
            params: {
                ...REST,
                aid: "crutches",
                tone: 4,
                hair: "crop",
                colour: "black",
                top: "tang",
            },
        },
        {
            label: "Older, with a stick",
            params: {
                ...REST,
                pose: "wave",
                age: "older",
                aid: "cane",
                tone: 2,
                hair: "bald",
                colour: "white",
                top: "sky",
                glasses: true,
            },
        },
        {
            label: "A grown-up in a headscarf",
            params: {
                ...REST,
                pose: "hold",
                age: "grownup",
                hair: "scarf",
                tone: 4,
                top: "sky",
                holding: "star",
            },
        },
        {
            label: "Thinking, a hearing aid",
            params: {
                ...REST,
                pose: "think",
                tone: 3,
                hair: "long",
                colour: "brown",
                top: "sky",
                hearing: "aid",
                mood: "worried",
            },
        },
        {
            label: "Sitting on a stool",
            params: { ...REST, pose: "sit", tone: 1, hair: "curly", colour: "blonde", top: "glow" },
        },
        {
            label: "Both arms up",
            params: {
                ...REST,
                pose: "cheer",
                tone: 5,
                hair: "puffs",
                colour: "black",
                top: "glow",
                wear: "dress",
                mood: "excited",
            },
        },
    ],
    box: boxOf,
    draw: (c, p) => {
        const look = lookOf(p),
            box = boxOf(p),
            base = box.h * U - 4;
        const reach = p.pose === "point" ? U * 0.5 : 0;
        const chairX = p.pose === "run" ? 10 * (look.age === "child" ? 1 : 1.3) : 2 + reach;
        const x =
            look.aid === "wheelchair"
                ? box.w * U * 0.5 - look.dir * chairX
                : p.pose === "point"
                  ? (look.dir > 0 ? 2 : box.w - 2) * U
                  : (box.w * U) / 2;
        return figure(c, x, base, look, pick(POSES, p.pose, "stand"), p.holding);
    },
    describe: (p) => describePerson(p),
    // the kit's person breathes and leans as a creature does, blinks, and a raised hand waves
    motion: {
        body: { is: "idle" },
        parts: {
            eyes: { is: "blink", period: 4.2 },
            wave: { is: "wiggle", deg: 9, period: 4.6, cycles: 3 },
        },
    },
});

const AGE_WORD: Record<Age, string> = {
    child: "A child",
    grownup: "A grown-up",
    older: "An older person",
};
const TONE_WORD = ["very light", "light", "light brown", "medium brown", "brown", "dark brown"];
const HAIR_WORD: Record<Hair, (colour: string) => string> = {
    short: (c) => `short ${c} hair`,
    crop: (c) => `cropped ${c} hair`,
    curly: (c) => `curly ${c} hair`,
    coily: (c) => `coily ${c} hair in a round puff`,
    puffs: (c) => `${c} hair in two puffs`,
    bun: (c) => `${c} hair in a bun`,
    braids: (c) => `${c} hair in two braids`,
    long: (c) => `long ${c} hair`,
    bob: (c) => `${c} hair in a bob`,
    bald: () => "a bald head",
    scarf: () => "a headscarf",
};
const POSE_WORD: Record<Pose, string> = {
    stand: "standing",
    wave: "waving",
    point: "pointing",
    hold: "holding out both hands",
    think: "resting the chin on one hand",
    cheer: "raising both arms",
    sit: "sitting on a stool",
    walk: "walking",
    run: "running",
};
/** The face as a sighted reader sees it, by its brows and mouth and never by the feeling's name. */
const FACE_WORD: Record<Mood, string> = {
    happy: "a small smile",
    sad: "brows up in the middle and the mouth turned down",
    cross: "brows pulled down and a flat mouth",
    scared: "wide eyes and a small open mouth",
    surprised: "raised brows and a round open mouth",
    worried: "brows up in the middle and a wavy mouth",
    tired: "eyes closed and a small round mouth",
    excited: "raised brows and a wide open smile",
};

/**
 * What a screen reader says for a person: who they are and what they are doing first, then how they
 * look, then the face told by its brows and mouth, so a question about how someone feels is not
 * answered by its own description. A lesson may replace it.
 */
export function describePerson(p: PersonParams): string {
    const look = lookOf(p),
        pose = pick(POSES, p.pose, "stand");
    const tone = TONE_WORD[Math.max(0, Math.min(5, Math.round(p.tone) - 1))] ?? "brown";
    const hair = HAIR_WORD[look.hair](look.colour);
    const held =
        pose === "hold" && p.holding
            ? `holding ${/^[aeiou]/.test(p.holding) ? "an" : "a"} ${p.holding}`
            : POSE_WORD[pose];
    const moving = pose === "walk" || pose === "run";
    const acts =
        look.aid === "wheelchair"
            ? pose === "run"
                ? "in a racing wheelchair, pushing the wheels"
                : `in a wheelchair${pose === "sit" || pose === "stand" || pose === "walk" ? "" : `, ${held}`}`
            : look.aid === "crutches"
              ? `${moving ? POSE_WORD[pose] : "standing"} with forearm crutches`
              : look.aid === "cane"
                ? `${held} with a walking stick`
                : held;
    const worn = [
        hair,
        look.glasses ? "glasses" : "",
        look.hearing === "aid"
            ? "a hearing aid"
            : look.hearing === "implant"
              ? "a cochlear implant"
              : "",
    ].filter(Boolean);
    const last = worn.pop() ?? hair;
    const face = FACE_WORD[look.mood];
    return `${AGE_WORD[look.age]} ${acts}, with ${tone} skin${worn.length ? `, ${worn.join(", ")}` : ""} and ${last}. ${face.charAt(0).toUpperCase()}${face.slice(1)}.`;
}
