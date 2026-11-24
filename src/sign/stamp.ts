// Putting a saved signature onto a PDF, inside the app (no web page).
// Ported line for line from the website so a signature looks the same whichever
// way it was signed:
//   - LPO boxes: `inkify` + `stamp` in khadamatos.com/lpo/index.html (19 Nov 2026 sizing:
//     about the box width, slanted 18°, ballpoint blue, name · date line inside the box).
//   - Tasks › Signatures: `applySign` in khadamatos.com/signatures/index.html (signature
//     where the signer tapped, optional "Signed by … · date" line under it).
// No React Native imports here, so the same file is tested in Node.
import { degrees, PDFDocument, rgb, StandardFonts } from 'pdf-lib';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const UPNG: { decode(b: ArrayBuffer): any; toRGBA8(img: any): ArrayBuffer[]; encode(bufs: ArrayBuffer[], w: number, h: number, cnum: number): ArrayBuffer } = require('upng-js');

export type Box = { level: number; page: number; x: number; y: number; w: number; h: number };
export type Placement = { page: number; x: number; y: number; w: number; h: number }; // PDF points, y from the bottom

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** 24/Nov/2026 18:42 in Dubai time (UTC+4, no daylight saving) — the site's format. */
export function dubaiStamp(d: Date = new Date()): string {
  const x = new Date(d.getTime() + 4 * 3600e3);
  const p = (n: number) => String(n).padStart(2, '0');
  return p(x.getUTCDate()) + '/' + MON[x.getUTCMonth()] + '/' + x.getUTCFullYear() + ' ' + p(x.getUTCHours()) + ':' + p(x.getUTCMinutes());
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
export function b64ToBytes(b64: string): Uint8Array {
  const s = b64.replace(/^data:[^,]*,/, '').replace(/[^A-Za-z0-9+/]/g, '');
  const out = new Uint8Array(Math.floor((s.length * 3) / 4));
  let o = 0, buf = 0, bits = 0;
  for (let i = 0; i < s.length; i++) {
    buf = (buf << 6) | B64.indexOf(s[i]); bits += 6;
    if (bits >= 8) { bits -= 8; out[o++] = (buf >> bits) & 255; }
  }
  return out.subarray(0, o);
}
function ab(u: Uint8Array): ArrayBuffer { return u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength) as ArrayBuffer; }

/** Decode a PNG to RGBA, scaled down to at most maxW wide (box filter), like drawing it on a canvas. */
function pngToRgba(png: Uint8Array, maxW = 1200): { w: number; h: number; px: Uint8ClampedArray } {
  const img = UPNG.decode(ab(png));
  const src = new Uint8ClampedArray(UPNG.toRGBA8(img)[0]);
  const W0 = img.width as number, H0 = img.height as number;
  const k = Math.min(1, maxW / W0);
  if (k === 1) return { w: W0, h: H0, px: src };
  const W = Math.max(1, Math.round(W0 * k)), H = Math.max(1, Math.round(H0 * k));
  const px = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const x0 = Math.floor(x / k), x1 = Math.min(W0, Math.floor((x + 1) / k)), y0 = Math.floor(y / k), y1 = Math.min(H0, Math.floor((y + 1) / k));
    let r = 0, g = 0, b = 0, a = 0, n = 0;
    for (let yy = y0; yy < Math.max(y1, y0 + 1); yy++) for (let xx = x0; xx < Math.max(x1, x0 + 1); xx++) {
      const i = (yy * W0 + xx) * 4; r += src[i]; g += src[i + 1]; b += src[i + 2]; a += src[i + 3]; n++;
    }
    const o = (y * W + x) * 4; px[o] = r / n; px[o + 1] = g / n; px[o + 2] = b / n; px[o + 3] = a / n;
  }
  return { w: W, h: H, px };
}

/**
 * Turn any saved signature (drawn, photographed, black or blue) into solid ballpoint-blue
 * ink on a transparent background, strokes slightly thickened. Same maths as the site.
 */
