import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { staticFrom } from "../../server/static";

test("production policy allows saved painting thumbnails and composed previews", async ({
    page,
}) => {
    const dist = await mkdtemp(join(tmpdir(), "painting-policy-"));
    try {
        await mkdir(join(dist, "apps", "kids"), { recursive: true });
        await writeFile(
            join(dist, "apps", "kids", "index.html"),
            "<!doctype html><title>Pictures</title>",
        );
        const response = await staticFrom(
            false,
            dist,
        )(new Request("http://localhost:8500/kids", { headers: { accept: "text/html" } }));
        if (!response) throw new Error("Production page unavailable");
        const headers = Object.fromEntries(response.headers);
        const body = await response.text();
        await page.route("**/painting-policy", (route) => route.fulfill({ headers, body }));
        await page.goto("/painting-policy");
        const dimensions = await page.evaluate(async () => {
            const svg = new Blob(
                [
                    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="16"><rect width="24" height="16" fill="blue"/></svg>',
                ],
                { type: "image/svg+xml" },
            );
            const url = URL.createObjectURL(svg);
            try {
                const preview = new Image();
                preview.src = url;
                await preview.decode();
                const canvas = document.createElement("canvas");
                canvas.width = 24;
                canvas.height = 16;
                const ctx = canvas.getContext("2d");
                if (!ctx) throw new Error("Canvas unavailable");
                ctx.drawImage(preview, 0, 0);
                const thumbnail = new Image();
                thumbnail.src = canvas.toDataURL("image/png");
                document.body.append(thumbnail);
                await thumbnail.decode();
                return [thumbnail.naturalWidth, thumbnail.naturalHeight];
            } finally {
                URL.revokeObjectURL(url);
            }
        });
        expect(dimensions).toEqual([24, 16]);
    } finally {
        await rm(dist, { recursive: true, force: true });
    }
});
