// Ortak yardımcılar: .env okuma, cache yazma/okuma, günlük tazeleme kontrolü.
// Saf Node (harici paket yok) — basit ve şeffaf kalsın diye.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const KOK = join(__dirname, "..");          // proje kök klasörü
export const CACHE = join(KOK, "cache");           // önbellek klasörü (ham yedek)
export const PUBLIC = join(KOK, "public", "veri"); // tarayıcının okuduğu kopya

// .env dosyasını okuyup ANAHTAR=değer çiftlerini bir nesneye çevirir.
export function envOku() {
  const yol = join(KOK, ".env");
  if (!existsSync(yol)) return {};
  const metin = readFileSync(yol, "utf8");
  const sonuc = {};
  for (const satir of metin.split("\n")) {
    const temiz = satir.trim();
    if (!temiz || temiz.startsWith("#")) continue;   // boş satır / yorum atla
    const esit = temiz.indexOf("=");
    if (esit === -1) continue;
    const ad = temiz.slice(0, esit).trim();
    const deger = temiz.slice(esit + 1).trim();
    sonuc[ad] = deger;
  }
  return sonuc;
}

// Bir cache dosyasını JSON olarak yazar; içine "ne zaman çekildi" damgası ekler.
// Hem cache/ (ham yedek) hem public/veri/ (tarayıcının okuduğu) klasörüne yazar.
export function cacheYaz(dosyaAdi, veri) {
  if (!existsSync(CACHE)) mkdirSync(CACHE, { recursive: true });
  if (!existsSync(PUBLIC)) mkdirSync(PUBLIC, { recursive: true });
  const paket = { guncellenme: new Date().toISOString(), veri };
  const metin = JSON.stringify(paket, null, 2);
  writeFileSync(join(CACHE, dosyaAdi), metin, "utf8");
  writeFileSync(join(PUBLIC, dosyaAdi), metin, "utf8");
}

// Bir cache dosyasını okur; yoksa null döner.
export function cacheOku(dosyaAdi) {
  const yol = join(CACHE, dosyaAdi);
  if (!existsSync(yol)) return null;
  try {
    return JSON.parse(readFileSync(yol, "utf8"));
  } catch {
    return null;
  }
}

// Cache dosyası bugün (yerel takvim gününde) güncellenmiş mi?
// API limitini korumak için: bugün güncelse tekrar çekme.
export function bugunGuncelMi(dosyaAdi) {
  const p = cacheOku(dosyaAdi);
  if (!p || !p.guncellenme) return false;
  const o = new Date(p.guncellenme);
  const s = new Date();
  return o.getFullYear() === s.getFullYear() &&
         o.getMonth() === s.getMonth() &&
         o.getDate() === s.getDate();
}

// API-Football'a tek istek atar; JSON döndürür. Hata olursa anlaşılır mesaj fırlatır.
export async function apiIstek(yol, anahtar) {
  const url = "https://v3.football.api-sports.io/" + yol;
  const yanit = await fetch(url, { headers: { "x-apisports-key": anahtar } });
  if (!yanit.ok) {
    throw new Error(`API yanıtı başarısız (HTTP ${yanit.status}) — ${yol}`);
  }
  const json = await yanit.json();
  if (json.errors && Object.keys(json.errors).length > 0) {
    throw new Error("API hata döndürdü: " + JSON.stringify(json.errors));
  }
  return json;
}
