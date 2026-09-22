// Full screen's rules that hold without a page: which key asks for what, which way a browser can
// give an element the screen, and the style the viewport's fallback sets.

import assert from "node:assert/strict";
import { test } from "node:test";
import { askOf, FILL, wayFor, type KeyPress } from "../fullscreen";

const press = (key: string, more: Partial<KeyPress> = {}): KeyPress => ({
    key,
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    repeat: false,
    typing: false,
    ...more,
});

test("F toggles full screen in either case, and only a plain press of it does", () => {
    for (const mode of ["off", "element", "viewport"] as const) {
        assert.equal(askOf(press("f"), mode), "toggle");
        assert.equal(askOf(press("F"), mode), "toggle");
    }
    assert.equal(
        askOf(press("f", { metaKey: true }), "off"),
        null,
        "command-F is the browser's find",
    );
    assert.equal(askOf(press("f", { ctrlKey: true }), "off"), null);
    assert.equal(askOf(press("f", { altKey: true }), "off"), null);
    assert.equal(
        askOf(press("f", { repeat: true }), "off"),
        null,
        "a held key does not flicker it",
    );
    assert.equal(
        askOf(press("f", { typing: true }), "off"),
        null,
        "an F typed in a field is a letter",
    );
    assert.equal(askOf(press("g"), "off"), null);
});

test("Escape leaves the viewport's fallback, and is left to the browser under the Fullscreen API", () => {
    assert.equal(askOf(press("Escape"), "viewport"), "leave");
    assert.equal(askOf(press("Escape"), "element"), null, "the browser has already left by then");
    assert.equal(
        askOf(press("Escape"), "off"),
        null,
        "Escape with nothing full belongs to the page",
    );
    assert.equal(askOf(press("Escape", { typing: true }), "viewport"), null);
});

test("an element takes the screen through either spelling of the API, and the viewport stands in for neither", () => {
    const ask = (): Promise<void> => Promise.resolve();
    assert.equal(wayFor({ fullscreenEnabled: true }, { requestFullscreen: ask }), "element");
    assert.equal(
        wayFor({ webkitFullscreenEnabled: true }, { webkitRequestFullscreen: ask }),
        "element",
        "Safari on an iPad before 16.4",
    );
    assert.equal(
        wayFor({ fullscreenEnabled: false }, { requestFullscreen: ask }),
        "viewport",
        "a document that refuses, as one in a frame without allowfullscreen does",
    );
    assert.equal(wayFor({ fullscreenEnabled: true }, {}), "viewport");
    assert.equal(wayFor({}, {}), "viewport", "Safari on an iPhone");
    assert.equal(
        wayFor({ fullscreenEnabled: true }, { requestFullscreen: "yes" }),
        "viewport",
        "only a function asks",
    );
});

test("the viewport's fallback fixes the element over the whole viewport, with a dynamic height after a plain one", () => {
    const style = new Map<string, string>();
    for (const [name, value] of FILL) style.set(name, value);
    assert.equal(style.get("position"), "fixed");
    assert.equal(style.get("inset"), "0");
    assert.equal(
        style.get("height"),
        "100dvh",
        "the last height set is the one that follows Safari's bars",
    );
    const heights = FILL.filter(([name]) => name === "height").map(([, value]) => value);
    assert.deepEqual(
        heights,
        ["100vh", "100dvh"],
        "100vh first, for a browser that does not know dvh",
    );
    assert.ok(Number(style.get("z-index")) > 1e9, "above anything the page stacks");
});
