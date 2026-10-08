// Render public pages with Solid at build time. Production serves files, not a rendering process.
import { createHash } from "node:crypto";
import { curriculum } from "./pack";
import { Workspace } from "../engine/notation/notation";
import { compileLesson } from "../engine/notation/compile";
import { readLesson } from "../engine/pack";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createServer, type Plugin, type ViteDevServer } from "vite";
import solid from "vite-plugin-solid";
import {
    PUBLIC_PAGES,
    PUBLIC_LESSONS,
    SITE_ORIGIN,
    publicFile,
    publicPage,
    publicRedirect,
    type PublicPage,
} from "../school/public";
import type { Sample } from "../school/worlds/sample";
import type { PackLesson } from "../engine/pack";
import { readSiteData } from "../school/worlds/sample";
import { made } from "./first-view";

const ROOT = resolve(import.meta.dirname, "..");
const escape = (text: string): string =>
    text
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
const json = (value: unknown): string => JSON.stringify(value).replaceAll("<", "\\u003c");

const robots = `User-agent: *\nAllow: /\n\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`;
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${PUBLIC_PAGES.map((p) => `<url><loc>${SITE_ORIGIN}${p.path}</loc></url>`).join("")}</urlset>\n`;

function head(html: string, page: PublicPage): string {
    const title = `${page.title} | Lumischool`;
    const canonical = `${SITE_ORIGIN}${page.path}`;
    const parent = publicPage(page.parent ?? "/");
    const structured: Record<string, unknown>[] =
        page.path === "/"
            ? [
                  {
                      "@context": "https://schema.org",
                      "@type": "WebSite",
                      "@id": `${SITE_ORIGIN}/#website`,
                      name: "Lumischool",
                      alternateName: "lumischool",
                      url: `${SITE_ORIGIN}/`,
                  },
                  {
                      "@context": "https://schema.org",
                      "@type": "Organization",
                      "@id": `${SITE_ORIGIN}/#organization`,
                      name: "Lumischool",
                      url: `${SITE_ORIGIN}/`,
                      logo: `${SITE_ORIGIN}/icon-512.png`,
                      email: "support@lumischool.ai",
                  },
              ]
            : [
                  {
                      "@context": "https://schema.org",
                      "@type": "BreadcrumbList",
                      itemListElement: [
                          {
                              "@type": "ListItem",
                              position: 1,
                              name: "Home",
                              item: `${SITE_ORIGIN}/`,
                          },
                          ...(parent && parent.path !== "/"
                              ? [
                                    {
                                        "@type": "ListItem",
                                        position: 2,
                                        name: parent.title,
                                        item: `${SITE_ORIGIN}${parent.path}`,
                                    },
                                ]
                              : []),
                          {
                              "@type": "ListItem",
                              position: parent && parent.path !== "/" ? 3 : 2,
                              name: page.title,
                              item: canonical,
                          },
                      ],
                  },
              ];
    structured.push({
        "@context": "https://schema.org",
        "@type": "WebPage",
        "@id": `${canonical}#page`,
        name: page.title,
        url: canonical,
        description: page.description,
        inLanguage: "en",
        isPartOf: { "@id": `${SITE_ORIGIN}/#website` },
    });
    return html
        .replace(/<title>[\s\S]*?<\/title>/, `<title>${escape(title)}</title>`)
        .replace(
            /<meta\s+(?:name="description"|property="og:(?:title|description|url)")[^>]*>/g,
            "",
        )
        .replace(
            "</head>",
            `<meta name="description" content="${escape(page.description)}">\n<link rel="canonical" href="${canonical}">\n<meta property="og:url" content="${canonical}">\n<meta property="og:title" content="${escape(title)}">\n<meta property="og:description" content="${escape(page.description)}">\n<meta name="twitter:title" content="${escape(title)}">\n<meta name="twitter:description" content="${escape(page.description)}">\n<script type="application/ld+json">${json(structured)}</script>\n</head>`,
        );
}

