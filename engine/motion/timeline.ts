// Tracks and cues evaluated at a time, never run on their own. Under reduced motion a timeline is
// collapsed, every track at its end and every cue at once, which loses nothing a child needs: the end
// values are what the position says, and the cues are sound rather than motion.

type Ease = (u: number) => number;

const linear: Ease = (u) => u;
export const easeOut: Ease = (u) => 1 - (1 - u) ** 3;
export const easeInOut: Ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2);
/** Overshoots a little on the way in, for a sticker landing. */
export const easeBack: Ease = (u) => {
    const c = 1.7;
    return 1 + (c + 1) * (u - 1) ** 3 + c * (u - 1) ** 2;
};

interface Track {
    name: string;
    from: number;
    to: number;
    /** Seconds after the timeline starts. */
    at: number;
    /** Seconds. Nought switches at `at`. */
    dur: number;
    ease?: Ease;
}

interface CueAt {
    at: number;
    cue: string;
}

export interface Timeline {
    tracks: Track[];
    cues: CueAt[];
    /** Seconds until the last track ends or the last cue fires. */
    length: number;
}

export function timeline(tracks: Track[], cues: CueAt[] = []): Timeline {
    const length = Math.max(0, ...tracks.map((t) => t.at + t.dur), ...cues.map((c) => c.at));
    return { tracks, cues, length };
}

/** A track is at its start before it begins and at its end after; an unknown name is 0. */
export function valueAt(tl: Timeline, name: string, t: number): number {
    const track = tl.tracks.find((x) => x.name === name);
    if (!track) return 0;
    if (track.dur <= 0) return t >= track.at ? track.to : track.from;
    if (t <= track.at) return track.from;
    if (t >= track.at + track.dur) return track.to;
    const u = (track.ease ?? linear)((t - track.at) / track.dur);
    return track.from + (track.to - track.from) * u;
}

export function valuesAt(tl: Timeline, t: number): Record<string, number> {
    const out: Record<string, number> = {};
    for (const track of tl.tracks) out[track.name] = valueAt(tl, track.name, t);
    return out;
}

/** The cues after `from` and up to and including `to`, in time order, so each fires once. */
export function cuesBetween(tl: Timeline, from: number, to: number): string[] {
    return tl.cues
        .filter((c) => c.at > from && c.at <= to)
        .sort((a, b) => a.at - b.at)
        .map((c) => c.cue);
}

export function collapse(tl: Timeline): Timeline {
    return timeline(
        tl.tracks.map((t) => ({ ...t, at: 0, dur: 0 })),
        tl.cues.map((c) => ({ ...c, at: 0 })),
    );
}

export const done = (tl: Timeline, t: number): boolean => t >= tl.length;
