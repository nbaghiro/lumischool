// Cutting a length into pieces and judging whether they are fair shares. A cake, a bar or a ribbon
// is a length from nought to its whole, and a cut is a place along it. A share is fair when every
// piece is within a stated distance of the share it should be, so how fair is fair enough is a
// number a level chooses rather than a knife that cannot miss.

export interface Piece {
    from: number;
    to: number;
}

/** The pieces a length falls into when it is cut at these places, in order. A cut off the length, or on another cut, cuts nothing. */
export function piecesOf(whole: number, cuts: number[]): Piece[] {
    const at = [...new Set(cuts.filter((c) => c > 0 && c < whole))].sort((a, b) => a - b);
    const edges = [0, ...at, whole];
    return edges.slice(1).map((to, i) => ({ from: edges[i] ?? 0, to }));
}

export const sizeOf = (p: Piece): number => p.to - p.from;

/** How much bigger than `share` each piece is, less than nought for a piece too small. */
export const offBy = (pieces: Piece[], share: number): number[] =>
    pieces.map((p) => sizeOf(p) - share);

/** Whether every piece is within `within` of `share`. */
export const fair = (pieces: Piece[], share: number, within: number): boolean =>
    offBy(pieces, share).every((d) => Math.abs(d) <= within + 1e-9);

/** Where a length is cut to give `n` equal pieces. */
export const fairCuts = (whole: number, n: number): number[] =>
    Array.from({ length: Math.max(0, n - 1) }, (_, i) => (whole * (i + 1)) / n);
