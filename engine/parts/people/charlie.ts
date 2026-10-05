// Charlie, the one named child on the shelf: a small girl with long fair hair and a fringe, who wears
// what the figure kit can put on anyone and so can be dressed for a game, a lesson or a world. Her
// look is fixed and her clothes, poses and moods are settings; the construction is figure.ts.
import { MARKER_WORD, MARKERS, U } from "../../paper";
import { part } from "../../ink/surface";
import { defineDrawing } from "../drawing";
import { MOODS } from "../speech";
import {
    BOTTOMS,
    CLOTH,
    FEET,
    PATTERNS,
    POSES,
    PRINTS,
    SLEEVES,
    WEAR,
    drawPerson,
    lookOf,
    personBox,
    pick,
    type Look,
    type PersonParams,
    type Pose,
} from "./figure";

/** The ways Charlie wears her hair. */
export const CHARLIE_HAIRS = ["fringe", "ponytail", "bunches", "braids", "bun"] as const;

export interface CharlieParams {
    pose: string;
    mood: string;
    /** Which way she faces: 1 to the right, -1 to the left. */
    dir: number;
    hair: string;
    top: string;
    sleeves: string;
    print: string;
    wear: string;
    bottom: string;
    pattern: string;
    feet: string;
    holding: string;
    /** Her mouth open as in speech, which the companion turns on and off as it reads aloud. */
    talking?: boolean;
}

/** Charlie as she first came: waving, in a white sleeveless top with a bear on it, a rainbow skirt and bare feet. */
const AS_SHE_CAME: CharlieParams = {
    pose: "wave",
    mood: "happy",
    dir: 1,
    hair: "fringe",
    top: "white",
    sleeves: "none",
    print: "bear",
    wear: "skirt",
    bottom: "sky",
    pattern: "rainbow",
    feet: "bare",
    holding: "",
    talking: false,
};

/** Charlie as the figure kit draws a person: a child with light skin and blonde hair, her legs bare under a skirt. */
export const asPerson = (p: CharlieParams): PersonParams => ({
    pose: p.pose,
    age: "child",
    tone: 2,
    hair: pick(CHARLIE_HAIRS, p.hair, "fringe"),
    colour: "blonde",
    top: p.top,
    sleeves: p.sleeves,
    print: p.print,
    wear: p.wear,
    bottom: p.bottom,
    pattern: p.pattern,
    legs: "bare",
    feet: p.feet,
    glasses: false,
    hearing: "none",
    aid: "none",
    mood: p.mood,
    dir: p.dir,
    holding: p.holding,
    talking: p.talking === true,
});

/** The whole-body movement a pose has, as a part the drawing is drawn inside: a hop, a wobble or a step. */
const WHOLE: Partial<Record<Pose, string>> = {
    cheer: "hop",
    jump: "hop",
    balance: "wobble",
    walk: "step",
    run: "step",
};

const HAIR_WORDS: Record<(typeof CHARLIE_HAIRS)[number], string> = {
    fringe: "long blonde hair and a fringe",
    ponytail: "a blonde ponytail",
    bunches: "blonde bunches",
    braids: "blonde braids",
    bun: "a blonde bun",
};
const POSE_WORDS: Record<Pose, string> = {
    stand: "standing",
    wave: "waving",
    point: "pointing",
    hold: "holding out both hands",
    think: "with a hand at her chin",
    cheer: "with both arms up",
    sit: "sitting on a stool",
    walk: "walking",
    run: "running",
    balance: "balancing with her arms out",
    jump: "jumping",
    hang: "hanging by her hands",
    sweep: "sweeping as she strides",
};
const colourWord = (v: string): string =>
    v === "white" || v === "grey" ? v : MARKER_WORD[pick(MARKERS, v, "sky")];

