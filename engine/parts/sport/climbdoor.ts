import type { RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { say } from "../lettering";

/**
 * A door in a frame with a card on it that says what opens it: a number, a sum or a word such as
 * odd. Open, the door swings back inside its frame and the way through shows.
 */
export const climbDoor = defineDrawing<{ text: string; open: number }>({
    id: "climbdoor",
    family: "sport",
    title: "Number door",
    group: "Props",
    about: "A wooden door in a stone frame with a white card pinned to it that says what opens it, a number, a sum or a word like odd; open, it swings back.",
    params: { text: "12", open: 0 },
    settings: {
        text: { kind: "text", most: 9 },
        open: { kind: "number", min: 0, max: 1, step: 0.25 },
    },
    takes: [
        { label: "Shut, for 12", params: { text: "12", open: 0 } },
        { label: "Shut, for a sum", params: { text: "7 + 5", open: 0 } },
        { label: "Shut, odd", params: { text: "odd", open: 0 } },
        { label: "Open", params: { text: "12", open: 1 } },
    ],
    box: () => ({ w: 3, h: 5 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c;
        const open = Math.max(0, Math.min(1, Number(p.open) || 0));
        pen.path(
            g,
            `M${0.15 * U} ${4.9 * U}V${1.5 * U}Q${1.5 * U} ${0.3 * U} ${2.85 * U} ${1.5 * U}V${4.9 * U}`,
            "pencil",
            pen.fill("grid", "solid"),
            {
                strokeWidth: 1.6,
                roughness: 0.3,
            },
        );
        pen.path(
            g,
            `M${0.5 * U} ${4.9 * U}V${1.7 * U}Q${1.5 * U} ${0.85 * U} ${2.5 * U} ${1.7 * U}V${4.9 * U}Z`,
            "pencil",
            pen.fill("paper", "solid"),
            {
                strokeWidth: 1,
                roughness: 0.3,
            },
        );
        // the door narrows towards its hinge as it swings back, until only its edge is left
        const left = 0.5 * U,
            right = 2.5 * U - 1.8 * U * open;
        if (right - left > 0.2 * U) {
            pen.path(
                g,
                `M${left} ${4.9 * U}V${1.7 * U}Q${(left + right) / 2} ${0.85 * U} ${right} ${1.7 * U}V${4.9 * U}Z`,
                "pencil",
                pen.fill("tang", "solid"),
                {
                    strokeWidth: 1.3,
                    roughness: 0.3,
                },
            );
            if (open < 0.5) {
                pen.path(
                    g,
                    roundedRect(0.45 * U, 2.2 * U, 2.1 * U, 1.1 * U, 4),
                    "ruler",
                    pen.fill("card"),
                    {
                        strokeWidth: 1.2,
                        disableMultiStroke: true,
                    },
                );
                const t = String(p.text).slice(0, 9);
                // the lettering shrinks to stay on the card, a word such as "even" as well as a number
                say(
                    c,
                    1.5 * U,
                    3 * U,
                    t,
                    Math.min(19, Math.floor((2.1 * U - 6) / (t.length * 0.56))),
                );
                pen.circle(g, 2.2 * U, 3.8 * U, 0.2 * U, "ruler", pen.fill("ink"), {
                    strokeWidth: 0.6,
                });
            }
        } else
            pen.line(g, left, 1.7 * U, left, 4.9 * U, "pencil", {
                strokeWidth: 2,
                stroke: c.t.ink,
            });
        return { card: [1.5 * U, 2.7 * U, "up"] };
    },
    describe: (p) =>
        Number(p.open) >= 0.75
            ? "A wooden door in an arched stone frame swung open, with the way through it showing, after its number was met."
            : `A wooden door in an arched stone frame, shut, with a white card pinned to it that reads ${String(p.text).slice(0, 9)}, saying what opens it.`,
    motion: { still: "A door stands shut until its number is met, then swings back." },
});
