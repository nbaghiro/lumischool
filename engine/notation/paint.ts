// The checkers that prove an art question for every variant, with the same mixing and the same
// mirror the drawings and the brush use. `paint.mixes` works out what paints make and which option
// names it; `paint.mirror` works out which half is the mirror; `art.by-eye` is the painting a
// grown-up responds to. See .docs/art.md, "How art is marked".
import { num, str, type Value } from "../expr";
import { GEOMETRIC, inOneLine, mirrorOptions, mirrorsAmong, piecesIn } from "../parts/art/kit";
import {
    PIGMENTS,
    hexOf,
    lightness,
    mix,
    nameOf,
    oklch,
    panColour,
    parseRecipe,
    rgbOf,
    warmth,
    type Recipe,
} from "../pigment";
import type { Opt } from "../scene";
import type { Concrete, SceneInstance } from "./instantiate";
import type { CodeChecker } from "./verify";
import { partParams } from "./vocabulary";

type Pigment = Recipe[number]["pigment"];

const node = (scene: SceneInstance, id: string | undefined): Concrete | undefined =>
    scene.nodes.find((c) => c.id === id);
const paramsOf = (c: Concrete): Record<string, unknown> => partParams(c.type, c.v);
const words = (v: unknown): string[] => (Array.isArray(v) ? v.map((x) => String(x)) : []);
const plain = (s: string): string =>
    s
        .trim()
        .toLowerCase()
        .replace(/[.!?]$/, "")
        .replace(/^(a|an|the) /, "");
const optionsOf = (scene: SceneInstance, name: string): Opt[] | null => {
    const c = node(scene, name);
    if (c?.type !== "choice") return null;
    const x = c.v.options;
    return Array.isArray(x)
        ? x.flatMap((o) => (typeof o === "object" && o !== null ? [o] : []))
        : [];
};
const isPigment = (p: Pigment | undefined): p is Pigment => p !== undefined;

/** Every pot on a paint pots drawing added together, which is what the pot at the end holds. */
function potsRecipe(c: Concrete): { recipe: Recipe; problem?: string } {
    const all: Recipe = [];
    for (const s of words(paramsOf(c).pots)) {
        if (s.trim() === "?") continue;
        const r = parseRecipe(s);
        if (!r)
            return {
                recipe: all,
                problem: `"${s}" is not a paint: write a pigment (${PIGMENTS.join(", ")}) or a mix such as yellow+blue`,
            };
        for (const part of r) {
            const had = all.find((q) => q.pigment === part.pigment);
            if (had) had.parts += part.parts;
            else all.push({ ...part });
        }
    }
    return all.length ? { recipe: all } : { recipe: all, problem: `${c.id} has no pots` };
}

/** How far apart two colours are in OKLab, where about 0.02 is the least difference an eye sees side by side. */
function apart(x: string, y: string): number {
    const a = oklch(x);
    const b = oklch(y);
    const rad = Math.PI / 180;
    return Math.hypot(
        a.l - b.l,
        a.c * Math.cos(a.h * rad) - b.c * Math.cos(b.h * rad),
        a.c * Math.sin(a.h * rad) - b.c * Math.sin(b.h * rad),
    );
}

/** Two recipes added together, part for part. */
function plus(a: Recipe, b: Recipe): Recipe {
    const all: Recipe = a.map((x) => ({ ...x }));
    for (const part of b) {
        const had = all.find((q) => q.pigment === part.pigment);
        if (had) had.parts += part.parts;
        else all.push({ ...part });
    }
    return all;
}

/** Every mix of the given pans with up to `most` parts of each, at least one part in all. */
function everyMix(pans: Pigment[], most: number): Recipe[] {
    const out: Recipe[] = [];
    const counts = pans.map(() => 0);
    const walk = (i: number): void => {
        if (i === pans.length) {
            const r = pans
                .map((pigment, k) => ({ pigment, parts: counts[k] ?? 0 }))
                .filter((x) => x.parts > 0);
            if (r.length) out.push(r);
            return;
        }
        for (let n = 0; n <= most; n++) {
            counts[i] = n;
            walk(i + 1);
        }
    };
    walk(0);
    return out;
}

