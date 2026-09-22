// A mechanic is a kind of play: a position, a move, and the few functions the prover and the
// runtime both need. An activity is data that configures one mechanic, the way a question is data
// that configures a part. Nothing in this folder draws anything and nothing touches the DOM: a
// position turns into a list of art ids with their parameters, and the page renders those through
// the normal renderer, so the whole model runs in a plain node test.

/** One drawing on the board: a visual from the shelf, and the parameters to draw it with. */
export interface BoardPart {
    /** The visual's id in the catalogue, for example "balance" or "numberline". */
    art: string;
    params: Record<string, unknown>;
    /** Shown under the drawing where it needs naming. */
    label?: string;
    /**
     * Marks laid on top of the drawing at its own anchors, the way a teacher's pen sits on a page.
     * The anchor name is the drawing's, so "tick(13)" on a number line is the 13 it drew.
     */
    marks?: { mark: "star" | "tick" | "loop"; at: string }[];
    /**
     * A name for this drawing that outlives one position. Two positions that both name a part with
     * the same key are showing the same thing in two places, so the page moves the drawing it
     * already has instead of drawing a new one where it lands: that is what makes a carriage slide
     * into a siding rather than appear in it. No key means redraw, which is what every part did
     * before this field existed.
     */
    key?: string;
    /**
     * Where the part sits on the board, in squares from the board's top left corner. Parts with a
     * position share one sheet of squared paper, in the order they are listed, so a track can be one
     * part and the train on it another. Parts without one sit side by side as they always have.
     */
    at?: { x: number; y: number };
}

export interface Board {
    parts: BoardPart[];
    /**
     * The sheet the positioned parts sit on, in squares. Left out, it is the smallest sheet that
     * holds them, which is wrong only when a part is meant to be able to move into empty space.
     */
    size?: { w: number; h: number };
}

/**
 * One move as something to tap. A move with a drawing shows it; a move that is a number or a rule
 * is written, because a number reads better as a number than as a picture of one. The group is a
 * heading several chips sit under, so a position offering twelve moves reads as two choices rather
 * than as twelve.
 */
export interface Chip {
    art?: string;
    params?: Record<string, unknown>;
    text?: string;
    note?: string;
    group: string;
    /**
     * Where the move sits on a control pad, as [row, column] from the top left. A mechanic whose
     * moves are a direction rather than a list gives every one of them a spot, and the tray is laid
     * out as a pad instead of as rows of chips, so faster is above slower and left is left of right.
     * The arrow keys then move about the pad rather than along a list, which is the same two taps
     * and the same buttons: nothing here needs a drag or a gesture.
     */
    spot?: [number, number];
}

/**
 * The bounds an activity declares and the prover checks. These are the numbers behind the promise
 * in .docs/activities.md: winnable, no dead ends, not won by accident, bounded.
 */
export interface Bounds {
    /** Moves in the shortest win, as [least, most]. */
    solution: [number, number];
    /** The most moves a child may make before the activity offers a way back. */
    budget: number;
    /**
     * The highest tolerated chance that uniformly random legal play reaches a win. A mechanic whose
     * moves are spent declares this one, because one shot is all there is.
     */
    luck?: number;
    /**
     * The least number of times slower aimless play has to be than thinking: random play must take
     * at least this multiple of the shortest win to get there half the time. A mechanic whose moves
     * can be taken back declares this one instead, because in a small space random play arrives in
     * the end and what matters is that it arrives late.
     */
    patience?: number;
    /** The most legal moves allowed in any one position, because forty choices is not a choice. */
    branch: number;
    /** The most positions the prover may look at. Beyond this we promise nothing, so we refuse. */
    positions: number;
}

/**
 * What an activity may fill one slot of a mechanic with. The list is the palette and the boundary
 * at the same time: a generated activity composes drawings that already exist and cannot name one
 * that does not, so a generated game still looks like the product.
 */
export interface Slot {
    doc: string;
    /** The part ids a piece may name, taken from the catalogue. */
    from: string[];
    /** How many pieces the slot takes, as [least, most]. */
    count: [number, number];
}

/** One of a mechanic's own settings, in the form a generator and a studio form both read. */
export interface Setting {
    doc: string;
    kind: "pick" | "number" | "numbers" | "rules";
    /** For a pick. */
    values?: string[];
    /** For a number or a list of numbers. */
    range?: [number, number];
}

/**
 * What a mechanic says it can take. This is the contract an author, a studio form and a model all
 * work against, and it is the reason an activity can be written rather than coded: everything a
 * mechanic needs is named here, with the range it may take, so a fill can be checked before any
 * position is built.
 */
export interface Contract {
    /** The drawings the mechanic puts on the board, so a palette can show what it will look like. */
    draws: string[];
    slots: Record<string, Slot>;
    settings: Record<string, Setting>;
}

