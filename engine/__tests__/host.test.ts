import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
    HOST_VERSION,
    startOf,
    toApp,
    toPage,
    write,
    type Handlers,
    type ToApp,
    type ToPage,
} from "../host";

type Seen = { kind: string; body: unknown }[];

function pageHandlers(seen: Seen): Handlers<ToPage> {
    const note =
        (kind: string) =>
        (body: unknown): void => {
            seen.push({ kind, body });
        };
    return {
        go: note("go"),
        back: note("back"),
        insets: note("insets"),
        appState: note("appState"),
        reducedMotion: note("reducedMotion"),
        enter: note("enter"),
        printed: note("printed"),
    };
}

function appHandlers(seen: Seen): Handlers<ToApp> {
    const note =
        (kind: string) =>
        (body: unknown): void => {
            seen.push({ kind, body });
        };
    return {
        ready: note("ready"),
        route: note("route"),
        open: note("open"),
        childMode: note("childMode"),
        parentMode: note("parentMode"),
        child: note("child"),
        out: note("out"),
        finished: note("finished"),
        told: note("told"),
        speak: note("speak"),
        hush: note("hush"),
        print: note("print"),
        share: note("share"),
        playing: note("playing"),
        unsent: note("unsent"),
        failed: note("failed"),
    };
}

describe("host messages", () => {
    it("carries a written message to its handler with its body", () => {
        const seen: Seen = [];
        const text = write<ToPage, "go">("go", { path: "/map", replace: false });
        assert.equal(toPage(text, pageHandlers(seen)), null);
        assert.deepEqual(seen, [{ kind: "go", body: { path: "/map", replace: false } }]);
    });

    it("reads every kind the app sends", () => {
        const seen: Seen = [];
        const on = appHandlers(seen);
        const texts = [
            write<ToApp, "ready">("ready", { app: "kids" }),
            write<ToApp, "told">("told", { feel: "right" }),
            write<ToApp, "playing">("playing", { portrait: null }),
            write<ToApp, "share">("share", { name: "boat", png: "data:image/png;base64,AAAA" }),
        ];
        for (const text of texts) assert.equal(toApp(text, on), null);
        assert.deepEqual(
            seen.map((s) => s.kind),
            ["ready", "told", "playing", "share"],
        );
    });

    it("refuses another version, an unknown kind and a bad body", () => {
        const on = pageHandlers([]);
        assert.match(
            toPage(JSON.stringify({ v: HOST_VERSION + 1, kind: "back" }), on) ?? "",
            /version/,
        );
        assert.match(
            toPage(JSON.stringify({ v: HOST_VERSION, kind: "eval" }), on) ?? "",
            /not a kind/,
        );
        assert.match(
            toPage(JSON.stringify({ v: HOST_VERSION, kind: "toString" }), on) ?? "",
            /not a kind/,
        );
        assert.match(toPage("{", on) ?? "", /JSON/);
        assert.match(
            toPage(
                JSON.stringify({
                    v: HOST_VERSION,
                    kind: "go",
                    path: "//evil.example",
                    replace: false,
                }),
                on,
            ) ?? "",
            /path/,
        );
    });

    it("refuses a share that is not a png data url", () => {
        const on = appHandlers([]);
        const text = JSON.stringify({
            v: HOST_VERSION,
            kind: "share",
            name: "x",
            png: "https://x",
        });
        assert.match(toApp(text, on) ?? "", /png/);
    });

    it("never calls a handler for a refused message", () => {
        const seen: Seen = [];
        toApp(JSON.stringify({ v: HOST_VERSION, kind: "told", feel: "loud" }), appHandlers(seen));
        assert.deepEqual(seen, []);
    });
});

describe("the app's start", () => {
    it("reads an app alone, a world to enter and a place", () => {
        assert.deepEqual(startOf({ app: "home" }), {
            app: "home",
            enter: null,
            place: null,
            kid: null,
        });
        assert.deepEqual(startOf({ app: "kids", enter: { world: "meadow", box: null } }), {
            app: "kids",
            enter: { world: "meadow", box: null },
            place: null,
            kid: null,
        });
        assert.deepEqual(startOf({ app: "kids", place: "games" }), {
            app: "kids",
            enter: null,
            place: "games",
            kid: null,
        });
        assert.deepEqual(startOf({ app: "kids", place: "map", kid: "k1" }), {
            app: "kids",
            enter: null,
            place: "map",
            kid: "k1",
        });
    });

    it("refuses what is not a start", () => {
        assert.equal(typeof startOf(undefined), "string");
        assert.equal(typeof startOf({ app: "site" }), "string");
        assert.equal(typeof startOf({ app: "kids", enter: { world: 3 } }), "string");
        assert.equal(typeof startOf({ app: "kids", place: "pool" }), "string");
        assert.equal(typeof startOf({ app: "kids", kid: 7 }), "string");
    });
});
