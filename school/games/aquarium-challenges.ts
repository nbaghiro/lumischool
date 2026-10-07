// The variations of Charlie's aquarium, and a pilot that plays each one through the real game, once by
// the keys and once by a finger on the field. The pilot watches the tank as it goes, as a child does:
// it pours until the water and what is still falling reach the line, sweeps the net slowly up to a
// fish and carries it over, tosses as many pinches as the request makes, plants until the meter will
// settle fine, and turns the dial a degree at a time. The pads it makes are kept, and played into a
// fresh round they give the same tank, which is the replay witness.
import { launchOf, type Aim } from "../../engine/motion/aim";
import type { Pt } from "../../engine/motion/geometry";
import { emptyPad, spent, type Dir, type Pad } from "../../engine/motion/pad";
import { FINE, settled } from "../../engine/motion/waterquality";
import {
    AQUA_LEVELS,
    AQUA_VARIANTS,
    FOOD,
    PLANTS,
    TABLE,
    aquariumGame,
    dialOf,
    filterOf,
    flyPinch,
    goalDone,
    innerOf,
    levelOf,
    needsOf,
    spotOf,
    startAquarium,
    surfaceOf,
    traySpot,
    tubMouth,
    underOf,
    waterAt,
    type AquaLevel,
    type AquaState,
    type Fish,
    type Goal,
} from "./aquarium";

interface AquaConfiguration {
    phase: number;
    variant: number;
}

export function aquaChallenge(seed: number, phase: number): AquaConfiguration {
    const p = Number.isInteger(phase) && phase >= 0 && phase < AQUA_LEVELS.length ? phase : 0;
    return { phase: p, variant: (seed >>> 0) % AQUA_VARIANTS };
}

export function isAquaConfiguration(v: unknown, phase: number): v is AquaConfiguration {
    if (typeof v !== "object" || v === null || !("phase" in v) || !("variant" in v)) return false;
    return (
        Object.keys(v).length === 2 &&
        v.phase === phase &&
        typeof v.variant === "number" &&
        Number.isInteger(v.variant) &&
        v.variant >= 0 &&
        v.variant < AQUA_VARIANTS &&
        AQUA_LEVELS[phase] !== undefined
    );
}

export const aquaLevel = (c: AquaConfiguration): AquaLevel => levelOf(c.phase, c.variant);

export function openAquaConfiguration(c: AquaConfiguration): AquaState {
    return startAquarium(aquaLevel(c), c.phase);
}

type Hand = "keys" | "touch";
type Plan = Generator<Pad, void, void>;

const pad = (o: Partial<Pad> = {}): Pad => ({ ...emptyPad(), ...o });

/** The hand's arrows towards `to`, held, and let go for a step every so often when it should stay slow. */
function* keysTo(
    s: AquaState,
    to: () => Pt,
    slow: boolean,
    within = 0.12,
    most = 900,
    until: () => boolean = () => false,
): Plan {
    for (let i = 0; i < most && !until(); i++) {
        const t = to(),
            dx = t.x - s.hand.x,
            dy = t.y - s.hand.y;
        if (Math.hypot(dx, dy) <= within) return;
        const far = Math.hypot(dx, dy) > 1.6;
        // a hand held on runs faster and faster, so a slow hand lets go before it speeds up
        if ((slow || !far) && s.run >= 10) {
            yield pad();
            continue;
        }
        const holding: Dir[] = [];
        if (Math.abs(dx) > within * 0.6) holding.push(dx > 0 ? "right" : "left");
        if (Math.abs(dy) > within * 0.6) holding.push(dy > 0 ? "down" : "up");
        yield pad({
            holding,
            held: holding[holding.length - 1] ?? null,
            pressed: s.run === 0 ? [...holding] : [],
        });
    }
}

/** A finger moved from where it is to `to` at `speed` squares a second, held down all the way. */
function* fingerTo(
    from: Pt,
    to: () => Pt,
    speed: number,
    within = 0.05,
    most = 900,
    until: () => boolean = () => false,
): Generator<Pad, Pt, void> {
    let at = { ...from };
    for (let i = 0; i < most && !until(); i++) {
        const t = to(),
            dx = t.x - at.x,
            dy = t.y - at.y,
            d = Math.hypot(dx, dy),
            v = speed / 60;
        at = d > v ? { x: at.x + (dx / d) * v, y: at.y + (dy / d) * v } : { ...t };
        yield pad({ touch: { ...at } });
        if (d <= within) return at;
    }
    return at;
}

