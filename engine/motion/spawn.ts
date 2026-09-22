// The seeded generator a game draws its chance from, so a level laid out or jostled from a seed is the
// same level again.

/** mulberry32: small, fast, and the same numbers for the same seed on every machine. */
export function seeded(seed: number): () => number {
    let s = seed | 0;
    return () => {
        s = (s + 0x6d2b79f5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
