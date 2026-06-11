// Ana güncelleme script'i: "npm run veri-guncelle" bunu çalıştırır.
// Elo, fikstür, oran, takım istatistikleri, grup durumu ve maç detaylarını çeker.
// API limitini korumak için her tür bugün güncelse tekrar çekilmez (önbellek kilidi).
import { envOku } from "./yardimci.js";
import { eloCek } from "./elo-cek.js";
import { fiksturCek, oranCek } from "./api-cek.js";
import { takimlarCek } from "./takim-cek.js";
import { standingsCek, macDetayCek } from "./mac-detay-cek.js";
import { havaCek } from "./hava-cek.js";

async function main() {
  console.log("\n=== Dünya Kupası 2026 — Veri Güncelleme ===\n");

  // 1) Elo (anahtar gerektirmez)
  console.log("[1/7] Elo puanları (eloratings.net)…");
  try {
    await eloCek();
  } catch (e) {
    console.log("  ✗ Elo çekilemedi: " + e.message);
    console.log("    (Uygulama gömülü yedek Elo'yu kullanmaya devam eder.)");
  }

  // API-Football (anahtar gerekir)
  const env = envOku();
  const anahtar = env.APISPORTS_KEY;
  if (!anahtar) {
    console.log("\n[2-7] API anahtarı bulunamadı (.env içindeki APISPORTS_KEY boş).");
    console.log("      Sadece Elo güncellendi; diğerleri atlandı.\n");
    return;
  }

  console.log("\n[2/7] Fikstür (API-Football)…");
  try { await fiksturCek(anahtar); } catch (e) { console.log("  ✗ Fikstür: " + e.message); }

  console.log("\n[3/7] Oranlar…");
  try { await oranCek(anahtar); } catch (e) { console.log("  ✗ Oranlar: " + e.message); }

  console.log("\n[4/7] Grup puan durumu…");
  try { await standingsCek(anahtar); } catch (e) { console.log("  ✗ Grup durumu: " + e.message); }

  console.log("\n[5/7] Takım istatistikleri (korner, kart, diziliş)…");
  try { await takimlarCek(anahtar); } catch (e) { console.log("  ✗ Takım istatistikleri: " + e.message); }

  console.log("\n[6/7] Maç detayları (otoriteler tahmini + H2H)…");
  try { await macDetayCek(anahtar); } catch (e) { console.log("  ✗ Maç detayları: " + e.message); }

  // 7) Hava durumu (anahtarsız, Open-Meteo) — fikstürdeki şehir+saat üzerinden
  console.log("\n[7/7] Hava sıcaklığı (Open-Meteo)…");
  try { await havaCek(); } catch (e) { console.log("  ✗ Hava: " + e.message); }

  console.log("\n=== Bitti. cache/ klasörü güncel. ===\n");
}

main().catch((e) => {
  console.error("\nBeklenmeyen hata:", e);
  process.exit(1);
});