function* press(): Plan {
    yield pad({ go: true, tapped: true, keys: true });
    yield pad();
}

function* tap(p: Pt): Plan {
    yield pad({ touch: { ...p } });
    yield pad({ lifted: { ...p } });
}

function* wait(s: AquaState, until: () => boolean, most = 60 * 40): Plan {
    for (let i = 0; i < most && !until() && s.end === null; i++) yield pad();
}

/** Takes the tool from its ledge by the keys, unless it is in hand already; a finger presses on it as it goes. */
function* get(s: AquaState, tool: "jug" | "net" | "food"): Plan {
    if (s.tool === tool) return;
    const at = spotOf(s, tool);
    if (!at) return;
    yield* keysTo(s, () => at, false, 0.3);
    yield* press();
}

const inFlight = (s: AquaState): number => s.carry.reduce((a, c) => a + c, 0);

/** A finger presses on the jug, carries it level over tank `ti`, lowers it to `to` until `until`, and lets go. */
function* jugByFinger(s: AquaState, ti: number, to: () => Pt, until: () => boolean): Plan {
    const t = s.tanks[ti],
        spot = spotOf(s, "jug");
    if (!t || !spot) return;
    yield pad({ touch: { ...spot } });
    const level = (): Pt => ({ x: t.x - 1.5, y: innerOf(t).top - 3.4 });
    let at = yield* fingerTo(spot, level, 12, 0.1);
    at = yield* fingerTo(at, to, 5, 0.05, 60 * 30, until);
    for (let i = 0; i < 60 * 30 && !until(); i++) {
        at = { ...to() };
        yield pad({ touch: at });
    }
    yield pad({ lifted: at });
}

function* fill(s: AquaState, hand: Hand, g: Extract<Goal, { kind: "fill" }>): Plan {
    const t = s.tanks[g.tank];
    if (!t) return;
    const at = (x: number, y: () => number) => (): Pt => ({ x: t.x - 1.5 + x, y: y() });
    const full = at(0, () => innerOf(t).top - 0.6),
        gentle = at(0, () => innerOf(t).top - 2.4),
        under = at(0, () => surfaceOf(t) + 1.2);
    const pourTill = function* (aim: number, to: () => Pt): Plan {
        const enough = () => t.litres + inFlight(s) >= aim;
        if (hand === "keys") {
            yield* get(s, "jug");
            yield* keysTo(s, to, false, 0.3);
            yield pad({ go: true, tapped: true, keys: true });
            for (let i = 0; i < 60 * 30 && !enough(); i++) yield pad({ go: true, keys: true });
            yield pad();
        } else yield* jugByFinger(s, g.tank, to, enough);
        yield* wait(s, () => s.drops.tags.length === 0);
    };
    const scoopTill = function* (aim: number): Plan {
        const enough = () => t.litres <= aim;
        if (hand === "keys") {
            yield* get(s, "jug");
            yield* keysTo(s, under, false, 0.25);
            yield pad({ go: true, tapped: true, keys: true });
            for (let i = 0; i < 60 * 30 && !enough(); i++) yield pad({ go: true, keys: true });
            yield pad();
        } else yield* jugByFinger(s, g.tank, under, enough);
    };
    yield* pourTill(g.litres - g.within * 0.4, full);
    for (let k = 0; k < 20 && !goalDone(s, g); k++) {
        if (t.litres < g.litres) yield* pourTill(g.litres - g.within * 0.4, gentle);
        else yield* scoopTill(g.litres + g.within * 0.4);
    }
}

/** The tank a fish in tank `from` should be carried to for a request, or null when it is where it should be. */
type Wanted = (s: AquaState, f: Fish, from: number) => number | null;

const fits = (f: { kind: string; tone: string }, w: { kind?: string; tone?: string }): boolean =>
    (w.kind === undefined || f.kind === w.kind) && (w.tone === undefined || f.tone === w.tone);

function wantedOf(g: Goal): Wanted {
    switch (g.kind) {
        case "move":
            return (s, f, from) => {
                if (!fits(f, g.which)) return null;
                const source = s.L.fish.find((spec) => fits(spec, g.which))?.tank ?? 0;
                const inIt = s.fish.filter((o) => o.tank === g.to && fits(o, g.which)).length;
                if (from === g.to) return inIt > g.n ? source : null;
                return inIt < g.n ? g.to : null;
            };
        case "sort":
            return (s, f, from) => {
                if (s.tanks[from]?.tone === f.tone) return null;
                const to = s.tanks.findIndex((t) => t.tone === f.tone);
                return to >= 0 ? to : null;
            };
        case "home":
            return (_s, _f, from) => (from !== g.tank ? g.tank : null);
        case "healthy":
            return (s, _f, from) => {
                const t = s.tanks[from];
                if (!t || !g.tanks.includes(from) || needsOf(s, from) <= t.litres) return null;
                const to = g.tanks.find((i) => {
                    const o = s.tanks[i];
                    return o && i !== from && needsOf(s, i) + 2 <= o.litres;
                });
                return to ?? null;
            };
        default:
            return () => null;
    }
}

