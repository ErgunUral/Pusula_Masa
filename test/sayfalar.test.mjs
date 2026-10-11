import test from "node:test";
import { loadPage } from "./helpers.mjs";

// Tanım sırası hatalarını (henüz tanımlanmamış sabite erişim gibi) yakalar; veri çekmez.
for (const f of ["pusula-masa.html", "pusula-lab.html"])
  test(`${f} hatasız yükleniyor`, () => loadPage(f));
