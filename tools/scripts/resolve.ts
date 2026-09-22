// Lets Node run the root's TypeScript with extensionless relative imports (`from "./client"`), which
// CLAUDE.md asks for and the type checker and the bundler already resolve. Node's own resolver needs
// the file's extension, so this adds `.ts` to a relative specifier that has none in a TypeScript file,
// and leaves everything else to Node, including its type stripping and a package's own requires. Every
// root script and test is run with `node --import ./tools/scripts/resolve.ts`.

import { registerHooks } from "node:module";

const RELATIVE = /^\.{1,2}\//;
const EXTENSION = /\.(?:ts|mts|cts|js|mjs|cjs|json|node)$/;

registerHooks({
    resolve(specifier, context, nextResolve) {
        const fromTs = context.parentURL?.endsWith(".ts") ?? false;
        if (fromTs && RELATIVE.test(specifier) && !EXTENSION.test(specifier))
            return nextResolve(`${specifier}.ts`, context);
        return nextResolve(specifier, context);
    },
});
