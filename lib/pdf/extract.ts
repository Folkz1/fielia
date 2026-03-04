/**
 * Extrai texto de arquivos PDF usando pdf-parse v4
 * Polyfill DOMMatrix/Path2D para server-side (pdfjs-dist precisa)
 */

// Polyfills para Node.js (pdfjs-dist precisa de APIs do browser)
if (typeof globalThis.DOMMatrix === "undefined") {
  (globalThis as any).DOMMatrix = class DOMMatrix {
    m11 = 1; m12 = 0; m21 = 0; m22 = 1; m41 = 0; m42 = 0;
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
    constructor(init?: number[]) {
      if (Array.isArray(init) && init.length === 6) {
        [this.a, this.b, this.c, this.d, this.e, this.f] = init;
        this.m11 = this.a; this.m12 = this.b;
        this.m21 = this.c; this.m22 = this.d;
        this.m41 = this.e; this.m42 = this.f;
      }
    }
    inverse() { return new (globalThis as any).DOMMatrix(); }
    multiply() { return new (globalThis as any).DOMMatrix(); }
    translate() { return new (globalThis as any).DOMMatrix(); }
    scale() { return new (globalThis as any).DOMMatrix(); }
    transformPoint(p: any) { return p || { x: 0, y: 0, z: 0, w: 1 }; }
  };
}

if (typeof globalThis.Path2D === "undefined") {
  (globalThis as any).Path2D = class Path2D {
    moveTo() {} lineTo() {} bezierCurveTo() {} rect() {} closePath() {}
  };
}

import { PDFParse } from "pdf-parse";

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  // pdf-parse v4 requer Uint8Array
  const uint8 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  const parser = new PDFParse(uint8) as any;
  await parser.load();

  const result = await parser.getText();
  const text = result?.text || "";

  if (text.trim().length < 10) {
    throw new Error("PDF sem texto extraivel (pode ser escaneado/imagem)");
  }

  return text;
}
