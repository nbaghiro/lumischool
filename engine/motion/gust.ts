// A gust of wind as a strength over time: it rises, blows, flutters and dies away. The strength is a
// share of the gust's full force, from nought to one, and a function of the time alone, so a replay and
// a test agree without stepping it. A game pushes what the wind catches by this share of its own force.

export interface Gust {
    /** Seconds from the start to full strength, at full strength, and dying away. */
    rise: number;
    hold: number;
    fall: number;
    /** How much it flutters while it blows, as a share of its strength. */
    flutter: number;
}

export const gustLength = (g: Gust): number => g.rise + g.hold + g.fall;

/** The gust's strength `t` seconds after it began, from nought to one. */
export function gustAt(g: Gust, t: number): number {
    if (t <= 0 || t >= gustLength(g)) return 0;
    const ease = (u: number) => u * u * (3 - 2 * u);
    const envelope =
        t < g.rise
            ? ease(t / g.rise)
            : t < g.rise + g.hold
              ? 1
              : ease(1 - (t - g.rise - g.hold) / g.fall);
    const flutter = 1 - g.flutter * (0.5 + 0.5 * Math.sin(t * 9.1) * Math.sin(t * 3.7));
    return Math.max(0, Math.min(1, envelope * flutter));
}
