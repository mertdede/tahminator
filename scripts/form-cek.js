// Son 5 maç formunu (G/B/M) API-Football'dan canlı çeker → cache/form.json
// Her takımın OYNANMIŞ (bitmiş) son 5 maçına bakar; sonucu takımın kendi
// açısından G (galibiyet) / B (beraberlik) / M (mağlubiyet) olarak kodlar.
// Diziyi prototipteki gibi "eskiden yeniye" sırada saklar.
//
// Not: api-cek.js'teki fikstür yalnızca Dünya Kupası maçlarını içerir; form için
// takımın TÜM son maçları (hazırlık, eleme vb.) anlamlı olduğundan /fixtures?team&last
// ucu kullanılır (lig filtresi yok).
import { apiIstek, cacheYaz, bugunGuncelMi } from "./yardimci.js";

const LIG = 1, SEZON = 2026;
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

// Bir maçın sonucunu, verilen takım ID'si açısından "G"/"B"/"M" döndürür.
function sonucHarfi(mac, teamId) {
  const evId = mac.teams?.home?.id;
  const evGol = mac.goals?.home;
  const depGol = mac.goals?.away;
  if (evGol == null || depGol == null) return null; // skor yoksa sayma
  const benimGol = evId === teamId ? evGol : depGol;
  const rakipGol = evId === teamId ? depGol : evGol;
  if (benimGol > rakipGol) return "G";
  if (benimGol < rakipGol) return "M";
  return "B";
}

// Tek takım için son 5 oynanmış maçtan form dizisi (eskiden yeniye).
async function takimForm(teamId, anahtar) {
  // Son 10 maçı iste; bitmiş olmayanları eleyip ilk 5 bitmişi alırız.
  const fj = await apiIstek(`fixtures?team=${teamId}&last=10`, anahtar);
  const maclar = fj.response || [];
  // API en yeniden eskiye döndürür. Bitmiş (FT/AET/PEN) ve skoru olanları al.
  const bitmis = maclar.filter((m) => {
    const st = m.fixture?.status?.short;
    return ["FT", "AET", "PEN"].includes(st) && m.goals?.home != null && m.goals?.away != null;
  });
  const son5 = bitmis.slice(0, 5);                 // en yeni 5 (yeniden eskiye)
  const harfler = son5.map((m) => sonucHarfi(m, teamId)).filter(Boolean);
  if (harfler.length === 0) return null;
  return harfler.reverse().join("");                // eskiden yeniye sırala
}

export async function formCek(anahtar) {
  if (bugunGuncelMi("form.json")) {
    console.log("  • Form bugün zaten güncel — API'ye gidilmedi.");
    return;
  }
  // Takım listesi + ID'ler (1 istek).
  const tj = await apiIstek(`teams?league=${LIG}&season=${SEZON}`, anahtar);
  const takimlar = tj.response || [];
  console.log(`  → ${takimlar.length} takım için son 5 maç formu çekiliyor…`);

  const sonuc = {}; // API'deki İngilizce ad → "GBGMG" gibi dizi
  let i = 0;
  for (const t of takimlar) {
    i++;
    const ad = t.team.name;
    try {
      const form = await takimForm(t.team.id, anahtar);
      if (form) {
        sonuc[ad] = form;
        if (i % 8 === 0) console.log(`    …${i}/${takimlar.length}`);
      }
    } catch (e) {
      console.log(`    [${i}/${takimlar.length}] ${ad}: form çekilemedi (${e.message})`);
    }
    await bekle(120); // nazik hız
  }
  cacheYaz("form.json", sonuc);
  console.log(`  ✓ Form → cache/form.json (${Object.keys(sonuc).length} takım)`);
  return sonuc;
}
