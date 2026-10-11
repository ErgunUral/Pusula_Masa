# Pusula

Eski adı "Fintables - Borsa"; sayfalar "Hisse Analiz Masası" ve "BIST Strateji Lab" idi (11 Ekim 2026'da yeniden adlandırıldı). Tarayıcı deposu anahtarları (`hm_*`, `lab_cfg`, IndexedDB `hisse-masa` / `bist-lab`) eski adlarıyla kaldı: değiştirilirse kullanıcının kayıtlı verisi kaybolur.

Borsa İstanbul için iki tek sayfalık claude.ai artifact'i. Veri, sayfayı açan kişinin Fintables bağlayıcısından gelir; sunucu yok.

| Sayfa | Kaynak | Çıktı | Artifact |
|---|---|---|---|
| Pusula Masa | `src/masa/` | `dist/pusula-masa.html` | https://claude.ai/artifact/TnTka4UxK9ApbxrzZThaVF |
| Pusula Lab | `src/lab/` | `dist/pusula-lab.html` | https://claude.ai/artifact/CxbqTgjBUvgJusp9uVJgW2 |

GitHub: `ErgunUral/fintabels` (public). Kullanıcıyla Türkçe konuş.

## Token tasarrufu kuralları

- `dist/` ve `src/masa/data/kalici-model.json` dosyalarını **okuma** (üretilmiş çıktı ve 88 KB'lık tek satır model ağırlığı). Gerekirse `grep -c`, `wc`, `cut -c1-200` kullan.
- Önce aşağıdaki bölüm haritasından dosyayı seç, sonra `grep -n` ile satırı bul, yalnızca o aralığı oku. Satırlar uzundur (800 karaktere kadar); grep çıktısını `cut -c1-200` ile kes.
- Canlı artifact'i `Artifact read` ile okuma: tüm HTML'i bağlama döker. Yayın akışına bak.
- Doğrulama için `npm test` yeter (çıktısı birkaç satır). Tek tek dosya derleyip okumaya gerek yok.

## Komutlar

- `npm test` — derler, 32 testi çalıştırır (sayfaların hatasız yüklenmesi + hesap fonksiyonları). `test/gbdt-altin` ortak gradyan artırmanın eski iki uygulamayla bire bir aynı model ürettiğini sınar; çekirdeğe dokunursan bu test bilerek kırılır.
- `npm run build` — `dist/` altına iki HTML üretir.
- `node build.mjs --diff <dosya>` — bir canlı sürümü derlemeyle karşılaştırır, yalnızca farklı satırları kısaltarak basar.

## Yapı

`build.mjs`, `src/<sayfa>/page.html` içindeki `/*@css*/` ve `/*@js*/` satırlarını `style.css` ve `js/*.js` (ada göre sıralı) ile doldurur. JS içinde tek başına duran `//@include <src'ye göre yol>` satırı o dosyanın içeriğiyle değişir. Her sayfanın JS'i tek bir IIFE'dir: bölümler aynı kapsamı paylaşır, modül sistemi yok.

`src/shared/` (iki sayfaya gömülür): `format.js` (nf, fmt, esc, istDate, trDate, tick, css, niceStep) · `fintables.js` (isQuota, parseTable, sql, inList; sayfanın kendi `call()`'unu kullanır) · `idb.js` (makeIdb) · `md.js` (mdRender) · `gbdt.js` (gbStart, gbBuild, gbWalk: gradyan artırma çekirdeği, eksik değer destekli) · `sermaye.js` (corporateEvents: hangi fiyat sıçraması bölünme/bedelsiz sayılır).

`src/masa/js/`:
- `00-giris` durum nesnesi `S` · `01-formatting` pct (yüzde değeri alır), big, istDateTime · `02-fintables-calls` errCopy, call
- `03-search` arama kutusu · `04-indicators` sma, ema, rsi, macd, boll, atr, stoch, swings · `05-charts` lightweight-charts · `05a-sekmeler` sekme yapısı (showTab, STOCK_TABS/LIST_TABS; sekme adı = section kimliği)
- `06-loaders` load(), teknik/temel/analist/KAP yükleyicileri, buildT, computeSignals, finansal özet (BAL_ROWS, balRows) ve kullanıcının beş mali durum göstergesi (finMetrics) · `07-kap-duygu-analizi` · `07a-sahiplik` fon sahipliği ve açığa satış (loadOwn, ownMonths, shortStats)
- `08-takip-listesi` (`W`, refreshWatch) · `08a-finans-onbellek` paylaşılan son dönem finansalları ve Temel tarama (getLatestFund, renderFT) · `08b-karne` Özet sekmesi (renderOzet: vade, destek/direnç, değerleme, bedelsiz) · `08c-alarmlar` · `08d-akis` Alan/satan sekmesi (loadAkis) · `09-kalici-model` gömülü model (`FZ`) · `10-portfoy` (`P`) · `10a-kalici-kayit` portföy ve takip listesini `db` yeteneğiyle kişiye özel yolda saklar (cloudInit, cloudSave, cloudApply; `onSnapshot` ile başka sekme/cihazdaki değişiklik canlı alınır) · `11-bist-30-tarama` (`SC`)
- `12-ai` Claude yorumu · `13-ml` saf hesap: adjustCorporate, stockFeatures, trainGBDT (erken durdurma döngüsü), lojistik regresyon, runModel, geri test
- `14-model-arayuzu` (`ML`), fetchUniverse, modelAge/modelExpired · `15-boot`

`src/lab/js/`:
- `00-motor` saf geri test motoru (universeAt, rawFactors, fwdRet, runBacktest, metrics) · `01-gbdt` gbTrain (sabit ağaç sayısı), makeMLScorer
- `02-uygulama` pct (oran alır: Masa'dakinden farklı), errCopy, call · `03-veri-indirme` syncData, buildDB
- `04-ayarlar` (`ST`) · `05-geri-test` runTest · `06-grafik` lineChart · `07-sonuclar` renderResults, duyarlılık, yapay zeka · `08-baslat`

## Sorgu ve token bütçesi (Masa)

Fintables günlük kotası ve kullanıcının Claude kullanımı sınırlı kaynaklardır; yeni özellik eklerken şu düzen korunmalı:
- Hisse açılınca yalnızca künye, fiyat geçmişi ve analist hedefleri çekilir; Özet sekmesindeki karne ayrıca 2 sorgu yapar. Diğer bölümler sekmesi ilk açıldığında `ensurePart()` ile gelir; yeni bir bölüm eklersen `PART_LOADERS` ve `TAB_PART`'a yaz, `load()` içinde doğrudan çağırma, `resetParts()`'a boş hâlini ekle.
- Gün içinde değişmeyen sorgular `sql(..., SLOW)` ile 6 saat önbelleklenir.
- Takip listesi göstergeleri hisse başına günde bir kez hesaplanır (`WC`, localStorage `hm_wc`); liste sekmeleri ilk açılışta yüklenir (`tabData`, `SEEN`).
- Yapay zeka yorumu hisse başına günlük saklanır (`hm_ai`); yorum istenince eksik parçalar o an çekilir.

## Yayın akışı

Masa'nın yetenek bildirimi: `mcp` (Fintables: veri_sorgula, dokumanlarda_ara, dokuman_chunk_yukle), `sample`, `db`, `user`. Yayında `capabilities` verilmezse saklı bildirim korunur; verilirse **tam liste** yazılmalı (eksik kalan iptal olur). Lab: `mcp` (veri_sorgula), `sample`.

0. Sayfa başka oturumlarda doğrudan claude.ai üzerinden de değiştiriliyor (8–11 Ekim 2026'da böyle oldu). Yayın reddedilirse: son yayınlanan commit'te derle, `node tools/import.mjs <kök> masa <canlı dosya>` ile farkı `src/`'ye işle, commit et, kendi değişikliklerini üstüne rebase et.
1. `npm test`, sonra `Artifact publish` ile `dist/<dosya>` ve tablodaki `url`.
2. Yayın "daha yeni sürüm var" diye reddedilirse sayfa başka yerde değişmiştir. Reddin verdiği kayıtlı dosyayı **okumadan** `node build.mjs --diff <o dosya>` çalıştır; çıkan farkları `src/`'ye işle, tekrar yayınla.
3. Yayından sonra aşağıdaki sürüm satırını güncelle, commit ve push et.

Son yayın: Masa sürüm 25, Lab sürüm 8 (11 Ekim 2026). Sürüm 18–22 başka oturumda yayınlandı.

## Bilinen borçlar

- Sermaye işlemi: seçim kuralı ortak (`sermaye.js`), ama aday eşiği sayfaya özgü (Masa günlük ±%12; Lab SQL'de 1,25 / 0,78). Lab'deki aylık 4 kat sıçrama filtresi ayrı bir veri hatası korumasıdır.
- Eğitim ve geri test ana iş parçacığında çalışır. Web Worker'a almadan önce artifact ortamının Blob'dan Worker'a izin verdiği canlı sayfada denenmeli.
- `errCopy` ve `call` (yeniden deneme) sayfa başına ayrı; Lab'deki daha dayanıklı.
- Kalıcı modelin eğitim kodu repoda yok.
- Takas (MKK) ve aracı kurum dağılımı bağlayıcıda yok (Fintables'ta ayrı ücretli lisans); `07a-sahiplik` bunun yerine fon raporlarını kullanır. Fon raporlarında `ay` boş ya da bozuk (ör. 36) gelebilir, süzülür.
- Fintables sınırları: sorgu başına 300 satır, günlük kota. TÜFE serisi Ocak 2026'da bitiyor.
