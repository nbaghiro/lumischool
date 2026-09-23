import { configFrom } from "./http";
import { loadPack } from "./pack";
import { deliverLetters } from "./letters";
import { closeApp } from "./db/client";

const config = configFrom(process.env);
if ("problem" in config) throw new Error(config.problem);
if (process.env.WEEKLY_EMAIL_ENABLED !== "1")
    throw new Error("Set WEEKLY_EMAIL_ENABLED=1 to run weekly delivery.");
const pack = loadPack(process.env.PACK_DIR ?? "dist/pack");
if ("problem" in pack) throw new Error(pack.problem);
try {
    const result = await deliverLetters({
        origin: config.origins[0] ?? "http://localhost:8500",
        secret: config.pepper,
        send: config.send,
        pack,
    });
    process.stdout.write(`${JSON.stringify(result)}\n`);
} finally {
    await closeApp();
}