/** Dots side by side mix in the eye, which averages their light: partitive mixing, not paint. */
function byEye(recipe: Recipe): string {
    const lin = [0, 0, 0];
    const toLin = (v: number): number => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    let n = 0;
    for (const part of recipe) {
        const rgb = rgbOf(panColour(part.pigment));
        rgb.forEach((v, i) => {
            lin[i] = (lin[i] ?? 0) + toLin(v / 255) * part.parts;
        });
        n += part.parts;
    }
    const out = lin
        .map((v) => v / Math.max(1, n))
        .map((v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055));
    return hexOf(out.map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255)));
}

/** What is mixed for the answer: the pots, or the colours of a picture's dots mixed by the eye. */
function mixedHere(
    scene: SceneInstance,
    settings: Record<string, string>,
): { hex: string | null; problems: string[] } {
    const c = node(scene, settings.of);
    if (!c) return { hex: null, problems: [`there is no ${settings.of} in the scene to mix`] };
    if (c.type === "dots") {
        const r: Recipe = [];
        for (const s of words(paramsOf(c).colours)) {
            const got = parseRecipe(s);
            const [only] = got ?? [];
            if (!got || got.length !== 1 || !only)
                return {
                    hex: null,
                    problems: [`the dots are one pan's colour each, and "${s}" is not`],
                };
            r.push(only);
        }
        return { hex: byEye(r), problems: [] };
    }
    if (c.type !== "paintpots")
        return {
            hex: null,
            problems: [
                `${c.type} is not something paint is mixed in; name a paintpots or a dots drawing`,
            ],
        };
    const { recipe, problem } = potsRecipe(c);
    if (problem) return { hex: null, problems: [problem] };
    return { hex: settings.how === "eye" ? byEye(recipe) : mix(recipe), problems: [] };
}

const OPTION_TESTS = [
    "name",
    "warmth",
    "makes",
    "warm",
    "cool",
    "lighter",
    "darker",
    "missing",
    "same",
    "between",
    "cannot",
    "most",
    "kinds",
] as const;
const NOT_ANSWERS = ["of", "target", "how", "with", "as", "from", "to", "paint", "upto"];

/** The one option in the list that fits, named for the answer, or why there is not exactly one. */
const one = (hits: Opt[], name: string): { v: Value } | { problem: string } => {
    const [hit] = hits;
    if (hits.length !== 1 || !hit)
        return {
            problem: `${hits.length ? `${hits.map((h) => h.label).join(" and ")} both fit` : "no option fits"}, so ${name} does not have one answer`,
        };
    return { v: str(hit.value) };
};

