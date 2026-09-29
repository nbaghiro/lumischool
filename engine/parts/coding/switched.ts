import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { say } from "../lettering";

const LAMP = new Set(["lamp", "light", "bulb"]);
const HEATER = new Set(["heater", "fire", "radiator", "kettle"]);

export const switched = defineDrawing({
    id: "switched",
    family: "coding",
    title: "The things a program switches",
    group: "Structures",
    about: "The things a program switches on and off, side by side, each drawn by what it is and lettered with its name and whether it is on: a lamp is a bulb that glows, a heater has warm air rising off it, and anything else, such as a pump or a fan, is a round switch that fills. `names` are the things, as the program's `switch` lines name them, and `on` the ones switched on. As a program runs on screen, what it has switched is drawn at each step, so a child watches the heater a thermostat reads come on and go off.",
    params: { names: ["heater", "lamp"], on: ["heater"] },
    settings: {
        names: { kind: "words", most: 4 },
        on: { kind: "words", most: 4 },
    },
    takes: [
        {
            label: "The heater on, the lamp off",
            params: { names: ["heater", "lamp"], on: ["heater"] },
        },
        { label: "A lamp that is on", params: { names: ["lamp"], on: ["lamp"] } },
        { label: "Pump and fan, both off", params: { names: ["pump", "fan"], on: [] } },
    ],
    box: (p) => ({ w: Math.max(1, Math.min(4, p.names.length)) * 6 + 1, h: 8 }),
    draw: (c, p) => {
        const a: RawAnchors = {},
            { pen, g } = c;
        const names = p.names.slice(0, 4).map((n) => n.trim().toLowerCase());
        names.forEach((name, i) => {
            const on = p.on.some((o) => o.trim().toLowerCase() === name);
            const x = (3.5 + i * 6) * U,
                y = 3.2 * U;
            if (LAMP.has(name)) {
                if (on)
                    for (let k = 0; k < 8; k++) {
                        const t = (k / 8) * Math.PI * 2;
                        pen.line(
                            g,
                            x + 1.7 * U * Math.cos(t),
                            y + 1.7 * U * Math.sin(t),
                            x + 2.2 * U * Math.cos(t),
                            y + 2.2 * U * Math.sin(t),
                            "pencil",
                            { strokeWidth: 1.4 },
                        );
                    }
                pen.circle(
                    g,
                    x,
                    y,
                    1.3 * U,
                    "pencil",
                    on ? pen.fill("glow") : { fill: c.t.card, fillStyle: "solid" },
                    { strokeWidth: 1.8 },
                );
                pen.rect(
                    g,
                    x - 0.45 * U,
                    y + 1.1 * U,
                    0.9 * U,
                    0.7 * U,
                    "ruler",
                    pen.fill("card"),
                    {
                        strokeWidth: 1.4,
                    },
                );
            } else if (HEATER.has(name)) {
                const w = 3.2 * U,
                    h = 1.8 * U,
                    top = y - 0.2 * U;
                pen.rect(
                    g,
                    x - w / 2,
                    top,
                    w,
                    h,
                    "ruler",
                    on ? pen.fill("tang") : pen.fill("card"),
                    { strokeWidth: 1.8 },
                );
                for (let k = 1; k < 4; k++)
                    pen.line(
                        g,
                        x - w / 2 + (k * w) / 4,
                        top,
                        x - w / 2 + (k * w) / 4,
                        top + h,
                        "ruler",
                        {
                            strokeWidth: 1,
                        },
                    );
                // warm air rising off it, drawn only while it is on
                if (on)
                    for (const dx of [-0.8, 0, 0.8]) {
                        const bx = x + dx * U,
                            by = top - 0.3 * U;
                        pen.path(
                            g,
                            `M${bx} ${by}q${0.3 * U} ${-0.4 * U} 0 ${-0.8 * U}q${-0.3 * U} ${-0.4 * U} 0 ${-0.8 * U}`,
                            "pencil",
                            null,
                            { strokeWidth: 1.4 },
                        );
                    }
            } else {
                pen.circle(
                    g,
                    x,
                    y + 0.4 * U,
                    1.1 * U,
                    "ruler",
                    on ? pen.fill("mint") : { fill: c.t.card, fillStyle: "solid" },
                    { strokeWidth: 1.8 },
                );
            }
            say(c, x, 6.6 * U, `${name} ${on ? "on" : "off"}`, 14);
            a[`thing(${i + 1})`] = [x, 1 * U, "up"];
        });
        return a;
    },
    describe: (p) => {
        const states = p.names.map((n) => `${n} ${p.on.includes(n) ? "on" : "off"}`);
        return `${p.names.length === 1 ? "One thing" : `${p.names.length} things`} a program switches, side by side, each lettered with its name and shown on or off: ${states.join(", ")}.`;
    },
    motion: {
        still: "What is on is read from the drawing and its lettering, so nothing in it moves.",
    },
});
