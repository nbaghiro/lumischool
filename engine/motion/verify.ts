export interface ReplayAction<A> {
    tick: number;
    input: A;
}

/** A successful replay is a witness of reachability, not an exhaustive proof of a physics game. */
export function verifyReplay<S, A>(
    game: {
        start(): S;
        input(state: NoInfer<S>, input: A): void;
        step(state: NoInfer<S>): void;
        won(state: NoInfer<S>): boolean;
    },
    actions: readonly ReplayAction<A>[],
    limit: number,
): { won: boolean; ticks: number; state: S } {
    if (!Number.isInteger(limit) || limit <= 0)
        throw new Error("Replay needs a positive tick limit.");
    let previous = 0;
    for (const action of actions) {
        if (!Number.isInteger(action.tick) || action.tick < previous || action.tick >= limit)
            throw new Error("Replay inputs must be ordered and inside the tick limit.");
        previous = action.tick;
    }
    const state = game.start();
    let cursor = 0;
    for (let tick = 0; tick < limit; tick++) {
        while (actions[cursor]?.tick === tick) {
            const action = actions[cursor];
            if (action) game.input(state, action.input);
            cursor++;
        }
        game.step(state);
        if (game.won(state)) return { won: true, ticks: tick + 1, state };
    }
    return { won: false, ticks: limit, state };
}
