// The prover. It is to an activity what engine/notation/verify.ts is to a question: a build gate, not a
// review queue. It walks the position graph of one version, then makes three passes over what it
// found, one for each of the numbered clauses of the promise in .docs/activities.md.
//
// It knows nothing about any mechanic. Everything it needs arrives through the Round façade, which
// is the argument in that document for mechanics being declared rather than each activity being
// bespoke code: a search is only possible because the legal moves are something we can ask for.
import type { Position, Round } from "./games";

export interface Node {
    pos: Position;
    /** Fewest moves from the start to here. */
    depth: number;
    /** The keys this position's moves lead to, in move order. */
    edges: string[];
    /** Fewest moves from here to a win, ignoring the budget. Infinity when there is no win. */
    dist: number;
}

export interface Explored {
    nodes: Map<string, Node>;
    startKey: string;
    /** True when the search hit the position cap, so nothing below is a proof of anything. */
    capped: boolean;
}

/**
 * Breadth first over every position the child can reach, collapsing positions that share a key.
 * There is no depth limit: the budget says how many moves a child may make, not how much of the
 * graph we are allowed to know about, and measuring how far a position is from a win needs the
 * whole graph. It stops at the cap instead, and hitting the cap is a failure rather than an
 * approximation, because an activity whose space we cannot search is one we cannot promise
 * anything about.
 */
export function explore(r: Round, cap = r.bounds.positions): Explored {
    const nodes = new Map<string, Node>();
    const startKey = r.start.key;
    let capped = false;
    let layer: Position[] = [r.start];
    nodes.set(startKey, { pos: r.start, depth: 0, edges: [], dist: Infinity });
    for (let depth = 0; layer.length && !capped; depth++) {
        const next: Position[] = [];
        for (const pos of layer) {
            const node = nodes.get(pos.key);
            if (!node) continue;
            for (const move of pos.moves) {
                const to = move.next();
                node.edges.push(to.key);
                if (nodes.has(to.key)) continue;
                if (nodes.size >= cap) {
                    capped = true;
                    break;
                }
                nodes.set(to.key, { pos: to, depth: depth + 1, edges: [], dist: Infinity });
                next.push(to);
            }
            if (capped) break;
        }
        layer = next;
    }
    distances(nodes);
    return { nodes, startKey, capped };
}

/** Fewest moves to a win, by walking the edges backwards from every won position. */
function distances(nodes: Map<string, Node>): void {
    const back = new Map<string, string[]>();
    for (const [key, node] of nodes) {
        for (const to of node.edges) {
            const list = back.get(to);
            if (list) list.push(key);
            else back.set(to, [key]);
        }
    }
    let layer: string[] = [];
    for (const [key, node] of nodes)
        if (node.pos.won) {
            node.dist = 0;
            layer.push(key);
        }
    for (let d = 1; layer.length; d++) {
        const next: string[] = [];
        for (const key of layer)
            for (const from of back.get(key) ?? []) {
                const node = nodes.get(from);
                if (node && node.dist === Infinity) {
                    node.dist = d;
                    next.push(from);
                }
            }
        layer = next;
    }
}

/**
 * The exact chance that uniformly random legal play reaches a win within n moves, for every n from
 * nought to the budget. A won position is absorbing, so a child who has already won does not play
 * on. Random play is a weak model of a five-year-old poking at a screen, so this is an upper bound
 * on luck rather than a measurement of it.
 *
 * It is one pass over the graph per move remaining, in place of the memoised walk this used to be.
 * The recurrence is the same one and the numbers it gives are the same to the last digit; what
 * changes is the cost, which was the budget squared because every n started its own memo, and is
 * now linear in the budget. That is what lets an activity with a few thousand positions be proved
 * in the page rather than only in a test: a circuit with a car and a velocity has two thousand of
 * them where a balance has fifteen.
 */
function luckProfile(ex: Explored, budget: number): number[] {
    const nodes = [...ex.nodes.entries()];
    const at = new Map(nodes.map(([k], i) => [k, i] as const));
    const won = nodes.map(([, node]) => node.pos.won);
    // An edge to a position the search never reached counts as a move that does not win, so it stays
    // in the denominator as a -1 rather than being dropped. That only happens in a capped search,
    // where the figure is thrown away anyway, and the arithmetic should not quietly differ.
    const edges = nodes.map(([, node]) => node.edges.map((e) => at.get(e) ?? -1));
    const start = at.get(ex.startKey) ?? 0;
    let p: number[] = won.map((w) => (w ? 1 : 0));
    const out = [p[start] ?? 0];
    for (let n = 1; n <= budget; n++) {
        const prev = p;
        p = prev.map((_, i) => {
            if (won[i]) return 1;
            const es = edges[i] ?? [];
            if (!es.length) return 0;
            let sum = 0;
            for (const j of es) if (j >= 0) sum += prev[j] ?? 0;
            return sum / es.length;
        });
        out.push(p[start] ?? 0);
    }
    return out;
}

export interface Proof {
    /** How many positions the search looked at. */
    positions: number;
    capped: boolean;
    /** Moves in the shortest win, or Infinity when there is none. */
    shortest: number;
    /** Won positions the child can reach, which is how many ways there are to win. */
    wins: number;
    /**
     * Positions where the child can still move and can never win. This is the cruel case the
     * dead-end clause is about, and it is not the same as losing: a position with no moves left is
     * the end of the round, which is allowed.
     */
    deadEnds: number;
    /** Positions with no moves and no win: the round is over without one. */
    stuck: number;
    /** Positions where a win is still reachable, but not in the moves the budget leaves. */
    overBudget: number;
    /** Whether a dead end can be backed out of, which is the mechanic's own answer. */
    deadEndsRecoverable: boolean;
    /** The most legal moves in any one position. */
    branch: number;
    /** The chance that uniformly random legal play wins within the budget. */
    luck: number;
    /** The moves within which random play wins half the time. */
    median: number;
    /** That median against the shortest win: how much slower aimless play is than thinking. */
    patience: number;
    ok: boolean;
    problems: string[];
}