/**
 * One kind of play. The type parameters are the version (what the notation configures), the
 * position and the move. Every function must be pure, and `apply` must return a new position
 * rather than changing the one it was given, because that is what makes undo free.
 */
export interface Mechanic<V, S, M> {
    id: string;
    title: string;
    /** Whether every move can be taken back. This decides how the dead-end clause is met. */
    reversible: boolean;
    contract: Contract;
    /**
     * What is wrong with this fill, beyond what the contract can say. The contract catches a piece
     * the slot does not accept and a number out of range; this catches the rest, for example a
     * balance whose heavy side cannot be matched by anything in the tray. Nothing may reach the
     * prover until this is empty, because a search over a nonsensical fill proves nothing.
     */
    accepts(v: V): string[];
    /** One sentence saying what winning means. It is the only text on the board. */
    goal(v: V): string;
    bounds(v: V): Bounds;
    start(v: V): S;
    moves(s: S, v: V): M[];
    apply(s: S, m: M, v: V): S;
    won(s: S, v: V): boolean;
    /**
     * Two positions with the same key have the same future, so the prover can treat them as one.
     * It is not the same as looking identical: a number line draws the jumps already taken, and
     * those change the picture without changing what can happen next.
     */
    key(s: S): string;
    /** The position in words, for reading aloud and for a screen reader. */
    say(s: S, v: V): string;
    /** One move in words, for the same reason and for the move log. */
    sayMove(m: M, v: V): string;
    board(s: S, v: V): Board;
    /** How a move reads as something to tap. */
    chip(m: M, v: V): Chip;
    /**
     * Checks the position graph cannot see, reported by the prover alongside its own. A mechanic
     * with hidden information needs this: the graph can tell that a win is one move away and cannot
     * tell whether the child had any way of knowing which move it was.
     */
    audit?(v: V): string[];
}

/** What an authored activity file would produce. One activity, with its versions listed. */
export interface Activity<V> {
    id: string;
    title: string;
    /** The mechanic's id. */
    kind: string;
    skills: string[];
    grades: [number, number];
    /**
     * The item or lesson a family prints instead of this activity. Activities do not print, and
     * "none" is not allowed: see the paper section of .docs/activities.md.
     */
    paper: string;
    /** What `let` and `where` would generate. Each entry is one version. */
    versions: { values: string; v: V }[];
}

// The façade below is what the page and the prover work on, rather than on a Mechanic directly, so
// neither of them carries the mechanic's type parameters around. `bind` at the end of the file is
// the only place that knows the three types belong together.

export interface Move {
    say: string;
    chip: Chip;
    /** The position this move leads to. Same move, same position, every time. */
    next(): Position;
}

export interface Position {
    key: string;
    won: boolean;
    say: string;
    board: Board;
    moves: Move[];
}

export interface Round {
    /** The activity's id. */
    id: string;
    title: string;
    /** The mechanic's id. */
    kind: string;
    /** Which version of the activity this is, and what its parameters were. */
    version: number;
    values: string;
    goal: string;
    paper: string;
    bounds: Bounds;
    reversible: boolean;
    contract: Contract;
    start: Position;
    /** What the mechanic refuses about this fill. Checked before the search, not after. */
    accepts(): string[];
    /** The mechanic's own checks over the version, if it has any. */
    audit(): string[];
}

export function bind<V, S, M>(m: Mechanic<V, S, M>, a: Activity<V>, version: number): Round {
    const chosen = a.versions[version];
    if (!chosen) throw new Error(`${a.id} has no version ${version}`);
    const v = chosen.v;
    // Positions are not cached by key. Two positions can share a key and still draw differently,
    // because a key says what can happen next and a drawing also shows what already happened, so
    // the page needs the position it is actually in and the prover does its own keying.
    const at = (s: S): Position => {
        const won = m.won(s, v);
        let moves: Move[] | null = null;
        return {
            key: m.key(s),
            won,
            say: m.say(s, v),
            board: m.board(s, v),
            // Worked out only when something asks, so a first render does not walk the position graph.
            get moves(): Move[] {
                moves ??= won
                    ? []
                    : m.moves(s, v).map((mv) => ({
                          say: m.sayMove(mv, v),
                          chip: m.chip(mv, v),
                          next: () => at(m.apply(s, mv, v)),
                      }));
                return moves;
            },
        };
    };
    return {
        id: a.id,
        title: a.title,
        kind: m.id,
        version,
        values: chosen.values,
        goal: m.goal(v),
        paper: a.paper,
        bounds: m.bounds(v),
        reversible: m.reversible,
        contract: m.contract,
        start: at(m.start(v)),
        accepts: () => m.accepts(v),
        audit: () => m.audit?.(v) ?? [],
    };
}