export const PAINT: Record<string, CodeChecker> = {
    "paint.mixes": {
        doc: "Works out what paint makes, with the same mixing as the paint box, and proves the answer with it. With `of` naming a paintpots drawing (or a dots picture, whose dots mix in the eye), `pick=name` binds a choice to the option that names the colour the pots make, and `pick=warmth` to warm or cool; with a pot drawn as `?`, `pick=missing` binds the one option that, put in that pot, makes the colour the drawing's `makes` shows. For options that are paints, `pick=makes` with `target` binds the one option whose paints make that colour; `pick=warm` or `pick=cool` the one warm or cool option; `pick=lighter` or `pick=darker` the one clearly lightest or darkest; `pick=same` with `as` the one that mixes to the same colour as `as`, every other option clearly different; `pick=between` with `from` and `to` the one whose lightness lies between theirs; `pick=most` with `paint` the one with the biggest share of that paint. `with` adds a paint to every option before mixing. With `of` naming a paint box, `pick=cannot` binds the one colour named in the options that no mix of the box's pans makes. A number set to `kinds` counts the different colours `from` makes (two or three paints, up to `upto` parts of each), which is how many different mixes there are once the same mix made bigger counts once. `how=eye` mixes as dots do. A colour our mixing puts close to the line between two names is refused, so no question rests on a colour that is hard to call.",
        settings: [],
        provides: (settings) => Object.keys(settings).filter((k) => !NOT_ANSWERS.includes(k)),
        solutions: (settings) => [
            `worked out for each variant by mixing${settings.of ? ` ${settings.of}` : " each option"}`,
        ],
        variant(scene, settings) {
            const problems: string[] = [];
            const answers: Record<string, Value> = {};
            for (const [name, test] of Object.entries(settings).filter(
                ([k]) => !NOT_ANSWERS.includes(k),
            )) {
                if (!(OPTION_TESTS as readonly string[]).includes(test)) {
                    problems.push(
                        `${name}=${test} is not something paint.mixes works out; it is one of ${OPTION_TESTS.join(", ")}`,
                    );
                    continue;
                }
                if (test === "kinds") {
                    const pans = (settings.from ?? "")
                        .split(/[\s,+]+/)
                        .filter(Boolean)
                        .map((w) => parseRecipe(w)?.[0]?.pigment);
                    const most = Number(settings.upto);
                    if (pans.length < 2 || pans.length > 3 || pans.some((x) => !x)) {
                        problems.push("kinds needs from= to name two or three paints");
                        continue;
                    }
                    if (!Number.isInteger(most) || most < 1 || most > 6) {
                        problems.push("kinds needs upto= from 1 to 6");
                        continue;
                    }
                    const mixes = everyMix(pans.filter(isPigment), most)
                        .filter((r) => r.length === pans.length)
                        .map(mix);
                    const kinds: string[] = [];
                    for (const h of mixes)
                        if (!kinds.some((k) => apart(k, h) < 0.004)) kinds.push(h);
                    answers[name] = num(kinds.length);
                    continue;
                }
                const options = optionsOf(scene, name);
                if (!options) {
                    problems.push(`${name} is not a choice in the scene`);
                    continue;
                }
                let hits: Opt[] = [];
                if (test === "missing") {
                    const c = node(scene, settings.of);
                    if (c?.type !== "paintpots") {
                        problems.push("missing needs of= to name a paintpots drawing");
                        continue;
                    }
                    const p = paramsOf(c);
                    const holes = words(p.pots).filter((x) => x.trim() === "?").length;
                    const goal = parseRecipe(typeof p.makes === "string" ? p.makes : "");
                    if (holes !== 1) {
                        problems.push(
                            `${c.id} needs exactly one pot drawn as ? for missing, and it has ${holes}`,
                        );
                        continue;
                    }
                    if (!goal) {
                        problems.push(`${c.id} needs makes= to say what the pots make`);
                        continue;
                    }
                    const known = potsRecipe(c).recipe;
                    const want = mix(goal);
                    const made = options.map((o) => ({
                        o,
                        r: parseRecipe(o.label) ?? parseRecipe(o.value),
                    }));
                    if (made.some((m) => !m.r)) {
                        problems.push(
                            `${made
                                .filter((m) => !m.r)
                                .map((m) => m.o.label)
                                .join(", ")} is not paint from the box`,
                        );
                        continue;
                    }
                    const got = made.map((m) => ({ o: m.o, hex: mix(plus(known, m.r ?? [])) }));
                    hits = got.filter((g) => apart(g.hex, want) < 0.01).map((g) => g.o);
                    const near = got
                        .filter((g) => apart(g.hex, want) >= 0.01 && apart(g.hex, want) < 0.06)
                        .map((g) => g.o.label);
                    if (near.length) {
                        problems.push(
                            `${near.join(", ")} makes nearly the same colour as the pot at the end, so it is not clearly wrong`,
                        );
                        continue;
                    }
                } else if (test === "cannot") {
                    const c = node(scene, settings.of);
                    if (c?.type !== "paintbox") {
                        problems.push("cannot needs of= to name a paint box");
                        continue;
                    }
                    const pans = words(paramsOf(c).pans)
                        .map((w) => parseRecipe(w)?.[0]?.pigment)
                        .filter(isPigment);
                    const names = everyMix(pans, 3).map((r) => nameOf(mix(r)));
                    const clear = new Set<string>(names.filter((n) => !n.close).map((n) => n.name));
                    const any = new Set<string>(names.map((n) => n.name));
                    const out = options.filter(
                        (o) => !any.has(plain(o.label)) && !any.has(plain(o.value)),
                    );
                    const unsure = options
                        .filter(
                            (o) =>
                                !out.includes(o) &&
                                !clear.has(plain(o.label)) &&
                                !clear.has(plain(o.value)),
                        )
                        .map((o) => o.label);
                    if (unsure.length) {
                        problems.push(
                            `${unsure.join(", ")} can only just be made from ${pans.join(", ")}, so it is not clearly possible`,
                        );
                        continue;
                    }
                    hits = out;
                } else if (test === "name" || test === "warmth") {
                    const { hex, problems: p } = mixedHere(scene, settings);
                    problems.push(...p);
                    if (!hex) continue;
                    const called = nameOf(hex);
                    const feel = warmth(hex);
                    if (test === "name" && called.close) {
                        problems.push(
                            `the mix comes out ${hex}, too close to the line between ${called.name} and the next colour to ask about`,
                        );
                        continue;
                    }
                    if (test === "warmth" && !feel) {
                        problems.push(
                            `the mix comes out ${hex}, which is neither clearly warm nor clearly cool`,
                        );
                        continue;
                    }
                    const word = test === "name" ? called.name : (feel ?? "");
                    hits = options.filter(
                        (o) => plain(o.label) === word || plain(o.value) === word,
                    );
                    if (!hits.length) {
                        problems.push(
                            `the mix is ${word} (${hex}), which is none of ${name}'s options (${options.map((o) => o.label).join(", ")})`,
                        );
                        continue;
                    }
                } else if (test === "most") {
                    const paint = parseRecipe(settings.paint ?? "")?.[0]?.pigment;
                    if (!paint) {
                        problems.push(
                            "most needs paint= to name the paint whose share is compared",
                        );
                        continue;
                    }
                    const shares = options.map((o) => {
                        const r = parseRecipe(o.label) ?? parseRecipe(o.value);
                        const all = r?.reduce((t, x) => t + x.parts, 0) ?? 0;
                        return r && all
                            ? (r.find((x) => x.pigment === paint)?.parts ?? 0) / all
                            : -1;
                    });
                    if (shares.some((x) => x < 0)) {
                        problems.push("every option for most has to be a recipe");
                        continue;
                    }
                    const top = Math.max(...shares);
                    hits = options.filter((_, i) => shares[i] === top);
                } else {
                    const extra = settings.with ? parseRecipe(settings.with) : [];
                    if (!extra) {
                        problems.push(`with=${settings.with} is not paint from the box`);
                        continue;
                    }
                    const paints = options.map((o) => {
                        const r = parseRecipe(o.label) ?? parseRecipe(o.value);
                        return {
                            o,
                            hex: r
                                ? settings.how === "eye"
                                    ? byEye(plus(r, extra))
                                    : hexOf(rgbOf(mix(plus(r, extra))))
                                : null,
                        };
                    });
                    const bad = paints.filter((p) => !p.hex).map((p) => p.o.label);
                    if (bad.length) {
                        problems.push(
                            `${bad.join(", ")} ${bad.length === 1 ? "is" : "are"} not paint from the box`,
                        );
                        continue;
                    }
                    const hexes = paints.map((p) => p.hex ?? "#FFFFFF");
                    if (test === "makes") {
                        const target = settings.target;
                        if (!target) {
                            problems.push("makes needs target= to say which colour");
                            continue;
                        }
                        const close = paints
                            .filter((p) => nameOf(p.hex ?? "").close)
                            .map((p) => p.o.label);
                        if (close.length) {
                            problems.push(
                                `${close.join(", ")} mixes too close to the line between two colours to be fair`,
                            );
                            continue;
                        }
                        hits = paints
                            .filter((p) => nameOf(p.hex ?? "").name === target)
                            .map((p) => p.o);
                    } else if (test === "same") {
                        const as = parseRecipe(settings.as ?? "");
                        if (!as) {
                            problems.push("same needs as= to give the mix to match");
                            continue;
                        }
                        const want = mix(as);
                        // a mix made bigger is exactly the same colour; anything else, however close, is a different green
                        hits = paints
                            .filter((p) => apart(p.hex ?? "", want) < 0.002)
                            .map((p) => p.o);
                        const near = paints
                            .filter(
                                (p) =>
                                    apart(p.hex ?? "", want) >= 0.002 &&
                                    apart(p.hex ?? "", want) < 0.004,
                            )
                            .map((p) => p.o.label);
                        if (near.length) {
                            problems.push(
                                `${near.join(", ")} is too near the same colour to be clearly different`,
                            );
                            continue;
                        }
                    } else if (test === "between") {
                        const from = parseRecipe(settings.from ?? "");
                        const to = parseRecipe(settings.to ?? "");
                        if (!from || !to) {
                            problems.push("between needs from= and to= as paints");
                            continue;
                        }
                        const lo = Math.min(lightness(mix(from)), lightness(mix(to)));
                        const hi = Math.max(lightness(mix(from)), lightness(mix(to)));
                        const light = hexes.map(lightness);
                        hits = paints
                            .filter((_, i) => {
                                const l = light[i] ?? 0;
                                return l > lo + 0.01 && l < hi - 0.01;
                            })
                            .map((p) => p.o);
                        const edge = paints
                            .filter((_, i) => {
                                const l = light[i] ?? 0;
                                return Math.abs(l - lo) <= 0.01 || Math.abs(l - hi) <= 0.01;
                            })
                            .map((p) => p.o.label);
                        if (edge.length) {
                            problems.push(
                                `${edge.join(", ")} is too near the light or the dark end to call`,
                            );
                            continue;
                        }
                    } else if (test === "warm" || test === "cool") {
                        const each = hexes.map(warmth);
                        const unsure = paints
                            .filter((_, i) => each[i] === null)
                            .map((p) => p.o.label);
                        if (unsure.length) {
                            problems.push(
                                `${unsure.join(", ")} is neither clearly warm nor clearly cool`,
                            );
                            continue;
                        }
                        hits = paints.filter((_, i) => each[i] === test).map((p) => p.o);
                    } else {
                        const light = hexes.map(lightness);
                        const sorted = [...light].sort((a, b) =>
                            test === "lighter" ? b - a : a - b,
                        );
                        const [first = 0, second = -1] = sorted;
                        if (Math.abs(first - second) < 0.05) {
                            problems.push(
                                `two options are too near in lightness for one to be clearly ${test}`,
                            );
                            continue;
                        }
                        hits = paints.filter((_, i) => light[i] === first).map((p) => p.o);
                    }
                }
                const got = one(hits, name);
                if ("v" in got) answers[name] = got.v;
                else problems.push(got.problem);
            }
            return { answers, problems };
        },
    },
    "paint.mirror": {
        doc: "The child picks which half finishes a mirror, or which print a block makes. `of` names the mirrorpick drawing and `pick` the choice; the checker rebuilds the drawing's three halves from its seed and requires exactly one of them to be the mirror, which refuses a half that is the same both ways round.",
        settings: ["of"],
        provides: (settings) => Object.keys(settings).filter((k) => k !== "of"),
        solutions: () => ["the one half that is the mirror, worked out for each variant"],
        variant(scene, settings) {
            const problems: string[] = [];
            const answers: Record<string, Value> = {};
            const c = node(scene, settings.of);
            if (!c || c.type !== "mirrorpick")
                return { answers, problems: [`there is no mirrorpick called ${settings.of}`] };
            const p = paramsOf(c);
            const { half, options, right } = mirrorOptions(
                Number(p.seed),
                Math.round(Number(p.rows)),
                Math.round(Number(p.cols)),
                Number(p.answer),
            );
            const found = mirrorsAmong(half, options);
            if (found.length !== 1 || found[0] !== right)
                problems.push(
                    `with seed ${Number(p.seed)} the half is the same both ways round, so ${found.length} of the halves are mirrors`,
                );
            if (half.every((r) => r.every((v) => v < 0)))
                problems.push(`with seed ${Number(p.seed)} the half has nothing painted in it`);
            for (const name of Object.keys(settings).filter((k) => k !== "of")) {
                const opts = optionsOf(scene, name);
                const letter = "ABC".charAt(right);
                const hit = opts?.find(
                    (o) =>
                        plain(o.label) === letter.toLowerCase() ||
                        plain(o.value) === letter.toLowerCase(),
                );
                if (!hit) {
                    problems.push(`${name} has no option ${letter}`);
                    continue;
                }
                answers[name] = str(hit.value);
            }
            return { answers, problems };
        },
    },
    "art.shapes": {
        doc: "Answers about shapes, read off the drawing's own list. `of` names the drawing: for a cut-paper picture, a setting naming a shape (`answer=triangle`, or a parameter in braces) is how many pieces of that shape it holds, and `geometric`, `organic` or `all` counts the pieces of that kind or every piece; two joined by a dash (`geometric-organic`) is how many more of the first there are, and `times` multiplies the count, for a picture made more than once; for a stencil showing one shape, `pick=kind` binds a choice to geometric or organic.",
        settings: ["of"],
        provides: (settings) => Object.keys(settings).filter((k) => k !== "of" && k !== "times"),
        solutions: (settings) => [
            `worked out for each variant from the shapes ${settings.of} is made of`,
        ],
        variant(scene, settings) {
            const problems: string[] = [];
            const answers: Record<string, Value> = {};
            const c = node(scene, settings.of);
            if (!c) return { answers, problems: [`there is no ${settings.of} in the scene`] };
            const p = paramsOf(c);
            for (const [name, spec] of Object.entries(settings).filter(
                ([k]) => k !== "of" && k !== "times",
            )) {
                if (spec === "kind") {
                    if (c.type !== "stencil") {
                        problems.push(
                            `kind is asked of a stencil drawing, and ${settings.of} is a ${c.type}`,
                        );
                        continue;
                    }
                    const word = (GEOMETRIC as readonly string[]).includes(String(p.shape))
                        ? "geometric"
                        : "organic";
                    const hit = optionsOf(scene, name)?.find(
                        (o) => plain(o.label) === word || plain(o.value) === word,
                    );
                    if (!hit) {
                        problems.push(`${name} has no option ${word}`);
                        continue;
                    }
                    answers[name] = str(hit.value);
                } else {
                    if (c.type !== "collage") {
                        problems.push(
                            `a count of ${spec} pieces is asked of a cut-paper picture, and ${settings.of} is a ${c.type}`,
                        );
                        continue;
                    }
                    // "geometric-organic" is how many more of the first than the second
                    const [first = spec, second] = spec.split("-");
                    const picture = String(p.scene);
                    const times = Number(settings.times ?? 1);
                    const n = piecesIn(picture, first) - (second ? piecesIn(picture, second) : 0);
                    if (!piecesIn(picture, first))
                        problems.push(
                            `the ${picture} has no ${first} in it, so there is nothing to count`,
                        );
                    if (second && n <= 0)
                        problems.push(
                            `the ${picture} has no more ${first} pieces than ${second} ones`,
                        );
                    answers[name] = num(n * times);
                }
            }
            return { answers, problems };
        },
    },
    "art.one-line": {
        doc: "Which figure can, or cannot, be drawn without lifting the pencil or going over a line twice. `of` names the oneline drawing; `pick=can` binds a lettered choice to the one figure that can be drawn so, and `pick=cannot` to the one that cannot, by Euler's rule (the lines join up and at most two corners have an odd number of lines).",
        settings: ["of"],
        provides: (settings) => Object.keys(settings).filter((k) => k !== "of"),
        solutions: (settings) => [
            `worked out for each variant by counting the lines at every corner of ${settings.of}`,
        ],
        variant(scene, settings) {
            const problems: string[] = [];
            const answers: Record<string, Value> = {};
            const c = node(scene, settings.of);
            if (c?.type !== "oneline")
                return { answers, problems: [`there is no oneline drawing called ${settings.of}`] };
            const figures = words(paramsOf(c).figures);
            const each = figures.map(inOneLine);
            const unknown = figures.filter((_, i) => each[i] === null);
            if (unknown.length)
                return {
                    answers,
                    problems: [`${unknown.join(", ")} is not a figure the drawing has`],
                };
            for (const [name, want] of Object.entries(settings).filter(([k]) => k !== "of")) {
                if (want !== "can" && want !== "cannot") {
                    problems.push(`${name}=${want} is not can or cannot`);
                    continue;
                }
                const found = figures.map((_, i) => i).filter((i) => each[i] === (want === "can"));
                const [index] = found;
                if (found.length !== 1 || index === undefined) {
                    problems.push(
                        `${found.length} of the figures ${want} be drawn in one line, so ${name} does not have one answer`,
                    );
                    continue;
                }
                const letter = "ABCD".charAt(index);
                const hit = optionsOf(scene, name)?.find(
                    (o) =>
                        plain(o.label) === letter.toLowerCase() ||
                        plain(o.value) === letter.toLowerCase(),
                );
                if (!hit) {
                    problems.push(`${name} has no option ${letter}`);
                    continue;
                }
                answers[name] = str(hit.value);
            }
            return { answers, problems };
        },
    },
    "art.print": {
        doc: "Which letters or words print the right way round from a block carved the ordinary way, as they are written. A print is the block turned over, so a word prints true only if it reads the same backwards and every letter is the same in a mirror down its middle (A, H, I, M, O, T, U, V, W, X and Y). `pick=true` binds a choice to the one option that prints true; `pick=false` to the one that does not.",
        settings: [],
        provides: (settings) => Object.keys(settings),
        solutions: () => [
            "worked out for each variant by turning every option over, letter by letter",
        ],
        variant(scene, settings) {
            const problems: string[] = [];
            const answers: Record<string, Value> = {};
            const same = (w: string): boolean => {
                const t = w.trim().toUpperCase();
                return (
                    /^[A-Z]+$/.test(t) &&
                    Array.from(t).every((ch) => "AHIMOTUVWXY".includes(ch)) &&
                    Array.from(t).reverse().join("") === t
                );
            };
            for (const [name, want] of Object.entries(settings)) {
                if (want !== "true" && want !== "false") {
                    problems.push(`${name}=${want} is not true or false`);
                    continue;
                }
                const options = optionsOf(scene, name);
                if (!options) {
                    problems.push(`${name} is not a choice in the scene`);
                    continue;
                }
                const bad = options
                    .filter((o) => !/^[A-Za-z]+$/.test(o.label.trim()))
                    .map((o) => o.label);
                if (bad.length) {
                    problems.push(`${bad.join(", ")} is not a word or a letter`);
                    continue;
                }
                const hits = options.filter((o) => same(o.label) === (want === "true"));
                const [hit] = hits;
                if (hits.length !== 1 || !hit) {
                    problems.push(
                        `${hits.length} options print ${want === "true" ? "true" : "backwards"}, so ${name} does not have one answer`,
                    );
                    continue;
                }
                answers[name] = str(hit.value);
            }
            return { answers, problems };
        },
    },
    "art.by-eye": {
        doc: "A painting or a drawing that a grown-up responds to rather than marks. `look-for` says what a good attempt shows, in the art's own words; `notice` lists two to five short points the grown-up can tick when they see them, which is what a response records; `ask` is a question to start the talk. The sentence and the question print on the grown-ups' sheet.",
        settings: ["look-for", "notice", "ask"],
        solutions(settings) {
            const look = (settings["look-for"] ?? "").trim();
            const ask = (settings.ask ?? "").trim();
            if (look.length < 20)
                throw new Error("look-for= needs a sentence saying what a good attempt shows");
            if (ask.length < 10 || !ask.endsWith("?"))
                throw new Error("ask= needs a question for the grown-up to start with");
            let points: unknown = null;
            try {
                points = JSON.parse(settings.notice ?? "null");
            } catch {
                points = null;
            }
            if (
                !Array.isArray(points) ||
                points.length < 2 ||
                points.length > 5 ||
                !points.every((x) => typeof x === "string" && x.length >= 6 && x.length <= 70)
            )
                throw new Error(
                    'notice= needs two to five short points to tick, written as ["...", "..."]',
                );
            return [`${look} Ask: ${ask}`];
        },
    },
};
