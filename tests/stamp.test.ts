// npx tsx tests/stamp.test.ts — the signature stamping that runs inside the app.
import { PDFDocument } from 'pdf-lib';
import { dubaiStamp, inkify, pageSizes, pngAspect, stampLpoBox, stampPlacements } from '../src/sign/stamp';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const UPNG = require('upng-js');
let fail = 0;
const ok = (c: boolean, what: string) => { if (!c) { fail++; console.log('FAIL: ' + what); } };
(async () => {
  const d = await PDFDocument.create(); d.addPage([595, 842]); d.addPage([842, 595]);
  const pdf = await d.save();
  const W = 600, H = 200, px = new Uint8Array(W * H * 4).fill(255);           // a photographed signature: dark ink on white
  for (let x = 20; x < 580; x++) { const y = Math.round(100 + 60 * Math.sin(x / 25)); for (let dy = -3; dy <= 3; dy++) { const i = ((y + dy) * W + x) * 4; px[i] = px[i + 1] = px[i + 2] = 10; } }
  const sig = new Uint8Array(UPNG.encode([px.buffer], W, H, 0));
  ok(Math.abs(pngAspect(sig) - H / W) < 1e-9, 'aspect read from the PNG header');
  const ink = UPNG.decode(inkify(sig).buffer); const rgba = new Uint8Array(UPNG.toRGBA8(ink)[0]);
  let paper = 0, blue = 0; for (let i = 0; i < rgba.length; i += 4) { if (rgba[i + 3] === 0) paper++; else if (rgba[i] === 22 && rgba[i + 1] === 36 && rgba[i + 2] === 168) blue++; }
  ok(ink.width === W + 12 && ink.height === H + 12, 'inkify pads 6 px each side, like the website');
  ok(paper > rgba.length / 4 * 0.8, 'white paper becomes transparent');
  ok(blue > 3000, 'ink becomes ballpoint blue (' + blue + ')');
  ok(dubaiStamp(new Date('2026-11-24T20:30:00Z')) === '25/Nov/2026 00:30', 'date line is Dubai time in the site format');
  const lpo = await stampLpoBox(pdf, { level: 2, page: 0, x: 175, y: 120, w: 120, h: 60 }, sig, 'Muhammad Haneef');
  const re = await PDFDocument.load(lpo);
  ok(re.getPageCount() === 2, 'the LPO keeps all its pages');
  ok(lpo.length > pdf.length + 1000, 'the signature image is in the signed LPO');
  const sd = await stampPlacements(pdf, [{ page: 1, x: 100, y: 100, w: 150, h: 50 }], sig, 'Muhammad Haneef', true);
  ok((await PDFDocument.load(sd)).getPageCount() === 2, 'a placed signature keeps all pages');
  const ps = await pageSizes(pdf);
  ok(ps[1].w === 842 && ps[1].h === 595, 'page sizes read for tap placement');
  console.log(fail ? fail + ' failed' : 'stamp: all checks passed'); process.exit(fail ? 1 : 0);
})();
