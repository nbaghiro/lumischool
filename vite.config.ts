// The one dev server on 8500 (.docs/local.md). Everything is one origin, as galleo runs it: the apps
// on paths, and `/api/` passed to the API on 8501 unchanged, Origin included, since the API refuses a
// state-changing request from an origin it does not know. Page paths are routed by server/pages.ts,
// which the Node server will read too once it serves the builds, so the two agree on every path.

import { resolve } from "node:path";
import type { Connect } from "vite";
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import { hasKidSession, hasSession, isPage, pageFor } from "./server/pages";
import { brand } from "./tools/brand";
import { firstView } from "./tools/first-view";

const API = "http://127.0.0.1:8501";

const route: Connect.NextHandleFunction = (req, _res, next) => {
    const url = req.url ?? "/";
    const at = url.indexOf("?");
    const path = at < 0 ? url : url.slice(0, at);
    if (isPage({ method: req.method ?? "GET", accept: req.headers.accept ?? "", path })) {
        const cookie = req.headers.cookie ?? "";
        const app = pageFor(path, {
            session: hasSession(cookie, false),
            kids: hasKidSession(cookie, false),
        });
        req.url = `/apps/${app}/index.html${at < 0 ? "" : url.slice(at)}`;
    }
    next();
};

export default defineConfig({
    appType: "mpa",
    plugins: [
        solid(),
        brand(),
        firstView(),
        {
            name: "lumischool-pages",
            configureServer(server) {
                server.middlewares.use(route);
            },
        },
    ],
    server: {
        host: "127.0.0.1",
        port: 8500,
        strictPort: true,
        // no hot reload: other people's saves must not change an open page (.docs/local.md, "The apps")
        hmr: false,
        // the paused streams' working files, which link back into this tree (.docs/leftover/)
        watch: { ignored: [`${resolve(import.meta.dirname, ".scratchpad/leftover")}/**`] },
        // a regex, not "/api": a bare prefix would also take a module whose path starts /api
        proxy: { "^/api/": { target: API, changeOrigin: false } },
    },
    build: {
        rollupOptions: {
            input: {
                home: resolve(import.meta.dirname, "apps/home/index.html"),
                kids: resolve(import.meta.dirname, "apps/kids/index.html"),
                site: resolve(import.meta.dirname, "apps/site/index.html"),
            },
            output: {
                // Small modules many chunks share are kept together, so every dynamic import site
                // names one chunk for them rather than each on its own (the list of chunks to
                // preload is in the importing chunk's bytes, which tools/__tests__/first-view.test.ts
                // measures): the guides' designs and their kit, which engine/ui/guide.ts takes
                // statically and the catalogue one by one, and the ticker and the timeline, which
                // the components that draw a map or a roll take together. A module's own imports
                // are not pulled in after it, so nothing a page loads first changes chunk.
                codeSplitting: {
                    includeDependenciesRecursively: false,
                    groups: [
                        { name: "guides", test: /\/engine\/parts\/guide\// },
                        { name: "ticker", test: /\/engine\/motion\/(?:loop|timeline)\.ts$/ },
                    ],
                },
            },
        },
    },
    optimizeDeps: {
        entries: ["apps/home/index.html", "apps/kids/index.html", "apps/site/index.html"],
    },
});