/** Where the fish in the net should go, judged as if it were still in the tank it was caught from. */
function destination(s: AquaState, wanted: Wanted, caught: Fish): number {
    const view = structuredClone(s),
        f = view.fish.find((o) => o.key === caught.key);
    if (!f) return s.net.from;
    f.tank = s.net.from;
    view.net.fish = [];
    return wanted(view, f, s.net.from) ?? s.net.from;
}

/** Nets one fish that `wanted` sends somewhere and carries it there; a stray caught on the way goes back. */
function* carryOne(s: AquaState, hand: Hand, wanted: Wanted): Generator<Pad, boolean, void> {
    const pick = (): Fish | null => {
        let best: Fish | null = null,
            bd = Infinity;
        for (const f of s.fish) {
            if (f.tank < 0 || wanted(s, f, f.tank) === null) continue;
            const d = Math.hypot(f.x - s.hand.x, f.y - s.hand.y);
            if (d < bd) {
                bd = d;
                best = f;
            }
        }
        return best;
    };
    const f = pick();
    if (!f) return false;
    if (hand === "keys") yield* get(s, "net");
    const from = s.tanks[f.tank];
    if (!from) return false;
    const above = (): Pt => ({
        x: Math.max(innerOf(from).x0 + 1, Math.min(innerOf(from).x1 - 1, f.x)),
        y: surfaceOf(from) - 1.2,
    });
    const target = (): Pt => ({ x: f.x, y: f.y });
    const caughtOne = () => s.net.fish.length > 0;
    let at: Pt = { ...s.hand };
    if (hand === "keys") {
        yield* keysTo(s, above, false, 0.4);
        yield* wait(s, () => s.net.speed < 0.5, 40);
        yield* keysTo(s, target, true, 0.15, 60 * 25, caughtOne);
        if (!s.net.fish.length) yield* press();
    } else {
        // the net is pressed on where it hangs or on the shelf, and carried from there
        const spot = s.tool === "net" ? s.hand : spotOf(s, "net");
        if (!spot) return false;
        at = { ...spot };
        yield pad({ touch: { ...at } });
        at = yield* fingerTo({ ...at }, above, 12, 0.3);
        for (let i = 0; i < 20; i++) yield pad({ touch: { ...at } });
        at = yield* fingerTo(at, target, 2.2, 0.05, 60 * 25, caughtOne);
        for (let i = 0; i < 30 && !s.net.fish.length; i++) yield pad({ touch: { ...at } });
    }
    const caught = s.fish.find((o) => s.net.fish.includes(o.key));
    if (!caught) {
        if (hand === "touch") yield pad({ lifted: { ...at } });
        return true;
    }
    const goes = destination(s, wanted, caught);
    const to = s.tanks[goes];
    if (!to) return false;
    const lift = (): Pt => ({ x: s.hand.x, y: innerOf(to).top - 1.5 });
    const over = (): Pt => ({ x: to.x, y: innerOf(to).top - 1.5 });
    const dip = (): Pt => ({ x: to.x, y: Math.min(innerOf(to).bottom - 1, surfaceOf(to) + 1.1) });
    if (hand === "keys") {
        yield* keysTo(s, lift, false, 0.4);
        yield* keysTo(s, over, false, 0.4);
        yield* keysTo(s, dip, false, 0.2);
        yield* press();
        yield* keysTo(s, over, false, 0.5);
    } else {
        at = yield* fingerTo(at, lift, 9, 0.2);
        at = yield* fingerTo(at, over, 9, 0.2);
        at = yield* fingerTo(at, dip, 6, 0.05);
        yield pad({ lifted: { ...at } });
    }
    return true;
}

function* moveAll(s: AquaState, hand: Hand, g: Goal): Plan {
    const wanted = wantedOf(g);
    for (let k = 0; k < 40; k++) {
        if (!s.fish.some((f) => f.tank >= 0 && wanted(s, f, f.tank) !== null)) return;
        const went = yield* carryOne(s, hand, wanted);
        if (!went) return;
    }
}

