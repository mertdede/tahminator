// eloratings.net'ten güncel Elo puanlarını çeker.
// Kaynak: https://www.eloratings.net/World.tsv  (anahtar gerektirmez, ücretsiz)
// TSV biçimi: sütun[2] = ISO ülke kodu, sütun[3] = Elo puanı.
import { cacheYaz } from "./yardimci.js";

// ISO ülke kodu (eloratings.net) → prototipteki Türkçe takım adı.
// Yalnızca 2026 Dünya Kupası'ndaki 48 takım eşlenir.
const KOD_ISIM = {
  ES: "İspanya", AR: "Arjantin", FR: "Fransa", EN: "İngiltere",
  BR: "Brezilya", PT: "Portekiz", CO: "Kolombiya", BE: "Belçika",
  AT: "Avusturya", NL: "Hollanda", EC: "Ekvador", DE: "Almanya",
  NO: "Norveç", HR: "Hırvatistan", TR: "Türkiye", JP: "Japonya",
  UY: "Uruguay", CH: "İsviçre", MX: "Meksika", SN: "Senegal",
  PY: "Paraguay", MA: "Fas", EG: "Mısır", CA: "Kanada",
  SQ: "İskoçya", AU: "Avustralya", IR: "İran", DZ: "Cezayir",
  KR: "G. Kore", CZ: "Çekya", US: "ABD", SE: "İsveç",
  BA: "Bosna-Hersek", CV: "Yeşil Burun", CI: "Fildişi Sahili",
  UZ: "Özbekistan", CD: "DR Kongo", PA: "Panama", TN: "Tunus",
  IQ: "Irak", JO: "Ürdün", SA: "S. Arabistan", NZ: "Y. Zelanda",
  HT: "Haiti", ZA: "G. Afrika", GH: "Gana", CW: "Curaçao", QA: "Katar",
};

export async function eloCek() {
  const yanit = await fetch("https://www.eloratings.net/World.tsv");
  if (!yanit.ok) throw new Error(`eloratings.net yanıtı başarısız (HTTP ${yanit.status})`);
  const tsv = await yanit.text();

  const eloMap = {};        // Türkçe ad → Elo
  const bulunmayan = [];    // eşlenemeyen kodlar (bilgi amaçlı)

  for (const satir of tsv.split("\n")) {
    if (!satir.trim()) continue;
    const s = satir.split("\t");
    const kod = s[2];
    const elo = parseInt(s[3], 10);
    if (!kod || Number.isNaN(elo)) continue;
    if (KOD_ISIM[kod]) eloMap[KOD_ISIM[kod]] = elo;
  }

  // 48 takımın hepsi geldi mi? Gelmeyeni rapor et (veri uydurma — boş bırak).
  for (const ad of Object.values(KOD_ISIM)) {
    if (eloMap[ad] === undefined) bulunmayan.push(ad);
  }

  cacheYaz("elo.json", eloMap);
  const sayi = Object.keys(eloMap).length;
  console.log(`  ✓ Elo: ${sayi}/48 takım çekildi → cache/elo.json`);
  if (bulunmayan.length) {
    console.log(`  ! Eşlenemeyen (${bulunmayan.length}): ${bulunmayan.join(", ")}`);
    console.log(`    (Bu takımlar uygulamada gömülü yedek Elo'ya düşecek.)`);
  }
  return eloMap;
}
