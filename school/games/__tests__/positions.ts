// Walking a round's position graph, for the suites that hold a hand to the mechanic's own moves.
import { explore } from "../prove";
import type { Position, Round } from "../games";

/** Every position a round can reach, as the prover walks them. */
export const reachable = (r: Round): Position[] => [...explore(r).nodes.values()].map((n) => n.pos);

/** The positions nearest the start, for a round with more of them than a suite can walk. */
export const sampled = (r: Round, most = 2500): Position[] =>
    [...explore(r).nodes.values()]
        .sort((a, b) => a.depth - b.depth)
        .slice(0, most)
        .map((n) => n.pos);
