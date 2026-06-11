// Maç şehri + saati için tahmini hava sıcaklığı (°C).
// Kaynak: Open-Meteo (open-meteo.com) — ücretsiz, anahtarsız, public.
// Geocoding (şehir → koordinat) ve forecast uçlarını kullanır.
// API-Football hava durumu vermediği için bu ayrı, ücretsiz kaynak kullanılır.
import { cacheYaz, cacheOku, bugunGuncelMi } from "./yardimci.js";

const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

// Şehir adını enlem/boylama çevirir (Open-Meteo geocoding).
async function sehirKoordinat(sehir) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(sehir)}&count=1&language=en`;
  const y = await fetch(url);
  if (!y.ok) return null;
  const j = await y.json();
  const r = j.results?.[0];
  return r ? { lat: r.latitude, lon: r.longitude } : null;
}

// Belirli koordinat + tarih-saat için saatlik sıcaklığı bulur.
// Open-Meteo geçmiş/gelecek 16 güne kadar tahmin verir.
async function sicaklik(lat, lon, isoTarih) {
  const gun = isoTarih.slice(0, 10);   // YYYY-MM-DD
  const saat = isoTarih.slice(11, 13); // HH
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
              `&hourly=temperature_2m&start_date=${gun}&end_date=${gun}&timezone=auto`;
  const y = await fetch(url);
  if (!y.ok) return null;
  const j = await y.json();
  const saatler = j.hourly?.time || [];
  const dereceler = j.hourly?.temperature_2m || [];
  // Maç saatine en yakın saati bul.
  const hedef = `${gun}T${saat}:00`;
  let idx = saatler.findIndex((t) => t === hedef);
  if (idx === -1) idx = saatler.length ? Math.min(+saat, saatler.length - 1) : -1;
  return idx >= 0 ? dereceler[idx] : null;
}

// Fikstürdeki maçlar için sıcaklık çıkar → cache/hava.json (maç id → °C).
export async function havaCek() {
  if (bugunGuncelMi("hava.json")) {
    console.log("  • Hava bugün zaten güncel — tekrar çekilmedi.");
    return;
  }
  const fik = cacheOku("fikstur.json");
  const maclar = fik?.veri || [];
  if (maclar.length === 0) {
    console.log("  ! Fikstür cache'i yok; hava atlandı.");
    return;
  }

  const koordCache = {};   // şehir → {lat,lon} (tekrar geocoding'i önler)
  const hava = {};         // maç id → °C
  let cekilen = 0;
  for (const mac of maclar) {
    if (!mac.sehir) continue;
    if (!koordCache[mac.sehir]) {
      const k = await sehirKoordinat(mac.sehir);
      koordCache[mac.sehir] = k || null;
      await bekle(200);
    }
    const k = koordCache[mac.sehir];
    if (!k) continue;
    try {
      const c = await sicaklik(k.lat, k.lon, mac.tarih);
      if (c != null) { hava[mac.id] = Math.round(c); cekilen++; }
    } catch { /* tahmin penceresi dışındaysa atla */ }
    await bekle(150);
  }
  cacheYaz("hava.json", hava);
  console.log(`  ✓ Hava: ${cekilen} maç için tahmini sıcaklık → cache/hava.json`);
  return hava;
}
