// API-Football'dan Dünya Kupası 2026 fikstür ve oranlarını çeker.
// Lig id = 1 (World Cup), sezon = 2026.
// API limiti (100/gün) koruması: dosya bugün güncelse API'ye gidilmez.
import { apiIstek, cacheYaz, bugunGuncelMi } from "./yardimci.js";

const LIG = 1, SEZON = 2026;

// Fikstürü çeker → cache/fikstur.json
export async function fiksturCek(anahtar) {
  if (bugunGuncelMi("fikstur.json")) {
    console.log("  • Fikstür bugün zaten güncel — API'ye gidilmedi (limit korundu).");
    return;
  }
  const json = await apiIstek(`fixtures?league=${LIG}&season=${SEZON}`, anahtar);
  // Sadece ihtiyacımız olan alanları sadeleştirip saklarız (dosya küçük kalsın).
  const maclar = (json.response || []).map((m) => ({
    id: m.fixture.id,
    tarih: m.fixture.date,
    durum: m.fixture.status?.short,
    tur: m.league?.round,
    evSahibi: m.teams?.home?.name,
    deplasman: m.teams?.away?.name,
    evGol: m.goals?.home,
    depGol: m.goals?.away,
    stat: m.fixture?.venue?.name || null,    // stadyum adı
    sehir: m.fixture?.venue?.city || null,   // şehir (hava durumu için)
  }));
  cacheYaz("fikstur.json", maclar);
  console.log(`  ✓ Fikstür: ${maclar.length} maç çekildi → cache/fikstur.json (1 istek)`);
  return maclar;
}

// Oranları çeker → cache/oranlar.json (maç id → 1/X/2 ondalık oran).
export async function oranCek(anahtar) {
  if (bugunGuncelMi("oranlar.json")) {
    console.log("  • Oranlar bugün zaten güncel — API'ye gidilmedi (limit korundu).");
    return;
  }
  const json = await apiIstek(`odds?league=${LIG}&season=${SEZON}`, anahtar);
  const oranlar = {};
  for (const kayit of json.response || []) {
    const macId = kayit.fixture?.id;
    if (!macId) continue;
    // İlk bahisçinin "Match Winner" (1X2) marketini al.
    const bahisci = kayit.bookmakers?.[0];
    const market = bahisci?.bets?.find((b) => /match winner|1x2/i.test(b.name));
    if (!market) continue;
    const al = (etiket) => {
      const v = market.values?.find((x) => new RegExp(`^${etiket}$`, "i").test(x.value));
      return v ? parseFloat(v.odd) : null;
    };
    oranlar[macId] = { h: al("Home"), d: al("Draw"), a: al("Away") };
  }
  cacheYaz("oranlar.json", oranlar);
  const n = Object.keys(oranlar).length;
  console.log(`  ✓ Oranlar: ${n} maç için 1X2 çekildi → cache/oranlar.json (1 istek)`);
  return oranlar;
}
