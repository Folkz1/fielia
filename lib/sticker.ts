import sharp from "sharp";

const STICKER_SIZE = 512;
const MAX_STICKER_BYTES = 100 * 1024; // 100KB WhatsApp limit

/**
 * Converts an image buffer to a 512x512 WebP sticker suitable for WhatsApp.
 * Transparent background, progressively reduces quality to stay under 100KB.
 */
export async function convertToStickerBuffer(imageBuffer: Buffer): Promise<Buffer> {
  let quality = 80;
  let webpBuffer = await sharp(imageBuffer)
    .resize(STICKER_SIZE, STICKER_SIZE, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .webp({ quality })
    .toBuffer();

  // Progressively reduce quality if over 100KB
  while (webpBuffer.byteLength > MAX_STICKER_BYTES && quality > 10) {
    quality -= 10;
    webpBuffer = await sharp(imageBuffer)
      .resize(STICKER_SIZE, STICKER_SIZE, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .webp({ quality })
      .toBuffer();
  }

  return webpBuffer;
}

/**
 * Converts an image buffer to a base64-encoded WebP sticker string.
 * Ready to send via Evolution API sendSticker.
 */
export async function convertToStickerBase64(imageBuffer: Buffer): Promise<string> {
  const webpBuffer = await convertToStickerBuffer(imageBuffer);
  return webpBuffer.toString("base64");
}
