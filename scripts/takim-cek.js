// Takım bazlı istatistikler: son 5 maçtan korner & sarı kart ortalaması,
// ve takımın bir önceki maçındaki diziliş (formation).
// API-Football uçları: /teams, /fixtures?team&last, /fixtures/statistics, /fixtures/lineups
import { apiIstek, cacheYaz, bugunGuncelMi, cacheOku } from "./yardimci.js";

const LIG = 1, SEZON = 2026;

// Küçük bir gecikme — API'yi hızlı ardışık isteklerle yormamak için.
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

// Tek takım için son maçlardan korner/kart ortalaması + son formation.
async function takimAnaliz(teamId, anahtar) {
  // Son 6 maçı al (istatistiği olmayan olabilir diye 1 fazla).
  const fj = await apiIstek(`fixtures?team=${teamId}&last=6`, anahtar);
  const maclar = fj.response || [];
  if (maclar.length === 0) return null;

  const kornerler = [];
  const kartlar = [];
  const xgler = [];        // expected_goals (üretilen gol pozisyonu kalitesi)
  const gpler = [];        // goals_prevented (kaleci/savunma performansı)
  let formation = null;

  // Bir istatistik değerini sayıya çevirir ("1.46" gibi metin de gelebilir).
  const sayi = (v) => {
    if (typeof v === "number") return v;
    if (typeof v === "string") { const n = parseFloat(v); return Number.isNaN(n) ? null : n; }
    return null;
  };

  for (const mac of maclar) {
    const fid = mac.fixture.id;
    // İstatistik (korner + sarı kart + xG + goals_prevented) — bu takımın tarafını bul.
    try {
      const sj = await apiIstek(`fixtures/statistics?fixture=${fid}&team=${teamId}`, anahtar);
      const ist = sj.response?.[0]?.statistics || [];
      const bul = (re) => ist.find((s) => re.test(s.type))?.value;
      const korner = sayi(bul(/corner/i));
      const kart = sayi(bul(/yellow/i));
      const xg = sayi(bul(/expected[_ ]?goals|xg/i));
      const gp = sayi(bul(/goals[_ ]?prevented/i));
      if (korner != null) kornerler.push(korner);
      if (kart != null) kartlar.push(kart);
      if (xg != null) xgler.push(xg);
      if (gp != null) gpler.push(gp);
    } catch { /* bu maçta istatistik yoksa atla */ }

    // Formation: en yeni maçtan (ilk bulunan) al.
    if (!formation) {
      try {
        const lj = await apiIstek(`fixtures/lineups?fixture=${fid}&team=${teamId}`, anahtar);
        formation = lj.response?.[0]?.formation || null;
      } catch { /* diziliş yoksa atla */ }
    }
    await bekle(120); // nazik hız
    if (kornerler.length >= 5 && kartlar.length >= 5 && xgler.length >= 5 && formation) break;
  }

  const ort = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
  return {
    korner: ort(kornerler.slice(0, 5)),   // son ≤5 maç korner ortalaması (bu takımın)
    kornerSayi: Math.min(kornerler.length, 5),
    kart: ort(kartlar.slice(0, 5)),       // son ≤5 maç sarı kart ortalaması
    kartSayi: Math.min(kartlar.length, 5),
    xg: ort(xgler.slice(0, 5)),           // son ≤5 maç beklenen gol (xG) ortalaması
    xgSayi: Math.min(xgler.length, 5),
    gp: ort(gpler.slice(0, 5)),           // son ≤5 maç goals_prevented ortalaması
    formation,                             // en son dizilişi (örn. "4-2-3-1")
  };
}

// Tüm 48 takım için analiz çıkar → cache/takimlar.json
export async function takimlarCek(anahtar) {
  if (bugunGuncelMi("takimlar.json")) {
    console.log("  • Takım istatistikleri bugün zaten güncel — API'ye gidilmedi.");
    return;
  }
  // Takım listesi + ID'ler (1 istek).
  const tj = await apiIstek(`teams?league=${LIG}&season=${SEZON}`, anahtar);
  const takimlar = tj.response || [];
  console.log(`  → ${takimlar.length} takım bulundu, istatistikler çekiliyor (biraz sürebilir)…`);

  const sonuc = {};   // API'deki İngilizce ad → { korner, kart, formation }
  let i = 0;
  for (const t of takimlar) {
    i++;
    const ad = t.team.name;
    try {
      const analiz = await takimAnaliz(t.team.id, anahtar);
      if (analiz) {
        sonuc[ad] = analiz;
        const k = analiz.korner != null ? analiz.korner.toFixed(1) : "—";
        const y = analiz.kart != null ? analiz.kart.toFixed(1) : "—";
        const x = analiz.xg != null ? analiz.xg.toFixed(2) : "—";
        console.log(`    [${i}/${takimlar.length}] ${ad}: korner ${k}, kart ${y}, xG ${x}, diziliş ${analiz.formation || "—"}`);
      }
    } catch (e) {
      console.log(`    [${i}/${takimlar.length}] ${ad}: çekilemedi (${e.message})`);
    }
  }
  cacheYaz("takimlar.json", sonuc);
  console.log(`  ✓ Takım istatistikleri → cache/takimlar.json (${Object.keys(sonuc).length} takım)`);
  return sonuc;
}
