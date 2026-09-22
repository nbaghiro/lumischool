// `npm run dev`: the API on 8501, and the one dev server on 8500 that
// serves every app from one origin (.docs/local.md). An API that is already running is left alone, so this can be started
// beside one; the API's own lines, sign-in codes included, print in this terminal.

import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "vite";

const HEALTH = "http://127.0.0.1:8501/api/health";

const running = await fetch(HEALTH)
    .then((r) => r.ok)
    .catch(() => false);

let api: ChildProcess | null = null;
if (!running) {
    api = spawn(process.execPath, ["--import", "./tools/scripts/resolve.ts", "server/http.ts"], {
        stdio: "inherit",
        env: { ...process.env, LUMISCHOOL_ENV: "local" },
    });
    api.on("exit", (code) => {
        if (code) process.stderr.write(`the API stopped with code ${code}\n`);
    });
}

const stop = (): void => {
    api?.kill();
    process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);

// Our imports name no extension (CLAUDE.md), which Vite's config loader warns about for a loader it
// may adopt later; the warning says nothing about this project.
process.env.VITE_CONFIG_NATIVE_IGNORE_WARNING = "true";
try {
    const server = await createServer({ configFile: "vite.config.ts" });
    await server.listen();
} catch (e) {
    // An API this script started would otherwise keep 8501 after the script has gone.
    const why = e instanceof Error ? e.message : String(e);
    process.stderr.write(`the dev server did not start: ${why}\n`);
    api?.kill();
    process.exit(1);
}
process.stdout.write(
    [
        "",
        "  everything        http://localhost:8500",
        "  children's view   http://localhost:8500/kids",
        running
            ? "  the API was already running on 8501"
            : "  the API           http://127.0.0.1:8501",
        "",
    ].join("\n") + "\n",
);
