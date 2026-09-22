// `npm run check:build`: a production build of the three apps into a directory made for it and removed
// after, so a change that breaks a build fails `npm run check`. The build compiles the curriculum for
// the site's data and visitor pack (tools/first-view.ts), so it needs content/curriculum/ and nothing
// of .scratchpad/.

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build } from "vite";

// Our imports name no extension (CLAUDE.md), which Vite's config loader warns about for a loader it
// may adopt later; the warning says nothing about this project.
process.env.VITE_CONFIG_NATIVE_IGNORE_WARNING = "true";

const out = await mkdtemp(join(tmpdir(), "lumischool-build-"));
try {
    await build({
        configFile: "vite.config.ts",
        // what fails the build fails the check; the sizes are tools/__tests__/first-view.test.ts's
        logLevel: "error",
        build: { outDir: out, emptyOutDir: true },
    });
} finally {
    await rm(out, { recursive: true, force: true });
}
