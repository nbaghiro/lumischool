import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import { staticFrom } from "../static";

describe("the built apps served from the Node process", () => {
    let dist = "";

    before(async () => {
        dist = await mkdtemp(join(tmpdir(), "lumischool-static-"));
        await mkdir(join(dist, "apps", "home"), { recursive: true });
        await mkdir(join(dist, "apps", "kids"), { recursive: true });
        await mkdir(join(dist, "assets"), { recursive: true });
        await writeFile(join(dist, "apps", "home", "index.html"), "<title>home</title>");
        await writeFile(join(dist, "apps", "kids", "index.html"), "<title>kids</title>");
        await writeFile(join(dist, "assets", "app-abc123.js"), "console.log(1)");
        await writeFile(join(dist, "favicon.svg"), "<svg></svg>");
        await mkdir(join(dist, ".well-known"), { recursive: true });
        await writeFile(join(dist, ".well-known", "apple-app-site-association"), "{}");
        await writeFile(join(dist, ".well-known", "assetlinks.json"), "[]");
    });

    after(async () => {
        await rm(dist, { recursive: true, force: true });
    });

    it("answers a page request with its app's index.html, never cached", async () => {
        const serve = staticFrom(false, dist);
        const res = await serve(new Request("http://x/kids", { headers: { accept: "text/html" } }));
        assert.ok(res);
        assert.equal(res.status, 200);
        assert.equal(await res.text(), "<title>kids</title>");
        assert.equal(res.headers.get("cache-control"), "no-store");
        assert.equal(res.headers.get("content-type"), "text/html; charset=utf-8");
        assert.equal(
            res.headers.get("content-security-policy"),
            "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; frame-ancestors 'none'",
        );
        assert.equal(res.headers.get("permissions-policy"), "camera=(), microphone=()");
    });

    it("gives an asset a year's immutable cache", async () => {
        const serve = staticFrom(false, dist);
        const res = await serve(new Request("http://x/assets/app-abc123.js"));
        assert.ok(res);
        assert.equal(res.status, 200);
        assert.equal(await res.text(), "console.log(1)");
        assert.equal(res.headers.get("cache-control"), "public, max-age=31536000, immutable");
    });

    it("gives a brand file a short cache, not the assets' immutable one", async () => {
        const serve = staticFrom(false, dist);
        const res = await serve(new Request("http://x/favicon.svg"));
        assert.ok(res);
        assert.equal(res.headers.get("cache-control"), "public, max-age=3600");
    });

    it("serves the app link files as JSON with a short cache, even to a page request", async () => {
        const serve = staticFrom(false, dist);
        for (const [path, body] of [
            ["/.well-known/apple-app-site-association", "{}"],
            ["/.well-known/assetlinks.json", "[]"],
        ] as const) {
            const res = await serve(
                new Request(`http://x${path}`, { headers: { accept: "text/html" } }),
            );
            assert.ok(res);
            assert.equal(res.status, 200);
            assert.equal(await res.text(), body);
            assert.equal(res.headers.get("content-type"), "application/json");
            assert.equal(res.headers.get("cache-control"), "public, max-age=3600");
        }
    });

    it("never intercepts a path under /api/, even one no route matches", async () => {
        const serve = staticFrom(false, dist);
        const res = await serve(
            new Request("http://x/api/nothing", { headers: { accept: "text/html" } }),
        );
        assert.equal(res, null);
    });

    it("refuses a traversal attempt rather than reading outside dist/", async () => {
        const serve = staticFrom(false, dist);
        const res = await serve(new Request("http://x/assets/../../../../../../etc/passwd"));
        assert.equal(res, null);
    });

    it("answers null for an asset that was never built, so the route table's 404 handles it", async () => {
        const serve = staticFrom(false, dist);
        const res = await serve(new Request("http://x/assets/never-built.js"));
        assert.equal(res, null);
    });
});

