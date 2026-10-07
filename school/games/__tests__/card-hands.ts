// The card standard's hands: one round of each card game played as a finger or the mouse on the field
// plays it, with no button under it, as the pads that round takes. card.test.ts checks every pad is one
// the field can give and that the round is won in time. See .docs/game-cards.md.
import { climbGame } from "../climb";
import { climbThrough } from "../climb-challenges";
import { kiteGame } from "../kite";
import { boltGame } from "../bolt";
import { rescueThrough } from "../bolt-challenges";
import { boltflyGame } from "../boltfly";
import { flyWay } from "../boltfly-challenges";
import { kiteWay } from "../kite-challenges";
import { emptyPad, spent, type Pad } from "../../../engine/motion/pad";
import { player, tape } from "../../../engine/motion/tape";
import { endOf, type ActionGame, type RoundEnd } from "../game";
import { dragAll } from "./cargo-hands";
import { pilot as fly } from "./firefly-pilot";
import { pilot as paddle, recordInto } from "./river-pilot";
import { hands as driving } from "./road-driver";
import { steady } from "../clear-challenges";
import { clearGame, type ClearState } from "../clear";
import { aimSpec, fetchGame, type FetchState } from "../fetch";
import { fetchWay } from "../fetch-challenges";
import { COURSE, heightOf, planeGame, type PlaneState } from "../plane";
import { poolGame, SHOT, type PoolState } from "../pool";
import { poolWay } from "../pool-challenges";
import { curlingGame } from "../curling";
import { curlWay } from "../curling-challenges";
import { hoopsGame } from "../hoops";
import { hoopWay } from "../hoops-challenges";
import { feedGame } from "../feedpup";
import { feedWay } from "../feedpup-challenges";
import { aquariumGame } from "../aquarium";
import { aquaWay } from "../aquarium-challenges";
import * as rabbit from "../rabbit";
import { FIRE_AIM, NOZZLE, rescueGame, type RescueState } from "../rescue";
import { driver } from "../rescue-challenges";
import { roadGame, type RoadState } from "../road";
import { snakeGame, type FireflyState } from "../snake";
import { crossing, padsOf } from "../swings-challenges";
import { swingsGame, type SwingsState } from "../swings";
import { cargoGame, type WorkshopState } from "../workshops";
import { rowGame, type RiverState } from "../row";
import type { AimSpec } from "../../../engine/motion/aim";

/** A copy of a pad that later steps cannot change. */
const kept = (p: Pad): Pad => ({ ...p, pressed: [...p.pressed], holding: [...p.holding] });

/** Steps a game with `pad`, keeping a copy, and clears what a step uses up. */
function stepper<S>(game: ActionGame<S>, s: S, pads: Pad[]): (pad: Pad) => void {
    return (pad) => {
        pads.push(kept(pad));
        game.step(s, pad);
        spent(pad);
    };
}

/** The pull a finger makes back from a thing to send it off at `angle` with `power`, as engine/motion/aim.ts reads one. */
const pullFor = (angle: number, power: number, spec: AimSpec) => ({
    x: (-Math.cos(angle) * power) / spec.per,
    y: (-Math.sin(angle) * power) / spec.per,
});

/**
 * A game the keys aim with held arrows and the big button sends off, played instead by a pull: the
 * keys' pads run on a copy, and where the copy is sent off the field lets go of a pull to the same aim,
 * the step before holding it, so the two stay step for step.
 */
function pulled<S extends { aim: { angle: number; power: number } }>(
    game: ActionGame<S>,
    s: S,
    copy: S,
    keys: readonly Pad[],
    spec: AimSpec,
    until: (s: S) => boolean,
): Pad[] {
    const pads: Pad[] = [],
        go = stepper(game, s, pads);
    for (const [i, k] of keys.entries()) {
        if (until(s)) break;
        const next = keys[i + 1];
        game.step(copy, kept(k));
        const pad = emptyPad();
        if (next?.tapped) pad.pull = pullFor(copy.aim.angle, copy.aim.power, spec);
        if (k.tapped) pad.released = pullFor(copy.aim.angle, copy.aim.power, spec);
        go(pad);
    }
    return pads;
}