function clothesOf(look: Look): { top: string; bottom: string; feet: string } {
    const print = look.print === "none" ? "" : ` with a ${look.print}`;
    const kind =
        look.sleeves === "none"
            ? "sleeveless top"
            : look.sleeves === "short"
              ? "T-shirt"
              : "jumper";
    const patterned = (colour: string): string =>
        look.pattern === "rainbow"
            ? "rainbow striped"
            : look.pattern === "stripes"
              ? `${colourWord(colour)} striped`
              : look.pattern === "spots"
                ? `${colourWord(colour)} spotted`
                : colourWord(colour);
    const top = `a ${look.wear === "dress" ? patterned(look.top) : colourWord(look.top)} ${look.wear === "dress" ? "dress" : kind}${print}`;
    const bottom =
        look.wear === "dress"
            ? ""
            : look.wear === "skirt"
              ? `a ${patterned(look.bottom)} skirt`
              : look.wear === "shorts"
                ? `${patterned(look.bottom)} shorts`
                : `${colourWord(look.bottom)} trousers`;
    const feet = look.feet === "bare" ? "bare feet" : look.feet === "boots" ? "wellies" : "shoes";
    return { top, bottom, feet };
}

/** The face by its brows and mouth, never by the feeling's name, as the person's description does. */
const FACE: Record<string, string> = {
    happy: "",
    sad: "Her mouth turns down.",
    cross: "Her brows pull down.",
    scared: "Her eyes are wide.",
    surprised: "Her mouth is round and open.",
    worried: "Her mouth is wavy.",
    tired: "Her eyes are closed.",
    excited: "She has a wide open smile.",
};

/**
 * What a screen reader says for Charlie: her name, what she is doing, her hair and her clothes, and
 * the face when it is not a plain smile. Fifteen to thirty words: when it runs long the feet go
 * first, then the words that say she is a small girl, and last the print on her top.
 */
export function describeCharlie(p: CharlieParams): string {
    const look = lookOf(asPerson(p)),
        pose = pick(POSES, p.pose, "stand");
    const doing =
        pose === "hold" && p.holding
            ? `holding ${/^[aeiou]/.test(p.holding) ? "an" : "a"} ${p.holding}`
            : POSE_WORDS[pose];
    const hair = HAIR_WORDS[pick(CHARLIE_HAIRS, p.hair, "fringe")];
    const worn = clothesOf(look);
    const face = look.talking ? "Her mouth is open as she talks." : (FACE[look.mood] ?? "");
    const says = (girl: boolean, feet: boolean, print: boolean): string => {
        const top = print ? worn.top : worn.top.replace(/ with a \w+$/, "");
        const items = [top, worn.bottom, feet ? worn.feet : ""].filter(Boolean);
        const last = items.pop() ?? top;
        const list = items.length ? `${items.join(", ")} and ${last}` : last;
        return `Charlie, ${girl ? "a small girl " : ""}with ${hair}, ${doing}, in ${list}.${face ? ` ${face}` : ""}`;
    };
    const fits = (s: string): boolean => s.split(/\s+/).length <= 30;
    return (
        [
            says(true, true, true),
            says(true, false, true),
            says(false, true, true),
            says(false, false, true),
        ].find(fits) ?? says(false, false, false)
    );
}

