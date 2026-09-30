// Decodes the map's tile files off the page's thread (tile-cache.ts), and hands back what the GPU takes
// quickest on each browser, as the drawings' worker does (sprites.worker.ts).

/** Whether pixels go to the page as a bitmap; WebKit takes bytes into a texture far quicker (sprites.worker.ts). */
const BITMAPS = !(
    /AppleWebKit/.test(navigator.userAgent) && !/Chrome|Chromium|Edg/.test(navigator.userAgent)
);

let canvas: OffscreenCanvas | null = null;

self.onmessage = async (e: MessageEvent<unknown>) => {
    const data = e.data;
    if (typeof data !== "object" || data === null || !("id" in data) || !("blob" in data)) return;
    const id = data.id,
        blob = data.blob;
    if (typeof id !== "number" || !(blob instanceof Blob)) return;
    try {
        const bitmap = await createImageBitmap(blob, {
            premultiplyAlpha: "premultiply",
            colorSpaceConversion: "none",
        });
        const { width: w, height: h } = bitmap;
        if (BITMAPS) {
            self.postMessage({ id, w, h, bitmap }, { transfer: [bitmap] });
            return;
        }
        canvas ??= new OffscreenCanvas(1, 1);
        canvas.width = w;
        canvas.height = h;
        // its pixels are read back, which a canvas drawn on the CPU gives without a copy from the GPU
        const c = canvas.getContext("2d", { willReadFrequently: true });
        if (!c) throw new Error("No canvas for a tile");
        c.clearRect(0, 0, w, h);
        c.drawImage(bitmap, 0, 0);
        bitmap.close();
        const pixels = c.getImageData(0, 0, w, h).data.buffer;
        self.postMessage({ id, w, h, pixels }, { transfer: [pixels] });
    } catch {
        self.postMessage({ id, failed: true });
    }
};