const cargo = (s: WorkshopState): Pad[] => dragAll(s);

const river = (s: RiverState): Pad[] => {
    const t = tape();
    recordInto(s, t);
    paddle(s, "pointer");
    const pads: Pad[] = [],
        next = player(t);
    for (let e = next(); e; e = next()) if (e.pad) pads.push(e.pad);
    return pads;
};

const firefly = (s: FireflyState): Pad[] => {
    const pads: Pad[] = [];
    fly(s, "pointer", 60 * 300, pads);
    return pads;
};

/** Hold to drive and lift to slow, with a swipe for a lane; the round's one stop is ahead, so the brake is never needed. */
const road = (s: RoadState): Pad[] => {
    const pads: Pad[] = [],
        go = stepper(roadGame, s, pads);
    for (let n = 0; n < 60 * 60 * 3 && !s.won; n++) go(driving(s));
    return pads;
};

/** A finger held climbs and lifted glides: held while the plane is below the next flag's height. */
const plane = (s: PlaneState): Pad[] => {
    const pads: Pad[] = [],
        go = stepper(planeGame, s, pads),
        L = s.L,
        hoop = (k: number) => COURSE.pad + COURSE.first + k * COURSE.every + COURSE.hoop;
    for (let n = 0; n < 60 * 60 * 4 && !s.won; n++) {
        const ahead = L.gates.findIndex((_, k) => !s.done[k] && hoop(k) > s.plane.x),
            k = ahead >= 0 ? ahead : s.done.findIndex((d) => !d),
            gate = L.gates[k],
            want = gate ? heightOf(L, gate.target) : s.plane.y,
            // aim where the plane will be a moment on, so it levels off at the height and does not overshoot it
            soon = s.plane.y + s.plane.vy * 0.25;
        const pad = emptyPad();
        if (soon > want) pad.touch = { x: s.plane.x + 4, y: want };
        go(pad);
    }
    return pads;
};

const pool = (s: PoolState, fresh: () => PoolState): Pad[] =>
    pulled(poolGame, s, fresh(), poolWay({ phase: s.phase, variant: 0 }) ?? [], SHOT, (t) => t.won);

const fetch = (s: FetchState, fresh: () => FetchState): Pad[] =>
    pulled(
        fetchGame,
        s,
        fresh(),
        fetchWay({ phase: s.level, variant: 0 }) ?? [],
        aimSpec(),
        (t) => t.won,
    );

/** A tap on the field is a touch for a step and a lift, which the pony reads as Jump's press and let go. */
const clear = (s: ClearState): Pad[] => {
    const pads: Pad[] = [],
        go = stepper(clearGame, s, pads);
    let lift = false;
    for (let n = 0; n < 60 * 120 && !s.done; n++) {
        const pad = emptyPad();
        if (lift) pad.lifted = { x: s.pony.x, y: s.pony.y };
        else if (steady(s).go) pad.touch = { x: s.pony.x, y: s.pony.y };
        lift = pad.touch !== null;
        go(pad);
    }
    return pads;
};

/**
 * The keys' crossing played by a finger: the presses that pull her back become a finger held on the
 * rope's line at the same angle, the press that lets her swing becomes lifting it, and a tap in the air
 * a touch for a step.
 */
const swings = (s: SwingsState): Pad[] => {
    const moves = crossing(s.L) ?? [];
    const copy = structuredClone(s),
        pads: Pad[] = [],
        go = stepper(swingsGame, s, pads);
    let at: { x: number; y: number } | null = null;
    for (const k of padsOf(moves)) {
        if (s.won) break;
        swingsGame.step(copy, kept(k));
        const pad = emptyPad();
        const rope = copy.ropes[copy.held];
        if (k.pressed.length && rope) {
            at = {
                x: rope.ax - Math.sin(copy.pulled) * rope.r,
                y: rope.ay + Math.cos(copy.pulled) * rope.r,
            };
            pad.touch = at;
        } else if (k.go && at) {
            pad.lifted = at;
            at = null;
        } else if (k.go) pad.touch = { x: copy.x, y: copy.y };
        else if (at) pad.touch = at;
        go(pad);
    }
    return pads;
};

