/**
 * An exact rational. `dp` is a display hint and not part of the value: set when the number was
 * written as a decimal, it is the least number of places to show, so 1.40 stays "1.40" and a sum of
 * prices stays in pence. Without it a rational shows as a whole number or a fraction.
 */
export interface Rat {
    n: number;
    d: number;
    dp?: number;
}

export class ArithmeticError extends Error {}

export function gcd(a: number, b: number): number {
    let x = Math.abs(a);
    let y = Math.abs(b);
    while (y) [x, y] = [y, x % y];
    return x;
}

export function rat(n: number, d = 1, dp?: number): Rat {
    if (d === 0) throw new ArithmeticError("division by zero");
    if (!Number.isSafeInteger(n) || !Number.isSafeInteger(d))
        throw new ArithmeticError("number too large for exact arithmetic");
    const g = gcd(n, d) || 1;
    const s = d < 0 ? -1 : 1;
    // `+ 0` turns -0 into 0.
    const r: Rat = { n: (s * n) / g + 0, d: (s * d) / g };
    return dp === undefined ? r : { ...r, dp };
}

const hint = (a: Rat, b: Rat): number | undefined =>
    a.dp === undefined && b.dp === undefined ? undefined : Math.max(a.dp ?? 0, b.dp ?? 0);

export const withPlaces = (a: Rat, dp?: number): Rat =>
    dp === undefined ? { n: a.n, d: a.d } : { n: a.n, d: a.d, dp };

/** "1.40" keeps both its places and "3.0" its one; "12" has no hint and shows as a whole number. */
export function parseDecimal(s: string): Rat {
    const [whole = "", frac = ""] = s.split(".");
    return rat(Number(whole + frac), 10 ** frac.length, s.includes(".") ? frac.length : undefined);
}

/**
 * `a.n * b.d ± b.n * a.d` over `a.d * b.d`. A product past 2^53 is rounded in floating point, so the
 * cross products are worked in BigInt whenever one of them, or their sum, is not a safe integer.
 */
function sum(a: Rat, b: Rat, sign: 1 | -1): Rat {
    const p = a.n * b.d;
    const q = sign * b.n * a.d;
    const d = a.d * b.d;
    if (Number.isSafeInteger(p) && Number.isSafeInteger(q) && Number.isSafeInteger(d)) {
        const n = p + q;
        if (Number.isSafeInteger(n)) return rat(n, d, hint(a, b));
    }
    const n = BigInt(a.n) * BigInt(b.d) + BigInt(sign) * BigInt(b.n) * BigInt(a.d);
    const big = BigInt(a.d) * BigInt(b.d);
    let g = n < 0n ? -n : n;
    let r = big;
    while (r !== 0n) [g, r] = [r, g % r];
    // `rat` refuses a reduced part that is still past 2^53, which Number() would have rounded.
    return rat(Number(n / g), Number(big / g), hint(a, b));
}

export const add = (a: Rat, b: Rat): Rat => sum(a, b, 1);
export const sub = (a: Rat, b: Rat): Rat => sum(a, b, -1);
export const mul = (a: Rat, b: Rat) => rat(a.n * b.n, a.d * b.d, hint(a, b));
export const div = (a: Rat, b: Rat) => rat(a.n * b.d, a.d * b.n, hint(a, b));

export function cmp(a: Rat, b: Rat): -1 | 0 | 1 {
    const p = a.n * b.d;
    const q = b.n * a.d;
    if (Number.isSafeInteger(p) && Number.isSafeInteger(q)) return p < q ? -1 : p > q ? 1 : 0;
    const diff = BigInt(a.n) * BigInt(b.d) - BigInt(b.n) * BigInt(a.d);
    return diff < 0n ? -1 : diff > 0n ? 1 : 0;
}
export const eq = (a: Rat, b: Rat) => a.n === b.n && a.d === b.d;
export const isWhole = (a: Rat) => a.d === 1;
export const floor = (a: Rat) => rat(Math.floor(a.n / a.d));
export const ceil = (a: Rat) => rat(Math.ceil(a.n / a.d));
export const neg = (a: Rat) => rat(-a.n, a.d, a.dp);

export function pow(a: Rat, e: Rat): Rat {
    if (!isWhole(e)) throw new ArithmeticError("powers must be whole numbers");
    if (Math.abs(e.n) > 64) throw new ArithmeticError("power too large");
    let r = rat(1);
    for (let i = 0; i < Math.abs(e.n); i++) r = mul(r, a);
    return e.n < 0 ? div(rat(1), r) : r;
}

/** How many decimal places write this denominator exactly, or null when it never terminates. */
function placesFor(d: number): number | null {
    let two = 0;
    let five = 0;
    let x = d;
    while (x % 2 === 0) {
        x /= 2;
        two++;
    }
    while (x % 5 === 0) {
        x /= 5;
        five++;
    }
    return x === 1 ? Math.max(two, five) : null;
}

/** "6", "-3", "7/20", and with a display hint "1.40" or "3.75". */
export function showRat(a: Rat): string {
    const plain = a.d === 1 ? String(a.n) : `${a.n}/${a.d}`;
    if (a.dp === undefined) return plain;
    const needed = placesFor(a.d);
    // A number that never terminates in base 10 is shown as the fraction it is, not rounded.
    if (needed === null) return plain;
    const places = Math.max(a.dp, needed);
    const scaled = Math.abs(a.n) * (10 ** places / a.d);
    if (!Number.isSafeInteger(scaled)) return plain;
    const digits = String(scaled).padStart(places + 1, "0");
    const body = places ? `${digits.slice(0, -places)}.${digits.slice(-places)}` : digits;
    return a.n < 0 ? `-${body}` : body;
}