export function prove(r: Round, ex: Explored = explore(r)): Proof {
    // A fill the mechanic refuses comes first and is a different kind of failure from the rest: the
    // activity was written wrongly, rather than being a version that happens to play badly.
    const problems: string[] = [...r.accepts()];
    const b = r.bounds;
    const start = ex.nodes.get(ex.startKey);
    const shortest = start ? start.dist : Infinity;
    let wins = 0,
        deadEnds = 0,
        stuck = 0,
        overBudget = 0,
        branch = 0,
        unsaid = 0;
    for (const node of ex.nodes.values()) {
        if (!node.pos.say.trim()) unsaid++;
        if (node.pos.won) {
            wins++;
            continue;
        }
        const open = node.pos.moves.length;
        branch = Math.max(branch, open);
        if (node.dist === Infinity) {
            if (open) deadEnds++;
            else stuck++;
        } else if (node.depth + node.dist > b.budget) overBudget++;
    }
    // A capped search knows nothing, so both figures take their worst value rather than a number
    // somebody might quote.
    const profile = ex.capped ? [] : luckProfile(ex, b.budget);
    const luck = ex.capped ? 1 : (profile[b.budget] ?? 1);
    // The fewest moves within which random play wins half the time, or Infinity when it never does.
    let median = ex.capped ? 1 : Infinity;
    if (!ex.capped)
        for (let n = 1; n <= b.budget; n++)
            if ((profile[n] ?? 0) >= 0.5) {
                median = n;
                break;
            }
    const patience = shortest > 0 && shortest !== Infinity ? median / shortest : Infinity;

    if (ex.capped) {
        problems.push(
            `the search stopped at ${ex.nodes.size} positions, so nothing here is proved; narrow the version or raise positions=`,
        );
    }
    if (r.start.won) problems.push("the starting position is already won");
    if (shortest === Infinity) problems.push("no sequence of legal moves reaches a win");
    else if (shortest > b.budget)
        problems.push(`the shortest win takes ${shortest} moves and the budget is ${b.budget}`);
    else if (shortest < b.solution[0] || shortest > b.solution[1]) {
        problems.push(
            `the shortest win takes ${shortest} moves, outside the declared ${b.solution[0]} to ${b.solution[1]}`,
        );
    }
    // The two ways to meet the dead-end clause. A reversible mechanic meets it by retreat, so a dead
    // end is reported and is not a failure; a mechanic whose moves are spent has to have none.
    if (deadEnds && !r.reversible) {
        problems.push(
            `${deadEnds} positions have no win left, and a move here cannot be taken back`,
        );
    }
    if (overBudget && !r.reversible) {
        problems.push(
            `${overBudget} positions still have a win, but further away than the budget allows`,
        );
    }
    // The third clause of the promise, and it has to be read differently for the two families. Where
    // moves are spent the child has one shot, so what matters is the chance a shot lands: that is
    // luck. Where moves can be taken back, random play in a small space gets there in the end, and
    // demanding otherwise would rule out every toy a five-year-old can safely poke at. What has to
    // hold there is that thinking is visibly faster than poking.
    if (!r.reversible) {
        if (b.luck === undefined)
            problems.push("a mechanic whose moves are spent has to declare luck=");
        else if (!ex.capped && luck > b.luck) {
            problems.push(
                `random play wins ${(luck * 100).toFixed(1)}% of the time, over the declared ${(b.luck * 100).toFixed(1)}%`,
            );
        }
    } else if (b.patience === undefined) {
        problems.push("a mechanic whose moves can be taken back has to declare patience=");
    } else if (!ex.capped && patience < b.patience) {
        problems.push(
            `random play wins in ${median} moves against a shortest win of ${shortest}, only ${patience.toFixed(1)} times as many, under the declared ${b.patience}`,
        );
    }
    if (branch > b.branch)
        problems.push(`one position offers ${branch} moves, over the declared ${b.branch}`);
    if (unsaid)
        problems.push(`${unsaid} positions have no text form, so they cannot be read aloud`);
    problems.push(...r.audit());

    return {
        positions: ex.nodes.size,
        capped: ex.capped,
        shortest,
        wins,
        deadEnds,
        stuck,
        overBudget,
        deadEndsRecoverable: r.reversible,
        branch,
        luck,
        median,
        patience,
        ok: problems.length === 0,
        problems,
    };
}

/**
 * A move that gets closer to a win, by index, or null when there is none. This is what the guide
 * points at after twenty seconds with no move: it points, it does not move. The distances come
 * from the search, so nothing is worked out in front of the child.
 */
export function nudge(ex: Explored, pos: Position): number | null {
    const here = ex.nodes.get(pos.key);
    if (!here || here.dist === Infinity || here.dist === 0) return null;
    for (const [i, move] of pos.moves.entries()) {
        const to = ex.nodes.get(move.next().key);
        if (to && to.dist === here.dist - 1) return i;
    }
    return null;
}

/** How far this position is from a win, in moves. Infinity when there is no win left. */
export function distance(ex: Explored, pos: Position): number {
    return ex.nodes.get(pos.key)?.dist ?? Infinity;
}