type Renderer = {
    prerender: (path: string, sample: Sample, selected?: PackLesson, sampleUrl?: string) => unknown;
};
function isRenderer(value: unknown): value is Renderer {
    return (
        typeof value === "object" &&
        value !== null &&
        "prerender" in value &&
        typeof value.prerender === "function"
    );
}

export function publicPages(): Plugin {
    let selected: Map<string, PackLesson> | undefined;
    const samples = (): Map<string, PackLesson> => {
        if (selected) return selected;
        const ws = new Workspace(curriculum());
        selected = new Map();
        for (const id of Object.values(PUBLIC_LESSONS)) {
            const definition = ws.lessons.get(id);
            if (!definition) throw new Error(`Missing sample lesson ${id}`);
            const compiled = compileLesson(ws, definition, (kind, name, level) =>
                createHash("sha256")
                    .update(ws.textAt(kind, name, level))
                    .digest("hex"),
            );
            const checked = readLesson(compiled);
            if (!checked.ok) throw new Error(`Invalid sample lesson ${id}: ${checked.problem}`);
            selected.set(id, checked.lesson);
        }
        return selected;
    };
    const sampleFiles = new Map<string, string>();
    let out = "";
    let building = false;
    let styles = "/apps/site/written.css";
    let styleRef = "";
    let renderer: ViteDevServer | undefined;
    let loading: Promise<ViteDevServer> | undefined;
    const server = (): Promise<ViteDevServer> =>
        (loading ??= createServer({
            root: ROOT,
            configFile: false,
            cacheDir: "node_modules/.cache/site-prerender",
            plugins: [solid({ ssr: true })],
            optimizeDeps: { noDiscovery: true, include: [] },
            server: { middlewareMode: true, hmr: false, ws: false, watch: null },
            appType: "custom",
        }).then((v) => {
            renderer = v;
            return v;
        }));
    const render = async (template: string, page: PublicPage): Promise<string> => {
        const built = made(() => "/@site-pack");
        const data = readSiteData(JSON.parse(built.data));
        if (!data.ok) throw new Error("Cannot prerender invalid public sample data");
        const module: unknown = await (await server()).ssrLoadModule("/apps/site/prerender.tsx");
        if (!isRenderer(module)) throw new Error("Missing public page renderer");
        const sampleId = PUBLIC_LESSONS[page.path];
        const chosen = sampleId ? samples().get(sampleId) : undefined;
        if (sampleId && !chosen) throw new Error(`Missing public sample ${sampleId}`);
        const body: unknown = module.prerender(
            page.path,
            data.data.words,
            chosen,
            chosen
                ? building
                    ? sampleFiles.get(chosen.id)
                    : `/@public-lesson/${chosen.id}.json`
                : undefined,
        );
        if (typeof body !== "string") throw new Error("Public renderer did not return HTML");
        let html = head(template, page).replace("<!--public-page-->", body);
        if (page.path !== "/") html = html.replace(/<link\b[^>]*data-site-data[^>]*>/g, "");
        // Legal pages need no client runtime. Other written pages retain their enhancement islands.
        if (["/privacy", "/terms", "/support", "/delete-account"].includes(page.path))
            html = html
                .replace(/<script\b[^>]*type="module"[^>]*>[\s\S]*?<\/script>/g, "")
                .replace(
                    /<link\b[^>]*(?:rel="modulepreload"|data-site-data|as="image")[^>]*>/g,
                    "",
                );
        if (!building) {
            const base = [
                "/engine/ui/palette.css",
                "/engine/ui/form.css",
                "/engine/ui/logo.css",
                "/engine/ui/mark.css",
                "/apps/site/site.css",
                "/node_modules/@fontsource/andika/400.css",
                "/node_modules/@fontsource/andika/700.css",
                "/node_modules/@fontsource-variable/shantell-sans/full.css",
                "/node_modules/@fontsource-variable/spline-sans-mono/index.css",
            ];
            html = html.replace(
                "</head>",
                `${base.map((href) => `<link rel="stylesheet" href="${href}?direct">`).join("")} </head>`,
            );
        }
        if (page.path !== "/")
            html = html.replace(
                "</head>",
                `<link rel="stylesheet" href="${styles}">${styleRef ? "" : '<link rel="stylesheet" href="/apps/site/legal.css">'}</head>`,
            );
        return html;
    };
    return {
        name: "lumischool-public-pages",
        enforce: "post",
        configResolved(config) {
            out = resolve(config.root, config.build.outDir);
            building = config.command === "build";
        },
        buildStart() {
            if (!building) return;
            for (const lesson of samples().values()) {
                const source = JSON.stringify(lesson);
                const hash = createHash("sha256").update(source).digest("hex").slice(0, 10);
                const fileName = `assets/public-lesson-${lesson.id}-${hash}.json`;
                this.emitFile({ type: "asset", fileName, source });
                sampleFiles.set(lesson.id, `/${fileName}`);
            }
            styleRef = this.emitFile({
                type: "asset",
                name: "public.css",
                source:
                    readFileSync(join(ROOT, "apps/site/legal.css"), "utf8") +
                    readFileSync(join(ROOT, "apps/site/written.css"), "utf8"),
            });
        },
        async writeBundle(_options, bundle) {
            styles = `/${this.getFileName(styleRef)}`;
            try {
                const template = readFileSync(join(out, "apps/site/index.html"), "utf8");
                for (const page of PUBLIC_PAGES) {
                    let html = await render(template, page);
                    for (const asset of Object.values(bundle)) {
                        if (asset.type !== "asset") continue;
                        for (const name of asset.originalFileNames) {
                            const absolute = resolve(ROOT, name);
                            html = html
                                .replaceAll(`file://${absolute}`, `/${asset.fileName}`)
                                .replaceAll(`/${name}`, `/${asset.fileName}`);
                        }
                    }
                    if (html.includes("file://"))
                        throw new Error(`Unresolved public image in ${page.path}`);
                    const path = join(out, publicFile(page));
                    mkdirSync(dirname(path), { recursive: true });
                    writeFileSync(path, html);
                }
                writeFileSync(join(out, "robots.txt"), robots);
                writeFileSync(join(out, "sitemap.xml"), sitemap);
            } finally {
                await renderer?.close();
            }
        },
        configureServer(dev) {
            dev.httpServer?.once("close", () => {
                void renderer?.close();
            });
            dev.middlewares.use((req, res, next) => {
                const path = req.url?.split("?")[0];
                const retired = path ? publicRedirect(path) : undefined;
                if (retired && (req.method === "GET" || req.method === "HEAD")) {
                    res.statusCode = 308;
                    res.setHeader("Location", retired);
                    res.end();
                    return;
                }
                if (
                    (req.method === "GET" || req.method === "HEAD") &&
                    path?.startsWith("/@public-lesson/")
                ) {
                    const id = path.slice("/@public-lesson/".length).replace(/\.json$/, "");
                    const lesson = samples().get(id);
                    res.statusCode = lesson ? 200 : 404;
                    res.setHeader("Content-Type", "application/json");
                    res.end(
                        req.method === "HEAD"
                            ? undefined
                            : JSON.stringify(lesson ?? { error: "not-found" }),
                    );
                    return;
                }
                if (
                    (req.method === "GET" || req.method === "HEAD") &&
                    (path === "/robots.txt" || path === "/sitemap.xml")
                ) {
                    res.setHeader(
                        "Content-Type",
                        path === "/robots.txt"
                            ? "text/plain; charset=utf-8"
                            : "application/xml; charset=utf-8",
                    );
                    res.end(
                        req.method === "HEAD"
                            ? undefined
                            : path === "/robots.txt"
                              ? robots
                              : sitemap,
                    );
                } else next();
            });
        },
        transformIndexHtml: {
            order: "post",
            async handler(html, context) {
                if (!context.server || !context.filename.endsWith("apps/site/index.html"))
                    return html;
                const path = (context.originalUrl ?? "/").split("?")[0] ?? "/";
                const page = publicPage(path) ?? publicPage("/");
                if (!page) throw new Error("Missing home page");
                renderer?.moduleGraph.invalidateAll();
                return (await render(html, page)).replaceAll(`file://${ROOT}/`, "/");
            },
        },
    };
}
