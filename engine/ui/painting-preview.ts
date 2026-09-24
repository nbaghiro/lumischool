import type { Picture } from "../painting";
import { ideaOf, pictureSvg } from "./painting-ideas";
import { replay } from "./painting-surface";
import { shapeMask } from "./painting-easel";
async function svgOn(ctx: CanvasRenderingContext2D, svg: string, width: number, height: number) {
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    try {
        const img = new Image();
        img.src = url;
        await img.decode();
        ctx.drawImage(img, 0, 0, width, height);
    } finally {
        URL.revokeObjectURL(url);
    }
}
export async function compositePicture(
    p: Picture,
    output: HTMLCanvasElement,
    marks: HTMLCanvasElement,
) {
    const ctx = output.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, output.width, output.height);
    if (p.painting.paper === "squared") {
        ctx.strokeStyle = "#c9deed";
        ctx.lineWidth = 1;
        for (let x = 0; x <= output.width; x += 32) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, output.height);
            ctx.stroke();
        }
        for (let y = 0; y <= output.height; y += 32) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(output.width, y);
            ctx.stroke();
        }
    }
    const options = { w: p.painting.w, h: p.painting.h };
    if (p.activity === "colour")
        await svgOn(
            ctx,
            pictureSvg(ideaOf(p.idea), { ...options, fills: p.fills, fillOnly: true }),
            output.width,
            output.height,
        );
    ctx.drawImage(marks, 0, 0);
    if (p.activity === "colour")
        await svgOn(
            ctx,
            pictureSvg(ideaOf(p.idea), { ...options, outlines: true }),
            output.width,
            output.height,
        );
}

export async function renderPicture(picture: Picture): Promise<HTMLCanvasElement> {
    const p = picture.painting;
    const layer = document.createElement("canvas");
    layer.width = p.w * 32;
    layer.height = p.h * 32;
    const context = layer.getContext("2d");
    if (!context) throw new Error("Painting canvas unavailable");
    replay(p.marks, { w: p.w, h: p.h, scale: 32, shapes: shapeMask }).draw(context);
    const output = document.createElement("canvas");
    output.width = layer.width;
    output.height = layer.height;
    await compositePicture(picture, output, layer);
    return output;
}
export async function pictureThumbnail(picture: Picture): Promise<string> {
    const source = await renderPicture(picture);
    const canvas = document.createElement("canvas");
    for (const size of [240, 180, 120, 80]) {
        const ratio = size / Math.max(source.width, source.height);
        canvas.width = Math.round(source.width * ratio);
        canvas.height = Math.round(source.height * ratio);
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Painting preview unavailable");
        context.drawImage(source, 0, 0, canvas.width, canvas.height);
        const png = canvas.toDataURL("image/png");
        if (png.length <= 64 * 1024) return png;
    }
    throw new Error("Painting preview too large");
}
export async function downloadPicture(picture: Picture): Promise<void> {
    const canvas = await renderPicture(picture);
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `${picture.title}.png`;
    link.click();
}
