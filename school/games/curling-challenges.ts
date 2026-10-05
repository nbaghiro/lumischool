// The variations of Curling on the pond, and a solver that plays each one to its win through the real
// pond: for every throw it tries a spread of lines and weights each way of turning the stone, plays
// each on a copy of the game, blue's replies included, and keeps the throws that win or leave the ask
// still in reach. A variation a child is given has been played to the end this way first, both by the
// keys and by a finger pulling the stone back and letting go.
import { emptyPad, type Dir, type Pad } from "../../engine/motion/pad";
import type { Pt } from "../../engine/motion/geometry";
import { speedFor } from "../../engine/motion/ice";
import {
    CURL_LEVELS,
    POND,
    THROW,
    curlingGame,
    endScore,
    ringScores,
    sheetOf,
    startCurl,
    type CurlLevel,
    type CurlState,
} from "./curling";

export interface CurlConfiguration {
    phase: number;
    variant: number;
}

export const CURL_VARIANTS = 3;

/** The level as one of its variations lays it out: as written, mirrored across the pond, or with its stones nudged and its total changed. */
export function vary(L: CurlLevel, variant: number): CurlLevel {
    if (variant === 1)
        return {
            ...L,
            placed: L.placed.map((p) => ({ x: p.x, y: 2 * POND.mid - p.y })),
            ...(L.wind ? { wind: -L.wind } : {}),
        };
    if (variant === 2) {
        const placed = L.placed.map((p) => ({ x: p.x - 0.8, y: p.y }));
        if (L.ask.kind !== "total") return { ...L, placed };
        const from = L.ask.total,
            to = from === 10 ? 9 : from === 5 ? 4 : from + 1;
        return {
            ...L,
            placed,
            ask: { kind: "total", total: to },
            title: L.title.replace(`exactly ${from}`, `exactly ${to}`),
            goal: L.goal.replace(`exactly ${from}`, `exactly ${to}`),
        };
    }
    return L;
}

export function curlChallenge(seed: number, phase: number): CurlConfiguration {
    const p = Number.isInteger(phase) && phase >= 0 && phase < CURL_LEVELS.length ? phase : 0;
    return { phase: p, variant: (seed >>> 0) % CURL_VARIANTS };
}

export function isCurlConfiguration(v: unknown, phase: number): v is CurlConfiguration {
    if (typeof v !== "object" || v === null || !("phase" in v) || !("variant" in v)) return false;
    return (
        Object.keys(v).length === 2 &&
        v.phase === phase &&
        typeof v.variant === "number" &&
        Number.isInteger(v.variant) &&
        v.variant >= 0 &&
        v.variant < CURL_VARIANTS &&
        CURL_LEVELS[phase] !== undefined
    );
}

export const curlLevelOf = (c: CurlConfiguration): CurlLevel => {
    const L = CURL_LEVELS[c.phase];
    if (!L) throw new Error("No such curling level");
    return vary(L, c.variant);
};

export const openCurlConfiguration = (c: CurlConfiguration): CurlState =>
    startCurl(curlLevelOf(c), c.phase);

/** A throw to try: its line, its weight and which way it is turned. */
interface Throw {
    angle: number;
    power: number;
    curl: 1 | -1;
}

/** How a throw is played: by holding arrows and pressing the big button, or by a finger. */
export type Hands = "keys" | "touch";

const RATE = curlingGame.rate;
const TURN = THROW.turn / RATE,
    RAMP = THROW.ramp / RATE;

const step = (s: CurlState, p: Pad) =>
    curlingGame.step(s, { ...p, holding: [...p.holding], pressed: [...p.pressed] });

const held = (d: Dir): Pad => ({ ...emptyPad(), holding: [d], held: d });
const touching = (at: Pt): Pad => ({ ...emptyPad(), touch: { ...at } });
const lifting = (at: Pt): Pad => ({ ...emptyPad(), lifted: { ...at } });

/** The pads that play a throw from where the aim stands now. */
function padsFor(s: CurlState, t: Throw, hands: Hands): Pad[] {
    const out: Pad[] = [];
    const stone = { x: POND.hack, y: POND.mid };
    if (hands === "keys") {
        if (t.curl !== s.curl) out.push({ ...emptyPad(), brake: true }, emptyPad());
        const turns = Math.round((t.angle - s.aim.angle) / TURN),
            ramps = Math.round((t.power - s.aim.power) / RAMP);
        // up turns the line up the page, which is a smaller angle; right adds weight
        for (let i = 0; i < Math.abs(turns); i++) out.push(held(turns < 0 ? "up" : "down"));
        for (let i = 0; i < Math.abs(ramps); i++) out.push(held(ramps < 0 ? "left" : "right"));
        out.push({ ...emptyPad(), go: true, tapped: true }, emptyPad());
        return out;
    }
    if (t.curl !== s.curl) out.push(touching(stone), lifting(stone), emptyPad());
    const len = t.power / THROW.per,
        end = { x: stone.x - Math.cos(t.angle) * len, y: stone.y - Math.sin(t.angle) * len };
    out.push(touching(stone));
    for (let k = 1; k <= 4; k++)
        out.push(
            touching({
                x: stone.x + ((end.x - stone.x) * k) / 4,
                y: stone.y + ((end.y - stone.y) * k) / 4,
            }),
        );
    out.push(lifting(end), emptyPad());
    return out;
}

