import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { mailPreviews } from "../../server/mail-previews";

const dir = "dist/mail-previews";
mkdirSync(dir, { recursive: true });
const previews = mailPreviews(process.env.APP_ORIGIN ?? "http://localhost:8500");
for (const [i, mail] of previews.entries()) {
    const name = `${String(i + 1).padStart(2, "0")}`;
    writeFileSync(join(dir, `${name}.html`), mail.html ?? "");
    writeFileSync(join(dir, `${name}.txt`), mail.text);
}
writeFileSync(
    join(dir, "index.html"),
    `<!doctype html><html lang="en"><meta name="viewport" content="width=device-width"><title>Email designs</title><body style="font:18px/1.8 Verdana;background:#f4f6f8;padding:32px"><h1>lumischool email designs</h1><p>Fictional examples. No email has been sent.</p><ol>${previews.map((p, i) => `<li><a href="${String(i + 1).padStart(2, "0")}.html">${p.subject}</a></li>`).join("")}</ol></body></html>`,
);
process.stdout.write(`Wrote ${previews.length} fictional designs to ${dir}/index.html\n`);
