/**
 * Extrai texto de arquivos PDF usando unpdf (server-side, sem worker)
 */

import { extractText } from "unpdf";

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const uint8 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  const result = await extractText(uint8, { mergePages: true });
  const text = result.text?.trim() || "";

  if (text.length < 10) {
    throw new Error("PDF sem texto extraivel (pode ser escaneado/imagem)");
  }

  return text;
}