describe("public page indexing and family privacy", () => {
    let dist = "";
    before(async () => {
        dist = await mkdtemp(join(tmpdir(), "lumischool-public-"));
        for (const folder of ["apps/site", "apps/home", "apps/kids", "site/privacy"])
            await mkdir(join(dist, folder), { recursive: true });
        for (const [file, body] of Object.entries({
            "apps/site/index.html":
                '<h1 style="--accent:var(--berry)">Public home</h1><script type="application/ld+json">{"name":"Lumischool"}</script>',
            "apps/home/index.html": "<title>Family</title>",
            "apps/kids/index.html": "<title>Children</title>",
            "site/privacy/index.html": "<h1>Privacy</h1>",
            "robots.txt": "User-agent: *\nAllow: /\nSitemap: https://lumischool.ai/sitemap.xml\n",
            "sitemap.xml": "<urlset><url><loc>https://lumischool.ai/</loc></url></urlset>",
        }))
            await writeFile(join(dist, file), body);
    });
    after(async () => {
        await rm(dist, { recursive: true, force: true });
    });

    it("serves public GET and HEAD without an HTML Accept header", async () => {
        const serve = staticFrom(false, dist);
        for (const path of ["/", "/home", "/privacy", "/robots.txt", "/sitemap.xml"]) {
            const get = await serve(new Request(`http://x${path}`));
            const head = await serve(new Request(`http://x${path}`, { method: "HEAD" }));
            assert.equal(get?.status, 200, path);
            assert.equal(head?.status, 200, path);
            assert.equal(head?.headers.get("content-type"), get?.headers.get("content-type"));
            assert.equal(await head?.text(), "");
            assert.ok((await get?.text())?.length);
            assert.equal(get?.headers.get("x-robots-tag"), null);
        }
        assert.match(
            (await serve(new Request("http://x/robots.txt")))?.headers.get("content-type") ?? "",
            /^text\/plain/,
        );
        assert.match(
            (await serve(new Request("http://x/sitemap.xml")))?.headers.get("content-type") ?? "",
            /^application\/xml/,
        );
    });

    it("preserves cookie-selected roots and the signed-in public entrance", async () => {
        const serve = staticFrom(false, dist);
        for (const [cookie, title] of [
            ["ls_session=held", "Family"],
            ["ls_kids=held", "Children"],
        ]) {
            const res = await serve(
                new Request("http://x/", { headers: { cookie: cookie ?? "" } }),
            );
            assert.match((await res?.text()) ?? "", new RegExp(title ?? ""));
            assert.equal(res?.headers.get("x-robots-tag"), "noindex, nofollow");
            assert.equal(res?.headers.get("cache-control"), "no-store");
            assert.equal(res?.headers.get("vary"), "Cookie");
            const home = await serve(
                new Request("http://x/home", { headers: { cookie: cookie ?? "" } }),
            );
            assert.equal(home?.status, 200);
            assert.match((await home?.text()) ?? "", /Public home/);
        }
    });

    it("redirects public slash variants and the Render hostname without intercepting APIs", async () => {
        const serve = staticFrom(false, dist);
        const slash = await serve(new Request("http://x/privacy/?from=footer"));
        assert.equal(slash?.status, 308);
        assert.equal(slash?.headers.get("location"), "/privacy?from=footer");
        const origin = await serve(new Request("https://lumischool.onrender.com/privacy"));
        assert.equal(origin?.status, 308);
        assert.equal(origin?.headers.get("location"), "https://lumischool.ai/privacy");
        assert.equal(await serve(new Request("https://lumischool.onrender.com/api/health")), null);
    });

    it("redirects retired catalogues to homepage subjects", async () => {
        const serve = staticFrom(false, dist);
        for (const path of [
            "/curriculum",
            "/curriculum/kindergarten",
            "/curriculum/grade-1",
            "/homeschool-math",
        ]) {
            const response = await serve(new Request(`http://x${path}`));
            assert.equal(response?.status, 308);
            assert.equal(response?.headers.get("location"), "/home#subjects");
        }
    });

    it("returns 404 for missing pages and noindex for real family screens", async () => {
        const serve = staticFrom(false, dist);
        for (const [path, status] of [
            ["/does-not-exist", 404],
            ["/privacy/missing", 404],
            ["/sign-in", 200],
            ["/kids/sign-in", 200],
            ["/games", 200],
        ] as const) {
            const res = await serve(
                new Request(`http://x${path}`, { headers: { accept: "text/html" } }),
            );
            assert.equal(res?.status, status, path);
            assert.equal(res?.headers.get("x-robots-tag"), "noindex, nofollow");
        }
    });

    it("allows only the generated structured data script through the public CSP", async () => {
        const res = await staticFrom(false, dist)(new Request("http://x/"));
        assert.match(
            res?.headers.get("content-security-policy") ?? "",
            /script-src 'self' 'sha256-[A-Za-z0-9+/=]+'/,
        );
        assert.doesNotMatch(res?.headers.get("content-security-policy") ?? "", /unsafe-inline/);
        assert.match(
            res?.headers.get("content-security-policy") ?? "",
            /style-src-attr 'unsafe-hashes' 'sha256-/,
        );
    });
});
