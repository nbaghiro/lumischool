import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { COOKIES, hasKidSession, hasSession, isPage, pageFor } from "../pages";

const none = { session: false, kids: false };
const signedIn = { session: true, kids: false };
const kids = { session: false, kids: true };

describe("the pages on the one origin", () => {
    it("sends /kids and everything under it to the children's view, whatever the browser holds", () => {
        for (const path of ["/kids", "/kids/", "/kids/anything"])
            for (const held of [none, signedIn, kids])
                assert.equal(pageFor(path, held), "kids", path);
    });

    it("serves the site at /home to everyone, which is where a signed-in parent's logo goes", () => {
        for (const path of ["/home", "/home/"]) {
            assert.equal(pageFor(path, none), "site", path);
            assert.equal(pageFor(path, signedIn), "site", path);
        }
        assert.equal(pageFor("/home/anything", none), "home", "only /home itself is the site");
        assert.equal(pageFor("/homework", none), "home", "a path that only starts with /home");
    });

    it("serves / as the site to a visitor, the family's page to a session, and the children's view to a browser that holds one", () => {
        assert.equal(pageFor("/", none), "site");
        assert.equal(pageFor("/", signedIn), "home");
        assert.equal(pageFor("/", kids), "kids");
        assert.equal(
            pageFor("/", { session: true, kids: true }),
            "kids",
            "a browser with both holds a session put away for its view, so the view is read first",
        );
    });

    it("sends the grown-ups' screens and every other page to the grown-ups' app, whatever the browser holds", () => {
        for (const path of ["/sign-in", "/start", "/pair", "/outbox", "/kidsroom", "/k", "/x/y"]) {
            assert.equal(pageFor(path, none), "home", path);
            assert.equal(pageFor(path, signedIn), "home", path);
            assert.equal(pageFor(path, kids), "home", `${path}, where a grown-up signs in again`);
        }
    });

    it("answers a page only for a GET that asks for HTML, off the API and with no file extension", () => {
        const page = { method: "GET", accept: "text/html,application/xhtml+xml", path: "/sign-in" };
        assert.equal(isPage(page), true);
        assert.equal(isPage({ ...page, method: "POST" }), false);
        assert.equal(isPage({ ...page, accept: "application/json" }), false);
        assert.equal(isPage({ ...page, path: "/api/me" }), false);
        assert.equal(isPage({ ...page, path: "/apps/home/main.tsx" }), false);
        assert.equal(isPage({ ...page, path: "/favicon.ico" }), false);
    });

    it("sees a session only under the cookie name the API reads in that mode", () => {
        assert.equal(hasSession(`${COOKIES.plain.session}=abc`, false), true);
        assert.equal(hasSession(`theme=paper; ${COOKIES.secure.session}=abc`, true), true);
        assert.equal(
            hasSession(`${COOKIES.plain.session}=planted`, true),
            false,
            "over HTTPS a cookie without the prefix is not the session",
        );
        assert.equal(hasSession(`${COOKIES.secure.session}=abc`, false), false);
        assert.equal(hasSession(`${COOKIES.plain.pending}=abc`, false), false);
        assert.equal(
            hasSession(`${COOKIES.plain.kids}=abc`, false),
            false,
            "a children's view is not",
        );
        assert.equal(hasSession("my_ls_session=abc", false), false);
        assert.equal(hasSession("", true), false);
    });

    it("sees a children's view only under its own cookie name in that mode", () => {
        assert.equal(hasKidSession(`${COOKIES.plain.kids}=a~b`, false), true);
        assert.equal(hasKidSession(`${COOKIES.secure.kids}=a`, true), true);
        assert.equal(hasKidSession(`${COOKIES.plain.kids}=planted`, true), false);
        assert.equal(hasKidSession(`${COOKIES.plain.session}=abc`, false), false);
    });
});