export const charlie = defineDrawing<CharlieParams>({
    id: "charlie",
    family: "people",
    title: "Charlie",
    group: "Characters",
    about: "Charlie, a small girl with long fair hair and a fringe, drawn from the figure kit so she can go anywhere a person goes. Her clothes are settings (a top with a print, a skirt, shorts or a dress in stripes, a rainbow or spots, bare feet or wellies), and each pose has a movement of its own: she hops when she cheers or jumps, wobbles when she balances and bobs as she walks.",
    params: AS_SHE_CAME,
    settings: {
        pose: { kind: "one of", of: POSES },
        mood: { kind: "one of", of: MOODS },
        dir: { kind: "whole", min: -1, max: 1 },
        hair: { kind: "one of", of: CHARLIE_HAIRS },
        top: { kind: "one of", of: CLOTH },
        sleeves: { kind: "one of", of: SLEEVES },
        print: { kind: "one of", of: PRINTS },
        wear: { kind: "one of", of: WEAR },
        bottom: { kind: "one of", of: BOTTOMS },
        pattern: { kind: "one of", of: PATTERNS },
        feet: { kind: "one of", of: FEET },
        holding: { kind: "text", most: 12 },
        // set by the page that animates a character reading aloud, never written in a lesson
        talking: { kind: "fixed" },
    },
    takes: [
        { label: "As she came, waving", params: AS_SHE_CAME },
        { label: "Balancing on a plank", params: { ...AS_SHE_CAME, pose: "balance" } },
        {
            label: "Reading a hint aloud",
            params: { ...AS_SHE_CAME, pose: "stand", talking: true },
        },
        {
            label: "Hanging from a rope swing",
            params: { ...AS_SHE_CAME, pose: "hang", mood: "excited", hair: "ponytail" },
        },
        {
            label: "Jumping, a star on her T-shirt",
            params: {
                ...AS_SHE_CAME,
                pose: "jump",
                mood: "excited",
                hair: "bunches",
                top: "glow",
                sleeves: "short",
                print: "star",
                bottom: "berry",
                pattern: "plain",
            },
        },
        {
            label: "Cheering, in a spotted dress",
            params: {
                ...AS_SHE_CAME,
                pose: "cheer",
                hair: "braids",
                top: "berry",
                sleeves: "short",
                print: "none",
                wear: "dress",
                pattern: "spots",
                feet: "shoes",
            },
        },
        {
            label: "Walking, a ponytail and striped shorts",
            params: {
                ...AS_SHE_CAME,
                pose: "walk",
                hair: "ponytail",
                top: "sky",
                sleeves: "short",
                print: "heart",
                wear: "shorts",
                bottom: "mint",
                pattern: "stripes",
                feet: "shoes",
            },
        },
        {
            label: "In wellies and a jumper",
            params: {
                ...AS_SHE_CAME,
                pose: "stand",
                top: "tang",
                sleeves: "long",
                print: "flower",
                wear: "trousers",
                bottom: "sky",
                pattern: "plain",
                feet: "boots",
            },
        },
        {
            label: "Holding a star, a striped skirt",
            params: {
                ...AS_SHE_CAME,
                pose: "hold",
                holding: "star",
                hair: "bun",
                top: "mint",
                sleeves: "short",
                print: "none",
                bottom: "sky",
                pattern: "stripes",
            },
        },
        {
            label: "Sitting on a stool",
            params: { ...AS_SHE_CAME, pose: "sit", mood: "worried" },
        },
        {
            label: "Running the other way",
            params: {
                ...AS_SHE_CAME,
                pose: "run",
                dir: -1,
                hair: "ponytail",
                top: "white",
                sleeves: "short",
                print: "none",
                wear: "shorts",
                bottom: "berry",
                pattern: "plain",
                feet: "shoes",
            },
        },
        {
            label: "Pointing",
            params: { ...AS_SHE_CAME, pose: "point", mood: "surprised" },
        },
    ],
    box: (p) => personBox(asPerson(p)),
    draw: (c, p) => {
        const person = asPerson(p),
            box = personBox(person),
            whole = WHOLE[pick(POSES, p.pose, "stand")];
        const moving = whole ? part(c, whole, [(box.w * U) / 2, box.h * U - 4]) : c;
        return drawPerson(moving, person);
    },
    describe: describeCharlie,
    // she breathes and blinks like any person; her hair and skirt swing a little behind her, and a
    // pose that is itself a movement (a cheer, a jump, a balance, a walk) keeps moving
    motion: {
        body: { is: "idle" },
        parts: {
            eyes: { is: "blink", period: 4 },
            wave: { is: "wiggle", deg: 10, period: 3.8, cycles: 3 },
            hair: { is: "sway", deg: 4, period: 3.4, lag: 0.15 },
            skirt: { is: "sway", deg: 3, period: 3.1, lag: 0.1 },
            hop: { is: "hop", lift: 6, squash: 0.08, period: 2.6 },
            wobble: { is: "sway", deg: 6, period: 2.2 },
            step: { is: "bob", lift: 2.2, arc: 0, deg: 0, period: 1.4 },
        },
    },
});