/** The aim that lands a pinch nearest the middle of tank `ti`, from a sweep of angles and strengths. */
export function aimFor(s: AquaState, ti: number): Aim | null {
    const t = s.tanks[ti];
    if (!t) return null;
    let best: Aim | null = null,
        bd = Infinity;
    for (let a = FOOD.lo; a <= FOOD.hi; a += 0.02)
        for (let power = FOOD.min; power <= FOOD.max; power += 0.25) {
            let p = tubMouth(s),
                v = launchOf({ angle: a, power, pulling: false }),
                top = p.y;
            for (let i = 0; i < 400; i++) {
                ({ p, v } = flyPinch(p, v));
                top = Math.min(top, p.y);
                if (v.y > 0 && waterAt(s, { x: p.x, y: p.y + 0.05 }) >= 0) break;
                if (p.y > TABLE) break;
            }
            if (waterAt(s, { x: p.x, y: p.y + 0.05 }) !== ti) continue;
            // a toss that stays under the step strip at the top of the field, as a child's would
            const d = Math.abs(p.x - t.x) + (top < 3 ? 10 : 0);
            if (d < bd) {
                bd = d;
                best = { angle: a, power, pulling: false };
            }
        }
    return best;
}

function* feed(s: AquaState, hand: Hand, g: Extract<Goal, { kind: "feed" }>): Plan {
    if (hand === "keys") yield* get(s, "food");
    const fish = () =>
        s.fish.filter(
            (f) => f.tank === g.tank && (g.which.kind === undefined || f.kind === g.which.kind),
        );
    const tosses = Math.ceil((fish().length * g.each) / g.pinch);
    const want = aimFor(s, g.tank);
    if (!want) return;
    for (let k = 0; k < tosses; k++) {
        if (hand === "keys") {
            // the arrows turn the aim and change its strength a step at a time, so count the steps
            const turn = FOOD.turn / 60,
                ramp = FOOD.ramp / 60;
            const da = want.angle - s.aim.angle,
                dp = want.power - s.aim.power;
            const na = Math.round(Math.abs(da) / turn),
                np = Math.round(Math.abs(dp) / ramp);
            for (let i = 0; i < Math.max(na, np); i++) {
                const holding: Dir[] = [];
                if (i < na) holding.push(da < 0 ? "up" : "down");
                if (i < np) holding.push(dp < 0 ? "left" : "right");
                yield pad({ holding, held: holding[holding.length - 1] ?? null });
            }
            yield* press();
        } else {
            // pulled back from the tub itself, which takes it up if it is not in hand
            const down = tubSpot(s);
            const pull = {
                x: -Math.cos(want.angle) * (want.power / FOOD.per),
                y: -Math.sin(want.angle) * (want.power / FOOD.per),
            };
            const end = { x: down.x + pull.x, y: down.y + pull.y };
            yield pad({ touch: down });
            for (let i = 1; i <= 8; i++)
                yield pad({
                    touch: { x: down.x + (pull.x * i) / 8, y: down.y + (pull.y * i) / 8 },
                });
            yield pad({ lifted: end });
        }
        yield* wait(s, () => s.pinches.length === 0);
    }
    yield* wait(s, () => goalDone(s, g) || s.end !== null, 60 * 30);
}

const tubSpot = (s: AquaState): Pt => spotOf(s, "food") ?? { x: 16, y: 3.6 };

function* placeItem(s: AquaState, hand: Hand, i: number, ti: number, x: number): Plan {
    const t = s.tanks[ti];
    if (!t) return;
    const from = traySpot(i),
        to = { x, y: innerOf(t).bottom - 1.5 };
    if (hand === "keys") {
        yield* keysTo(s, () => from, false, 0.25);
        yield* press();
        yield* keysTo(s, () => to, false, 0.3);
        yield* press();
    } else {
        yield pad({ touch: from });
        const at = yield* fingerTo(from, () => to, 14, 0.05);
        yield pad({ lifted: at });
    }
}

