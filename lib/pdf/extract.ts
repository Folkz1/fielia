/**
 * Extrai texto de arquivos PDF usando pdf-parse
 */

import * as pdfParse from "pdf-parse";
const pdf = (pdfParse as any).default || pdfParse;

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const data = await pdf(buffer);

  if (!data.text || data.text.trim().length < 10) {
    throw new Error("PDF sem texto extraivel (pode ser escaneado/imagem)");
  }

  return data.text;
}
