import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { authBrowserProblem, withBrowserAuthLock } from "../kid-session";

const previousStorage = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
const previousNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
afterEach(() => {
    for (const [key, value] of [
        ["sessionStorage", previousStorage],
        ["navigator", previousNavigator],
    ] as const) {
        if (value) Object.defineProperty(globalThis, key, value);
        else Reflect.deleteProperty(globalThis, key);
    }
});
const navigatorWith = (value: unknown) =>
    Object.defineProperty(globalThis, "navigator", { configurable: true, value });
const storageWith = (value: unknown) =>
    Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value });

test("blocked storage prevents sign-in requests but never blocks revocation", async () => {
    storageWith({
        setItem: () => {
            throw new Error("blocked");
        },
    });
    navigatorWith({});
    let calls = 0;
    const request = async () => {
        calls++;
        return { ok: true as const, status: 204, body: null };
    };
    const rejected = await withBrowserAuthLock(request);
    assert.equal(rejected.ok, false);
    assert.equal(calls, 0);
    assert.equal((await withBrowserAuthLock(request, false)).ok, true);
    assert.equal(calls, 1);
});

test("missing cross-tab locking is explicit, rather than silently racing cookie creation", () => {
    const data = new Map<string, string>();
    storageWith({
        setItem: (k: string, v: string) => data.set(k, v),
        getItem: (k: string) => data.get(k),
        removeItem: (k: string) => data.delete(k),
    });
    navigatorWith({});
    assert.match(authBrowserProblem()?.problem ?? "", /update your browser/);
    navigatorWith({ locks: { request: async (_: string, run: () => Promise<unknown>) => run() } });
    assert.equal(authBrowserProblem(), null);
    assert.equal(data.size, 0);
});