/** Plants in tank `ti` until its water would settle with oxygen to spare, each in a free place on the gravel. */
function* plantTill(s: AquaState, hand: Hand, ti: number, enough: () => boolean): Plan {
    const t = s.tanks[ti];
    if (!t) return;
    for (let k = 0; k < 8 && !enough(); k++) {
        const i = s.tray.findIndex((x) => x.n > 0 && PLANTS.includes(x.item));
        if (i < 0) return;
        const k0 = innerOf(t),
            spots = 7;
        const free = Array.from(
            { length: spots },
            (_, j) => k0.x0 + 1.2 + ((k0.x1 - k0.x0 - 2.4) * j) / (spots - 1),
        ).find(
            (x) =>
                t.placed.every((d) => Math.abs(d.x - x) > 1.2) &&
                underOf(s, { x, y: innerOf(t).bottom - 1.5 }) === null,
        );
        yield* placeItem(s, hand, i, ti, free ?? t.x);
    }
}

function lifeOf(s: AquaState, ti: number) {
    const t = s.tanks[ti];
    return {
        litres: t?.litres ?? 0,
        needs: needsOf(s, ti),
        plants: t?.placed.filter((d) => PLANTS.includes(d.item)).length ?? 0,
        snails: t?.placed.filter((d) => d.item === "snail").length ?? 0,
        filter: t?.on === true,
    };
}

function* filterOn(s: AquaState, hand: Hand, ti: number): Plan {
    const f = filterOf(s, ti),
        t = s.tanks[ti];
    if (!f || !t || t.on) return;
    if (hand === "keys") {
        yield* keysTo(s, () => f, false, 0.25);
        yield* press();
    } else yield* tap(f);
}

function* healthy(s: AquaState, hand: Hand, tanks: readonly number[]): Plan {
    for (const ti of tanks) yield* filterOn(s, hand, ti);
    for (const ti of tanks)
        yield* plantTill(s, hand, ti, () => {
            const at = settled(lifeOf(s, ti), 0);
            return at.oxygen >= FINE + 0.04 && at.clean >= FINE + 0.04;
        });
}

function* heat(s: AquaState, hand: Hand, g: Extract<Goal, { kind: "heat" }>): Plan {
    const t = s.tanks[g.tank],
        d = dialOf(s, g.tank);
    if (!t || !d || t.dial === null) return;
    if (hand === "keys") {
        yield* keysTo(s, () => d, false, 0.3);
        yield* press();
        for (let k = 0; k < 20 && t.dial !== g.degrees; k++) {
            yield pad({ pressed: [t.dial < g.degrees ? "up" : "down"] });
            yield pad();
        }
        yield* press();
    } else
        for (let k = 0; k < 20 && t.dial !== g.degrees; k++)
            yield* tap({ x: d.x + (t.dial < g.degrees ? 0.9 : -0.9), y: d.y });
    yield* wait(s, () => goalDone(s, g), 60 * 30);
}

function* plan(s: AquaState, hand: Hand): Plan {
    for (const g of s.L.goals) {
        if (s.end !== null) return;
        switch (g.kind) {
            case "fill":
                yield* fill(s, hand, g);
                break;
            case "move":
            case "sort":
                yield* moveAll(s, hand, g);
                break;
            case "feed":
                yield* feed(s, hand, g);
                break;
            case "plants":
                yield* plantTill(
                    s,
                    hand,
                    g.tank,
                    () => goalDone(s, g) && settled(lifeOf(s, g.tank), 0).oxygen >= FINE + 0.04,
                );
                break;
            case "heat":
                yield* heat(s, hand, g);
                break;
            case "healthy":
                yield* moveAll(s, hand, g);
                yield* healthy(s, hand, g.tanks);
                break;
            case "home":
                yield* moveAll(s, hand, g);
                yield* healthy(s, hand, [g.tank]);
                break;
        }
    }
    yield* wait(s, () => s.end !== null, 60 * 60);
}

const kept = (p: Pad): Pad => ({ ...p, holding: [...p.holding], pressed: [...p.pressed] });

/** The pads that win a variation by the keys or by a finger, or null when the pilot could not. */
export function aquaWay(c: AquaConfiguration, hand: Hand, most = 60 * 60 * 6): Pad[] | null {
    const s = openAquaConfiguration(c),
        pads: Pad[] = [];
    const it = plan(s, hand);
    for (let i = 0; i < most && s.end === null; i++) {
        const next = it.next();
        if (next.done) break;
        pads.push(kept(next.value));
        aquariumGame.step(s, next.value);
        spent(next.value);
    }
    return s.end === "won" ? pads : null;
}

/** A variation played from `pads` on a fresh round, then left to settle. */
export function aquaPlay(c: AquaConfiguration, pads: readonly Pad[]): AquaState {
    const s = openAquaConfiguration(c);
    for (const p of pads) {
        if (s.end !== null) break;
        aquariumGame.step(s, kept(p));
    }
    return s;
}
