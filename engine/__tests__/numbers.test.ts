import assert from "node:assert/strict";
import { test } from "node:test";
import {
    ArithmeticError,
    add,
    ceil,
    cmp,
    div,
    eq,
    floor,
    gcd,
    isWhole,
    mul,
    neg,
    parseDecimal,
    pow,
    rat,
    showRat,
    sub,
    withPlaces,
} from "../numbers";

const d = parseDecimal;

test("a rational is kept in lowest terms with its sign on top, and zero is never -0", () => {
    assert.deepEqual(rat(6, -8), { n: -3, d: 4 });
    assert.deepEqual(rat(-6, -8), { n: 3, d: 4 });
    assert.deepEqual(rat(0, -5), { n: 0, d: 1 });
    assert.deepEqual(neg(rat(0)), { n: 0, d: 1 });
    assert.equal(gcd(-12, 18), 6);
    assert.equal(gcd(7, 0), 7);
});

test("arithmetic is exact", () => {
    assert.ok(eq(add(rat(1, 3), rat(1, 6)), rat(1, 2)));
    assert.ok(eq(add(d("0.1"), d("0.2")), d("0.3")));
    assert.ok(eq(sub(rat(1, 2), rat(1, 3)), rat(1, 6)));
    assert.ok(eq(mul(rat(2, 3), rat(3, 4)), rat(1, 2)));
    assert.ok(eq(div(rat(1, 2), rat(1, 4)), rat(2)));
    assert.ok(eq(pow(rat(2), rat(-2)), rat(1, 4)));
    assert.ok(eq(pow(rat(2, 3), rat(0)), rat(1)));
    assert.equal(cmp(rat(1, 3), rat(1, 2)), -1);
    assert.equal(cmp(d("0.50"), rat(1, 2)), 0);
    assert.ok(isWhole(rat(6, 3)));
    assert.ok(!isWhole(rat(7, 2)));
    assert.ok(eq(floor(rat(-7, 2)), rat(-4)));
    assert.ok(eq(ceil(rat(-7, 2)), rat(-3)));
});

test("the display hint is not part of the value", () => {
    assert.ok(eq(d("1.40"), d("1.4")));
    assert.ok(eq(d("3.0"), rat(3)));
    assert.equal(d("12").dp, undefined);
    assert.equal(d("3.0").dp, 1);
});

test("a decimal keeps its places through a calculation, and the wider hint wins", () => {
    assert.equal(showRat(mul(d("0.35"), rat(100))), "35.00");
    assert.equal(showRat(withPlaces(mul(d("0.35"), rat(100)))), "35");
    assert.equal(showRat(add(d("2.35"), d("1.40"))), "3.75");
    assert.equal(showRat(mul(d("1.50"), rat(2))), "3.00");
    assert.equal(showRat(add(d("1.5"), rat(1))), "2.5");
    assert.equal(showRat(add(d("1.5"), d("0.25"))), "1.75");
    assert.equal(showRat(neg(d("1.40"))), "-1.40");
    assert.equal(showRat(withPlaces(rat(7), 2)), "7.00");
    assert.equal(add(rat(1), rat(2)).dp, undefined);
});

test("a rational shows as a whole number, a fraction or a decimal", () => {
    assert.equal(showRat(rat(6)), "6");
    assert.equal(showRat(rat(-3)), "-3");
    assert.equal(showRat(rat(7, 20)), "7/20");
    assert.equal(showRat(rat(-7, 20, 1)), "-0.35", "places grow until the value is exact");
    assert.equal(showRat(d("12")), "12");
    assert.equal(showRat(d("3.0")), "3.0");
    assert.equal(
        showRat(div(d("1.0"), rat(3))),
        "1/3",
        "a decimal that never ends stays a fraction",
    );
    assert.equal(showRat(rat(1, 2 ** 40, 0)), "1/1099511627776", "too many places to hold exactly");
});

test("what exact arithmetic cannot do is an error rather than a wrong answer", () => {
    const refuses = (f: () => unknown, message: string) =>
        assert.throws(f, (e: unknown) => e instanceof ArithmeticError && e.message === message);
    refuses(() => div(rat(1), rat(0)), "division by zero");
    refuses(() => rat(1, 0), "division by zero");
    refuses(() => mul(rat(2 ** 30), rat(2 ** 30)), "number too large for exact arithmetic");
    refuses(() => d("0.12345678901234567"), "number too large for exact arithmetic");
    refuses(() => pow(rat(2), rat(1, 2)), "powers must be whole numbers");
    refuses(() => pow(rat(1), rat(65)), "power too large");
    refuses(() => add(rat(2 ** 53 - 1), rat(1)), "number too large for exact arithmetic");
});

test("a sum or a comparison whose cross products pass 2^53 is still exact", () => {
    assert.equal(cmp(rat(2 ** 27 + 1, 2 ** 27), rat(2 ** 27, 2 ** 27 - 1)), -1);
    assert.deepEqual(add(rat(3002399751580331), rat(-9007199254740991, 3)), { n: 2, d: 3 });
    assert.deepEqual(sub(rat(2 ** 53 - 1, 2), rat(-1, 2)), { n: 2 ** 52, d: 1 });
});

test("add, sub and cmp agree with BigInt arithmetic across 2^53", () => {
    let seed = 20260914;
    const next = (): number => {
        seed = (seed * 48271) % 2147483647;
        return seed / 2147483647;
    };
    // Mostly 24 to 31 bits, so most pairs have a cross product past 2^53, and some small ones.
    const bits = (): number =>
        next() < 0.2 ? 1 + Math.floor(next() * 23) : 24 + Math.floor(next() * 8);
    const part = (): number => Math.floor(next() * 2 ** bits()) + 1;
    const abs = (x: bigint): bigint => (x < 0n ? -x : x);
    const SAFE = BigInt(Number.MAX_SAFE_INTEGER);
    const reduced = (n: bigint, d: bigint): { n: number; d: number } | null => {
        let g = abs(n);
        let r = d;
        while (r !== 0n) [g, r] = [r, g % r];
        const [rn, rd] = [n / g, d / g];
        return abs(rn) <= SAFE && rd <= SAFE ? { n: Number(rn), d: Number(rd) } : null;
    };
    let crossed = 0;
    for (let i = 0; i < 20_000; i++) {
        const a = rat(part() * (next() < 0.5 ? -1 : 1), part());
        const b = rat(part() * (next() < 0.5 ? -1 : 1), part());
        const [an, ad, bn, bd] = [BigInt(a.n), BigInt(a.d), BigInt(b.n), BigInt(b.d)] as const;
        if (abs(an * bd) > SAFE || abs(bn * ad) > SAFE) crossed++;
        const pair = `${a.n}/${a.d} and ${b.n}/${b.d}`;
        const diff = an * bd - bn * ad;
        assert.equal(cmp(a, b), diff < 0n ? -1 : diff > 0n ? 1 : 0, pair);
        for (const [f, n] of [
            [add, an * bd + bn * ad],
            [sub, diff],
        ] as const) {
            const want = reduced(n, ad * bd);
            if (want) assert.deepEqual(f(a, b), want, pair);
            else assert.throws(() => f(a, b), ArithmeticError, pair);
        }
    }
    assert.ok(crossed > 5000, `only ${crossed} pairs had a cross product past 2^53`);
});
