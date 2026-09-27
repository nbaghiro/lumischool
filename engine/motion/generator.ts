// One kit for the variations of a level: a generator that lays a level out from a seed, a validator
// that reads a stored layout back from unknown data, and a solver hook that says whether a layout can
// be done. A layout is kept only when the solver finds a way through it, so a variation a child is
// given has been played to the end by the machine first. See .docs/game-engine.md.

export interface Variation<C> {
    /** How a layout is certified, recorded with each challenge so a later reader knows what was checked. */
    method: string;
    generate(seed: number, phase: number): C;
    /** The layout in stored data, or null when it is not one this phase can play. */
    read(value: unknown, phase: number): C | null;
    /** A way through the layout, or null when there is none. Left out, the generator's own checks stand. */
    solve?(layout: C, phase: number): unknown;
}

/** The i-th seed after `seed`, spread over the whole range so neighbours give unrelated layouts. */
export const derive = (seed: number, i: number): number =>
    (seed + Math.imul(i + 1, 2654435761)) >>> 0;

/**
 * A layout from `seed` that the solver can finish, trying the seeds after it in turn. Throws when none
 * of `tries` seeds gives one, which a generator's tests catch long before a child could.
 */
export function certified<C>(v: Variation<C>, seed: number, phase: number, tries = 16): C {
    for (let i = 0; i < tries; i++) {
        const layout = v.generate(i === 0 ? seed : derive(seed, i - 1), phase);
        if (!v.solve || isWay(v.solve(layout, phase))) return layout;
    }
    throw new Error(`No solvable layout from seed ${seed} in ${tries} tries`);
}

const isWay = (way: unknown): boolean => way !== null && way !== undefined && way !== false;
