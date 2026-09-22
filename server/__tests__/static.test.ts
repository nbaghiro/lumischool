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