/** The hose by a finger: held where the stream it sets is the one the driver's keys line up, while they spray. */
const rescue = (s: RescueState): Pad[] => {
    const copy = structuredClone(s),
        drive = driver(),
        pads: Pad[] = [],
        go = stepper(rescueGame, s, pads);
    for (let n = 0; n < 60 * 60 * 3 && !s.won; n++) {
        const k = drive(copy);
        rescueGame.step(copy, kept(k));
        const pad = emptyPad(),
            st = copy.st;
        if (k.go && st.kind === "fire") {
            const reach = (st.power - 4) / 0.95,
                angle = Math.min(FIRE_AIM.hi, Math.max(FIRE_AIM.lo, st.angle));
            pad.touch = {
                x: NOZZLE.x + Math.cos(angle) * reach,
                y: NOZZLE.y + Math.sin(angle) * reach,
            };
        }
        go(pad);
    }
    return pads;
};

/** Pulls from the rabbit to hop, the length of each hop worked out on a copy first, nearest the apple first. */
const hop = (s: rabbit.HopState): Pad[] => {
    const pads: Pad[] = [],
        go = stepper(rabbit.rabbitGame, s, pads),
        L = s.L,
        by = rabbit.keyStepOf(L),
        least = (L.most * rabbit.HOP.minPull.value) / rabbit.HOP.pull.value;
    const unitsAt = (x: number) => L.from + (x - rabbit.xOf(L, L.from)) / rabbit.perOf(L);
    const rest = () => {
        for (let i = 0; i < 60 * 30 && !s.won && s.phase !== "sit"; i++) go(emptyPad());
    };
    const tryHop = (d: number) => {
        const copy = structuredClone(s);
        for (let t = 0; t < 2; t++) rabbit.step(copy, emptyPad());
        rabbit.hopBy(copy, d);
        for (let t = 0; t < 600 && copy.phase === "hop"; t++) rabbit.step(copy, emptyPad());
        return copy;
    };
    const pull = (d: number) => {
        const grab = { x: s.at.x, y: s.at.y - 1.2 },
            to = { x: grab.x - (d / L.most) * rabbit.HOP.pull.value, y: grab.y };
        go({ ...emptyPad(), touch: grab });
        go({ ...emptyPad(), touch: to });
        go({ ...emptyPad(), lifted: to });
        rest();
    };
    for (let tries = 0; tries < 200 && !s.won; tries++) {
        const here = unitsAt(s.at.x),
            to = Math.round((L.target - here) / by) * by;
        if (Math.abs(to) <= L.most && Math.abs(to) >= least && tryHop(to).won) {
            pull(to);
            continue;
        }
        let best: number | null = null,
            gain = 0;
        for (let d = -L.most; d <= L.most + 1e-9; d += by) {
            if (Math.abs(d) < least) continue;
            const copy = tryHop(d),
                got = Math.abs(L.target - here) - Math.abs(L.target - unitsAt(copy.at.x));
            if (copy.phase === "sit" && got > gain + 1e-6) {
                best = d;
                gain = got;
            }
        }
        if (best === null) break;
        pull(best);
    }
    return pads;
};

/** What a card round came to: whether and when it was won, how often the win was told, and any pad the field cannot give. */
export interface Verdict {
    won: boolean;
    wins: number;
    minutes: number;
    notField: string[];
    settles: boolean;
    /** How the round said it ended, once it had settled. */
    end: RoundEnd | null;
}

