// A driver for the road's tests: plays a whole round through the Pad alone, the way a careful child
// would, lifting early enough to roll into each bay, reversing to a stop behind, and never braking
// hard, and records each step's pad so the round can be replayed.
import { emptyPad, spent, type Dir, type Pad } from "../../../engine/motion/pad";
import { finishOf, liftDistance, noseOf, placeOf, ROAD, step, type RoadState } from "../road";

const laneY = (lane: number) => ROAD.top + ROAD.lane * lane + ROAD.lane / 2;

/** The place the nose should rest: the next stop's middle, or past the finish once all are delivered. */
function goalOf(s: RoadState): number {
    const open = s.L.stops.map((_, k) => k).filter((k) => !s.delivered[k]);
    if (!open.length) return finishOf(s.L) + 3;
    const nose = noseOf(s);
    const k =
        s.L.order === "list"
            ? open[0]
            : open.sort(
                  (a, b) =>
                      Math.abs(placeOf(s.L, s.L.stops[a]?.at ?? 0) - nose) -
                      Math.abs(placeOf(s.L, s.L.stops[b]?.at ?? 0) - nose),
              )[0];
    return placeOf(s.L, s.L.stops[k ?? 0]?.at ?? 0);
}

/** A lane change round a box ahead in the way the car is going, if one is close. */
function dodge(s: RoadState): Dir | null {
    const ahead = s.boxes.find(
        (b) =>
            !b.hit &&
            Math.abs(b.y - laneY(s.lane)) < 1 &&
            (s.v >= 0 ? b.x > s.x && b.x - s.x < 7 : b.x < s.x && s.x - b.x < 7),
    );
    if (!ahead) return null;
    const free = [0, 1, 2].filter(
        (l) =>
            !s.boxes.some(
                (b) => !b.hit && Math.abs(b.y - laneY(l)) < 1 && Math.abs(b.x - ahead.x) < 5,
            ),
    );
    const to = free.sort((a, b) => Math.abs(a - s.lane) - Math.abs(b - s.lane))[0];
    if (to === undefined || to === s.lane) return null;
    return to < s.lane ? "up" : "down";
}

/** One step of careful driving: the pad the driver holds now. */
export function hands(s: RoadState): Pad {
    const pad = emptyPad(),
        nose = noseOf(s),
        goal = goalOf(s),
        near = Math.min(0.3, s.L.bay * s.L.per * 0.5);
    const turn = dodge(s);
    if (turn) pad.pressed.push(turn);
    if (goal > nose + near) pad.go = s.v >= 0 && nose + liftDistance(s.v) < goal - 0.05;
    else if (goal < nose - near) {
        // come to rest, then hold the brake to reverse, and let go early enough to roll back onto it
        if (s.v > 0) return pad;
        pad.brake = nose - (s.v * s.v) / 32 > goal + 0.05;
    }
    return pad;
}

/** Drives a round to its end, or until time runs out, and returns every step's pad. */
export function driveRound(s: RoadState, most = 60 * 60 * 3): Pad[] {
    const pads: Pad[] = [];
    for (let n = 0; n < most && !s.won; n++) {
        const pad = hands(s);
        pads.push({ ...pad, pressed: [...pad.pressed], holding: [...pad.holding] });
        step(s, pad);
        spent(pad);
    }
    return pads;
}
