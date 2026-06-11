// Maç bazlı detaylar: head-to-head (ikili geçmiş), otoriteler tahmini (predictions),
// ve grup puan durumu (standings).
import { apiIstek, cacheYaz, bugunGuncelMi, cacheOku } from "./yardimci.js";

const LIG = 1, SEZON = 2026;
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

// Grup puan durumu → cache/standings.json
export async function standingsCek(anahtar) {
  if (bugunGuncelMi("standings.json")) {
    console.log("  • Grup durumu bugün zaten güncel — API'ye gidilmedi.");
    return;
  }
  const j = await apiIstek(`standings?league=${LIG}&season=${SEZON}`, anahtar);
  // Yapı: response[0].league.standings = [[grup A satırları], [grup B], ...]
  const gruplar = j.response?.[0]?.league?.standings || [];
  const sade = gruplar.map((grup) =>
    grup.map((s) => ({
      sira: s.rank,
      takim: s.team.name,
      oynanan: s.all.played,
      puan: s.points,
      averaj: s.goalsDiff,
      grup: s.group,
    }))
  );
  cacheYaz("standings.json", sade);
  console.log(`  ✓ Grup durumu → cache/standings.json (${sade.length} grup, 1 istek)`);
  return sade;
}

// Fikstürdeki maçlar için H2H + otoriteler tahmini → cache/mac-detay.json
// macListesi: cache/fikstur.json'daki sade maç dizisi (id, evSahibi, deplasman taşır).
export async function macDetayCek(anahtar) {
  if (bugunGuncelMi("mac-detay.json")) {
    console.log("  • Maç detayları bugün zaten güncel — API'ye gidilmedi.");
    return;
  }
  const fik = cacheOku("fikstur.json");
  const maclar = fik?.veri || [];
  if (maclar.length === 0) {
    console.log("  ! Fikstür cache'i yok; önce fikstür çekilmeli. Maç detayları atlandı.");
    return;
  }
  console.log(`  → ${maclar.length} maç için H2H + otoriteler tahmini çekiliyor…`);

  // Takım ID'leri lazım (H2H id-id ister). teams ucundan ad→id haritası.
  const tj = await apiIstek(`teams?league=${LIG}&season=${SEZON}`, anahtar);
  const adId = {};
  for (const t of tj.response || []) adId[t.team.name] = t.team.id;

  const detay = {}; // maç id → { tahmin:{h,d,a,kazanan,tavsiye}, h2h:[...] }
  let i = 0;
  for (const mac of maclar) {
    i++;
    const d = { tahmin: null, h2h: null };

    // Otoriteler tahmini (predictions)
    try {
      const pj = await apiIstek(`predictions?fixture=${mac.id}`, anahtar);
      const p = pj.response?.[0]?.predictions;
      if (p && p.percent) {
        d.tahmin = {
          h: p.percent.home, d: p.percent.draw, a: p.percent.away,
          kazanan: p.winner?.name || null,
          tavsiye: p.advice || null,
        };
      }
    } catch { /* tahmin yoksa atla */ }

    // Head-to-head (son 5 karşılaşma)
    const ida = adId[mac.evSahibi], idb = adId[mac.deplasman];
    if (ida && idb) {
      try {
        const hj = await apiIstek(`fixtures/headtohead?h2h=${ida}-${idb}&last=5`, anahtar);
        d.h2h = (hj.response || []).map((m) => ({
          tarih: m.fixture.date.slice(0, 10),
          ev: m.teams.home.name, dep: m.teams.away.name,
          evGol: m.goals.home, depGol: m.goals.away,
        }));
      } catch { /* h2h yoksa atla */ }
    }

    detay[mac.id] = d;
    if (i % 10 === 0) console.log(`    …${i}/${maclar.length}`);
    await bekle(120);
  }
  cacheYaz("mac-detay.json", detay);
  console.log(`  ✓ Maç detayları → cache/mac-detay.json (${Object.keys(detay).length} maç)`);
  return detay;
}
