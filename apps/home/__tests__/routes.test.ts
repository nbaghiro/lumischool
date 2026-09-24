import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { lessonIn, mapHref, nextFrom, screenOf, signInFor, whereIn } from "../routes";

const here = { local: true };
const away = { local: false };

describe("the grown-ups' app's screens", () => {
    it("shows the screen each path names, with or without a trailing slash", () => {
        assert.equal(screenOf("/", here), "family");
        assert.equal(screenOf("/sign-in", here), "sign-in");
        assert.equal(screenOf("/sign-in/", here), "sign-in");
        assert.equal(screenOf("/start", here), "start");
        assert.equal(screenOf("/outbox", here), "outbox");
        assert.equal(screenOf("/calendar", here), "calendar");
        assert.equal(screenOf("/plan/", here), "missing");
        assert.equal(screenOf("//", here), "family");
    });

    it("shows Explore, and a lesson in it by its id", () => {
        assert.equal(screenOf("/explore", here), "explore");
        assert.equal(screenOf("/explore/", here), "explore");
        assert.equal(screenOf("/explore/g1-making-ten", here), "lesson");
        assert.equal(screenOf("/explore/g1-making-ten/", here), "lesson");
        assert.equal(screenOf("/explore/g1/more", here), "missing");
        assert.equal(lessonIn("/explore/g1-making-ten"), "g1-making-ten");
        assert.equal(lessonIn("/explore/a%20b"), "a b");
        assert.equal(lessonIn("/explore/%E0%A4"), null);
        assert.equal(lessonIn("/explore"), null);
        assert.equal(
            nextFrom("?next=%2Fexplore%2Fg1-making-ten%3Flevel%3Deasy", here),
            "/explore/g1-making-ten?level=easy",
        );
    });

    it("says a path it has no screen for is missing, the site's and the children's included", () => {
        for (const path of ["/home", "/kids", "/signin", "/pair", "/api/me", ""])
            assert.equal(screenOf(path, here), "missing", path);
    });

    it("has the outbox only on a developer's computer, and no page at its path anywhere else", () => {
        assert.equal(screenOf("/outbox", away), "missing");
        assert.equal(screenOf("/outbox/", away), "missing");
        assert.equal(screenOf("/sign-in", away), "sign-in");
        assert.equal(nextFrom("?next=/outbox", away), "/");
    });

    it("goes on after a sign-in only to a screen of this app, with its query and fragment", () => {
        assert.equal(nextFrom("?next=%2F%3Fadded%3D1%23children", here), "/?added=1#children");
        assert.equal(nextFrom("?next=/outbox", here), "/outbox");
        assert.equal(nextFrom("?next=/", here), "/");
        assert.equal(nextFrom("", here), "/");
    });

    it("never goes on to another site, another app, an unknown path or a sign-in again", () => {
        for (const next of [
            "https://example.com/",
            "//example.com/outbox",
            "/\\example.com",
            "javascript:alert(1)",
            "/kids",
            "/home",
            "/sign-in?next=/outbox",
            "/start",
            "outbox",
        ])
            assert.equal(nextFrom(`?next=${encodeURIComponent(next)}`, here), "/", next);
    });

    it("sends a signed-out grown-up to sign in and back to where they were", () => {
        const url = new URL(signInFor("/outbox#newest"), "http://localhost:8500");
        assert.equal(url.pathname, "/sign-in");
        assert.equal(nextFrom(url.search, here), "/outbox#newest");
        assert.equal(url.searchParams.has("again"), false);
        assert.equal(
            signInFor("/"),
            "/sign-in",
            "the family's page is where a sign-in goes anyway",
        );
        const again = new URL(signInFor("/outbox", { again: true }), "http://localhost:8500");
        assert.equal(again.searchParams.get("again"), "1");
        assert.equal(nextFrom(again.search, here), "/outbox");
    });
});

describe("the map's addresses", () => {
    it("names the country, a world, a lesson in its world, or a lesson alone, whose world the map screen finds", () => {
        assert.equal(screenOf("/map", { local: true }), "map");
        assert.deepEqual(whereIn(""), { world: null, lesson: null });
        assert.deepEqual(whereIn("?world=harbour"), { world: "harbour", lesson: null });
        assert.deepEqual(whereIn("?world=harbour&lesson=g1-l4"), {
            world: "harbour",
            lesson: "g1-l4",
        });
        assert.deepEqual(whereIn("?lesson=g1-l4"), { world: null, lesson: "g1-l4" });
        assert.deepEqual(whereIn("?world=&lesson=g1-l4"), { world: null, lesson: "g1-l4" });
        assert.equal(mapHref(), "/map");
        assert.equal(mapHref({ world: "harbour" }), "/map?world=harbour");
        assert.equal(mapHref({ world: "harbour", lesson: "a b" }), "/map?world=harbour&lesson=a+b");
        assert.equal(mapHref({ lesson: "g1-l4" }), "/map?lesson=g1-l4");
        for (const href of [
            mapHref(),
            mapHref({ world: "harbour" }),
            mapHref({ world: "harbour", lesson: "a b" }),
        ])
            assert.deepEqual(
                whereIn(href.slice(href.indexOf("?"))),
                whereIn(new URL(href, "http://x").search),
            );
    });
});