/** Why a pad is not one a finger or the mouse on the field gives, or null when it is. */
export function notFromField<S>(game: ActionGame<S>, pad: Pad): string | null {
    if (pad.brake) return "the other big button";
    if (pad.holding.length || pad.held) return "a held arrow";
    if (pad.keys) return "the space bar";
    if (game.touch) {
        if (pad.go || pad.tapped) return "the big button, on a game the field plays by touch";
        if (pad.pull || pad.released) return "a pull, on a game the field plays by touch";
        if (pad.pressed.length) return "a swipe, on a game the field plays by touch";
        return null;
    }
    if (pad.touch || pad.lifted) return "a held finger, on a game that does not follow one";
    if ((pad.pull || pad.released) && !game.pullFrom)
        return "a pull, on a game with nothing to pull";
    if ((pad.go || pad.tapped) && (game.pullFrom || !game.controls.go))
        return "the big button, which a tap on this field does not press";
    return null;
}

/** Plays a card round by the field alone and replays its pads on a fresh round, judging it as the card standard does. */
function judge<S>(game: ActionGame<S>, play: (s: S, fresh: () => S) => Pad[]): Verdict {
    const card = game.card;
    if (!card) throw new Error(`${game.id} has no card`);
    const fresh = () =>
        card.round.asks !== undefined && game.round
            ? game.round(card.round.level, card.round.asks)
            : game.start(card.round.level, 1);
    const pads = play(fresh(), fresh),
        s = fresh(),
        notField: string[] = [],
        most = card.minutes * 60 * game.rate * 2;
    let wins = 0,
        was = game.won(s),
        steps = 0;
    const tick = (pad: Pad) => {
        game.step(s, kept(pad));
        steps++;
        const now = game.won(s);
        if (now && !was) wins++;
        was = now;
    };
    for (const pad of pads) {
        if (game.won(s)) break;
        const why = notFromField(game, pad);
        if (why && !notField.includes(why)) notField.push(why);
        tick(pad);
    }
    // a hand that has done its part waits for what it set going to land
    while (!game.won(s) && steps < most) tick(emptyPad());
    const at = steps;
    let settles = !game.still.settling;
    for (let i = 0; i < game.rate * 60 && !settles; i++) {
        tick(emptyPad());
        settles = !game.still.settling?.(s);
    }
    return {
        won: game.won(s),
        wins,
        minutes: at / game.rate / 60,
        notField,
        settles,
        end: endOf(game, s),
    };
}

/** One round of each card game by the field alone, judged, by game id. */
/** A climb by a finger on the field: the route's pilot with its hand on the glass. */
const climb = (): Pad[] => climbThrough(0, 0, "touch") ?? [];

/** Bolt's first planet by a finger on the field: the route's pilot, which needs no button there. */
const boltRound = (): Pad[] => {
    const inputs = rescueThrough(0, 0, "touch") ?? [];
    return inputs.every((i) => typeof i !== "string")
        ? inputs.filter((i) => typeof i !== "string")
        : [];
};

export const FIELD_ROUNDS: Record<string, () => Verdict> = {
    "cargo-workshop": () => judge(cargoGame, cargo),
    jump: () => judge(rabbit.rabbitGame, hop),
    straight: () => judge(rowGame, river),
    snake: () => judge(snakeGame, firefly),
    road: () => judge(roadGame, road),
    plane: () => judge(planeGame, plane),
    pool: () => judge(poolGame, pool),
    curling: () => judge(curlingGame, () => curlWay({ phase: 0, variant: 0 }, "touch") ?? []),
    hoops: () => judge(hoopsGame, () => hoopWay({ phase: 0, variant: 0 }, "touch") ?? []),
    bridge: () => judge(swingsGame, swings),
    blocks: () => judge(fetchGame, fetch),
    rescue: () => judge(rescueGame, rescue),
    clear: () => judge(clearGame, clear),
    climb: () => judge(climbGame, climb),
    kite: () => judge(kiteGame, () => kiteWay({ phase: 0, variant: 0 }, "touch") ?? []),
    feedpup: () => judge(feedGame, () => feedWay({ phase: 0, variant: 0 }, "touch") ?? []),
    aquarium: () => judge(aquariumGame, () => aquaWay({ phase: 0, variant: 0 }, "touch") ?? []),
    bolt: () => judge(boltGame, boltRound),
    boltfly: () => judge(boltflyGame, () => flyWay({ phase: 0, variant: 0 }, "touch") ?? []),
};
