// Canlı bir sürümdeki değişiklikleri, derleme satır haritası üzerinden src/ parçalarına geri işler.
//   node import.mjs <repo kökü> <masa|lab> <canlı html>
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
const [root, page, live] = process.argv.slice(2);
const FILE = { masa: "hisse-analiz-masasi.html", lab: "bist-strateji-lab.html" }[page];
const files = new Map();                                   // src'ye göre yol -> satırlar
const L = rel => { if (!files.has(rel)) files.set(rel, readFileSync(join(root, "src", rel), "utf8").split("\n")); return files.get(rel); };
const out = [];                                            // çıktı satırı -> [dosya, satır no]
const emit = rel => { const a = L(rel); const n = a[a.length - 1] === "" ? a.length - 1 : a.length; for (let i = 0; i < n; i++) {
  const m = /^\/\/@include (\S+)$/.exec(a[i]); if (m) emit(m[1]); else out.push([rel, i]); } };
const pg = L(`${page}/page.html`), pn = pg[pg.length - 1] === "" ? pg.length - 1 : pg.length;
for (let i = 0; i < pn; i++) {
  if (pg[i] === "/*@css*/") emit(`${page}/style.css`);
  else if (pg[i] === "/*@js*/") readdirSync(join(root, "src", page, "js")).filter(f => f.endsWith(".js")).sort().forEach(f => emit(`${page}/js/${f}`));
  else out.push([`${page}/page.html`, i]);
}
const built = readFileSync(join(root, "dist", FILE), "utf8").split("\n");
out.forEach(([f, i], k) => { if (files.get(f)[i] !== built[k]) throw new Error(`harita tutmuyor: çıktı satırı ${k + 1} (${f}:${i + 1})`); });

const diff = spawnSync("git", ["diff", "--no-index", "-U0", "--no-color", join(root, "dist", FILE), live], { encoding: "utf8", maxBuffer: 1 << 28 }).stdout.split("\n");
const hunks = []; let h = null;
for (const ln of diff) { const m = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(ln);
  if (m) { h = { a: +m[1], b: m[2] === undefined ? 1 : +m[2], add: [] }; hunks.push(h); } else if (h && ln.startsWith("+")) h.add.push(ln.slice(1)); }
const edits = [], skipped = [];
for (const k of hunks) {
  if (k.a === 1 && k.b === 1 && k.add.length === 1 && k.add[0].startsWith("<!doctype")) { skipped.push("1. satır (platform iskeleti)"); continue; }
  const fz = k.add.find(x => x.startsWith("const FZ={"));
  if (fz && k.add.length === 1) { const rel = "masa/data/kalici-model.json"; files.set(rel, [fz.slice("const FZ=".length, -1), ""]); skipped.push("FZ model verisi -> " + rel); continue; }
  if (k.b === 0) { const [f, i] = k.a === 0 ? [out[0][0], -1] : out[k.a - 1]; edits.push({ f, at: i + 1, del: 0, add: k.add, a: k.a }); continue; }
  const span = out.slice(k.a - 1, k.a - 1 + k.b), f = span[0][0];
  if (!span.every(([ff, i], j) => ff === f && i === span[0][1] + j)) throw new Error(`parça birden çok dosyaya yayılıyor: çıktı satırı ${k.a}`);
  edits.push({ f, at: span[0][1], del: k.b, add: k.add, a: k.a });
}
edits.sort((x, y) => y.a - x.a).forEach(e => files.get(e.f).splice(e.at, e.del, ...e.add));
const touched = new Map(); edits.forEach(e => touched.set(e.f, (touched.get(e.f) || 0) + 1));
for (const [rel, arr] of files) writeFileSync(join(root, "src", rel), arr.join("\n"));
console.log([...touched].map(([f, n]) => `${f}: ${n} parça`).join("\n")); console.log("atlanan:", skipped.join("; "));