/** Steps with nothing pressed until it is the child's throw again, the ask is met, or the end is lost. */
function settle(s: CurlState): Pad[] {
    const out: Pad[] = [];
    for (let i = 0; i < RATE * 120; i++) {
        if (curlingGame.won(s)) break;
        if (s.mode === "aim" && s.turn === "ours") break;
        if (s.mode === "lost") break;
        const p = emptyPad();
        step(s, p);
        out.push(p);
    }
    return out;
}

const failed = (s: CurlState) => s.mode === "lost";

/** The throws worth trying from here: draws to every part of the house, and hard throws for a takeout, each way of turning. */
function* throws(s: CurlState): Generator<Throw> {
    const sheet = sheetOf(s.L),
        from = { x: POND.hack, y: POND.mid };
    const targets: Pt[] = [];
    for (let dx = -3; dx <= 3.01; dx += 0.75)
        for (let dy = -2.5; dy <= 2.51; dy += 1.25)
            targets.push({ x: POND.tee + dx, y: POND.mid + dy });
    const blue = s.stones.filter((x) => x.team === "theirs" && !x.out);
    for (const curl of [1, -1] as const) {
        for (const b of blue)
            for (const off of [0, -0.4, 0.4])
                for (const power of [11, 12.5, 14]) {
                    const a = Math.atan2(b.y + off - from.y, b.x - from.x);
                    yield { angle: a, power, curl };
                }
        for (const t of targets) {
            const d = Math.hypot(t.x - from.x, t.y - from.y);
            // a turned stone ends a little to the side it curls, so aim against it
            for (const lean of [0, 1, 2]) {
                const y = t.y - curl * lean * 1.1,
                    a = Math.atan2(y - from.y, t.x - from.x);
                if (a < THROW.lo || a > THROW.hi) continue;
                const power = Math.min(THROW.max, Math.max(THROW.min, speedFor(d, sheet)));
                yield { angle: a, power, curl };
            }
        }
    }
}

/** How promising the ice is after a throw, for trying the best first: the rings it adds up to, or how well the child's side lies. */
function promise(s: CurlState): number | null {
    const ask = s.L.ask;
    if (ask.kind === "total") {
        const sum = ringScores(s).reduce((a, b) => a + b, 0),
            left = s.ours;
        if (sum > ask.total || ask.total - sum > 4 * left) return null;
        return sum;
    }
    if (ask.kind === "shot" || ask.kind === "match")
        return endScore(s).ours * 10 - endScore(s).theirs;
    return 0;
}

function search(s: CurlState, hands: Hands, depth: number, wide: number): Pad[] | null {
    if (curlingGame.won(s)) return [];
    if (depth === 0) return null;
    const kept: { pads: Pad[]; after: CurlState; score: number }[] = [];
    const seen = new Set<string>();
    for (const t of throws(s)) {
        const after = structuredClone(s),
            pads = padsFor(after, t, hands);
        for (const p of pads) step(after, p);
        pads.push(...settle(after));
        if (curlingGame.won(after)) return pads;
        if (failed(after)) continue;
        const score = promise(after);
        if (score === null) continue;
        // two throws that leave the stones in the same places are one choice
        const key = after.stones
            .map((x) => (x.out ? "-" : `${Math.round(x.x * 2)},${Math.round(x.y * 2)}`))
            .join(" ");
        if (seen.has(key)) continue;
        seen.add(key);
        kept.push({ pads, after, score });
    }
    kept.sort((a, b) => b.score - a.score);
    for (const k of kept.slice(0, wide)) {
        const rest = search(k.after, hands, depth - 1, wide);
        if (rest) return [...k.pads, ...rest];
    }
    return null;
}

/**
 * The pads that play a variation to its win, throw by throw, by the keys or by a finger, or null when
 * no run of the throws tried wins it. Every throw is played on a copy of the real pond, blue's
 * replies with it, and a later throw that finds nothing sends the search back to try another before it.
 */
export function curlWay(c: CurlConfiguration, hands: Hands = "keys"): Pad[] | null {
    const s = openCurlConfiguration(c);
    const lead = settle(s);
    const rest = search(s, hands, s.L.stones * s.L.ends, 3);
    return rest ? [...lead, ...rest] : null;
}
