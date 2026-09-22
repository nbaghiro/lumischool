import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { say } from "../lettering";
import { MOODS, faceAt, moodOf, type Mood } from "../speech";

const HAIR = ["short hair", "hair in bunches", "curly hair", "long hair"] as const;

/** What the brows, eyes and mouth do for each feeling, said without naming the feeling. */
const LOOKS: Record<Mood, string> = {
    happy: "brows resting high, a mouth curved up and rosy cheeks",
    sad: "the inner brows raised, a mouth turned down and a tear on one cheek",
    cross: "brows pulled down towards the middle and a tight flat mouth",
    scared: "wide eyes, brows raised high, a small wobbly open mouth and a drop of sweat",
    surprised: "wide eyes, brows arched high and a round open mouth",
    worried: "the inner brows raised a little, a wavy mouth and a drop of sweat",
    tired: "eyes closed, a small open mouth and two letter z shapes above the head",
    excited: "eyes curved shut, raised brows, a wide open mouth and short lines around the head",
};

export const face = defineDrawing({
    id: "face",
    family: "people",
    title: "A face that shows a feeling",
    group: "Characters",
    about: "A child's face drawn to show one feeling: happy, sad, cross, scared, surprised, worried, tired or excited. The brows and the mouth carry the feeling, so it reads the same printed in black, and a question can ask which face matches what a character did.",
    params: { mood: "happy", hair: 0, name: "" },
    settings: {
        mood: { kind: "one of", of: MOODS },
        hair: { kind: "whole", min: 0, max: 3 },
        name: { kind: "text", most: 12 },
    },
    takes: [
        { label: "Happy", params: { mood: "happy", hair: 0, name: "" } },
        { label: "Sad, with bunches", params: { mood: "sad", hair: 1, name: "Kim" } },
        { label: "Scared, curls", params: { mood: "scared", hair: 2, name: "" } },
        { label: "Cross", params: { mood: "cross", hair: 3, name: "Ben" } },
        { label: "Surprised", params: { mood: "surprised", hair: 0, name: "" } },
        { label: "Worried", params: { mood: "worried", hair: 1, name: "" } },
        { label: "Tired", params: { mood: "tired", hair: 2, name: "" } },
        { label: "Excited", params: { mood: "excited", hair: 3, name: "" } },
    ],
    box: (p) => ({ w: 7, h: p.name ? 9 : 7 }),
    draw: (c, p) => {
        const cx = 3.5 * U;
        const cy = 3.4 * U;
        const r = 2.3 * U;
        faceAt(c, cx, cy, r, p.mood, Math.max(0, Math.min(3, Math.round(p.hair))));
        if (p.name) say(c, cx, 8.1 * U, p.name, 17);
        return { face: [cx, cy - r, "up"], mouth: [cx, cy + r * 0.5, "down"] };
    },
    describe: (p) => {
        const hair = HAIR[Math.max(0, Math.min(3, Math.round(p.hair)))] ?? "short hair";
        const named = p.name ? `, and the name ${p.name} written below` : "";
        return `A child's face with ${hair}, ${LOOKS[moodOf(p.mood)]}${named}.`;
    },
    motion: { body: { is: "breathe", amt: 0.025 }, parts: { eyes: { is: "blink", period: 3.6 } } },
});