export function inkify(png: Uint8Array): Uint8Array {
  const { w: W, h: H, px: srcPx } = pngToRgba(png);
  const pad = 6, Wc = W + pad * 2, Hc = H + pad * 2, n = Wc * Hc;
  const a = new Uint8ClampedArray(n * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const s = (y * W + x) * 4, d = ((y + pad) * Wc + (x + pad)) * 4;
    a[d] = srcPx[s]; a[d + 1] = srcPx[s + 1]; a[d + 2] = srcPx[s + 2]; a[d + 3] = srcPx[s + 3];
  }
  const A = new Uint8ClampedArray(n);
  for (let i = 0; i < n; i++) {     // ink = opacity × darkness (works for transparent PNGs and white-paper scans)
    const r = a[i * 4], g = a[i * 4 + 1], b = a[i * 4 + 2], al = a[i * 4 + 3] / 255;
    const dark = 1 - (0.3 * r + 0.59 * g + 0.11 * b) / 255, blu = Math.max(0, (b - (r + g) / 2) / 255);
    A[i] = Math.round(255 * al * Math.min(1, Math.max(dark * 1.15, blu * 2.2, al > 0.6 && dark > 0.25 ? 1 : 0)));
  }
  const R = Math.max(1, Math.round(Math.max(W, H) / 420)), B = new Uint8ClampedArray(n);
  for (let y = 0; y < Hc; y++) for (let x = 0; x < Wc; x++) {   // thicken strokes (round brush of radius R)
    let m = 0;
    for (let dy = -R; dy <= R; dy++) {
      const yy = y + dy; if (yy < 0 || yy >= Hc) continue;
      for (let dx = -R; dx <= R; dx++) {
        if (dx * dx + dy * dy > R * R + R) continue;
        const xx = x + dx; if (xx < 0 || xx >= Wc) continue;
        const v = A[yy * Wc + xx]; if (v > m) m = v;
      }
    }
    B[y * Wc + x] = m;
  }
  for (let i = 0; i < n; i++) {     // solid ink, soft anti-aliased edge
    let t = B[i] / 255; t = t < 0.12 ? 0 : Math.min(1, t * 1.9);
    a[i * 4] = 22; a[i * 4 + 1] = 36; a[i * 4 + 2] = 168; a[i * 4 + 3] = Math.round(t * 255);
  }
  return new Uint8Array(UPNG.encode([ab(new Uint8Array(a.buffer))], Wc, Hc, 0));
}

/** LPO: the signer's saved signature into their box. Returns the new PDF. */
export async function stampLpoBox(pdfBytes: Uint8Array, box: Box, signaturePng: Uint8Array, name: string, when: Date = new Date()): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(pdfBytes);
  const page = pdf.getPage(Math.min(box.page, pdf.getPageCount() - 1));
  const png = await pdf.embedPng(inkify(signaturePng));
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  // Helvetica (WinAnsi) cannot draw Arabic etc. — keep plain Latin letters only
  const txt = (String(name || '').replace(/[^\x20-\x7E]/g, '').replace(/\s+/g, ' ').trim() || 'Signed') + ' · ' + dubaiStamp(when);
  let ts = 5.2;
  while (ts > 4 && font.widthOfTextAtSize(txt, ts) > box.w - 2) ts -= 0.2;
  const tw = font.widthOfTextAtSize(txt, ts);
  page.drawText(txt, { x: box.x + (box.w - tw) / 2, y: box.y + 1.2, size: ts, font, color: rgb(0.12, 0.25, 0.45) });
  // Signature sized like a real pen signature on the paper LPO (Ameen, 19 Nov 2026).
  const ANG = 18, rad = (ANG * Math.PI) / 180;
  let w = box.w * 1.0, h = (w * png.height) / png.width;
  if (h > 48) { h = 48; w = (h * png.width) / png.height; }
  if (w < box.w * 0.75) { w = box.w * 0.75; h = Math.min(56, (w * png.height) / png.width); w = (h * png.width) / png.height; }
  const cx = box.x + box.w / 2, cy = box.y + box.h * 0.8;
  const ox = (w / 2) * Math.cos(rad) - (h / 2) * Math.sin(rad), oy = (w / 2) * Math.sin(rad) + (h / 2) * Math.cos(rad);
  page.drawImage(png, { x: cx - ox, y: cy - oy, width: w, height: h, rotate: degrees(ANG) });
  return await pdf.save();
}

/** Tasks › Signatures: the signature wherever the signer placed it, plus an optional date line. */
export async function stampPlacements(pdfBytes: Uint8Array, placements: Placement[], signaturePng: Uint8Array, signer: string, addDate: boolean, when: Date = new Date()): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(pdfBytes);
  const png = await pdf.embedPng(signaturePng);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const line = ('Signed by ' + String(signer || '').replace(/[^\x20-\x7E]/g, '').trim() + ' · ' + dubaiStamp(when)).trim();
  for (const pl of placements) {
    const page = pdf.getPage(Math.min(Math.max(0, pl.page), pdf.getPageCount() - 1));
    page.drawImage(png, { x: pl.x, y: pl.y, width: pl.w, height: pl.h });
    if (addDate) page.drawText(line, { x: pl.x + 2, y: pl.y - 9, size: 7, font, color: rgb(0.4, 0.4, 0.4) });
  }
  return await pdf.save();
}

/** Page sizes in PDF points, for mapping a tap on the screen to a place on the page. */
export async function pageSizes(pdfBytes: Uint8Array): Promise<Array<{ w: number; h: number }>> {
  const pdf = await PDFDocument.load(pdfBytes);
  return pdf.getPages().map((p) => ({ w: p.getWidth(), h: p.getHeight() }));
}
/** Width / height of a PNG, without decoding the pixels. */
export function pngAspect(png: Uint8Array): number {
  const w = (png[16] << 24) | (png[17] << 16) | (png[18] << 8) | png[19];
  const h = (png[20] << 24) | (png[21] << 16) | (png[22] << 8) | png[23];
  return w > 0 && h > 0 ? h / w : 0.35;
}
