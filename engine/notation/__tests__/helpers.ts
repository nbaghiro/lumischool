import { readdirSync, readFileSync } from "node:fs";

/** Every content file, keyed as the workspace names them ("items/balance-chain.lumi"). */
export function content(): Record<string, string> {
    const root = new URL("../../../content/curriculum/", import.meta.url);
    const out: Record<string, string> = {};
    for (const dir of readdirSync(root))
        for (const f of readdirSync(new URL(`${dir}/`, root))) {
            if (f.endsWith(".lumi"))
                out[`${dir}/${f}`] = readFileSync(new URL(`${dir}/${f}`, root), "utf8");
        }
    return out;
}
