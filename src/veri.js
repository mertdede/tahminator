// Canlı veri katmanı: public/veri/ altındaki JSON'ları okur.
// Bunlar "npm run veri-guncelle" tarafından üretilir.
// Veri yoksa (script hiç çalışmadıysa) uygulama gömülü yedeğe düşer.

// API-Football'daki İngilizce takım adı → prototipteki Türkçe ad.
// 2026 Dünya Kupası'ndaki 48 takımın tamamı eşlenir.
export const ISIM_TR = {
  "Spain": "İspanya", "Argentina": "Arjantin", "France": "Fransa",
  "England": "İngiltere", "Brazil": "Brezilya", "Portugal": "Portekiz",
  "Colombia": "Kolombiya", "Belgium": "Belçika", "Austria": "Avusturya",
  "Netherlands": "Hollanda", "Ecuador": "Ekvador", "Germany": "Almanya",
  "Norway": "Norveç", "Croatia": "Hırvatistan", "Türkiye": "Türkiye",
  "Japan": "Japonya", "Uruguay": "Uruguay", "Switzerland": "İsviçre",
  "Mexico": "Meksika", "Senegal": "Senegal", "Paraguay": "Paraguay",
  "Morocco": "Fas", "Egypt": "Mısır", "Canada": "Kanada",
  "Scotland": "İskoçya", "Australia": "Avustralya", "Iran": "İran",
  "Algeria": "Cezayir", "South Korea": "G. Kore", "Czech Republic": "Çekya",
  "USA": "ABD", "Sweden": "İsveç", "Bosnia & Herzegovina": "Bosna-Hersek",
  "Cape Verde Islands": "Yeşil Burun", "Ivory Coast": "Fildişi Sahili",
  "Uzbekistan": "Özbekistan", "Congo DR": "DR Kongo", "Panama": "Panama",
  "Tunisia": "Tunus", "Iraq": "Irak", "Jordan": "Ürdün",
  "Saudi Arabia": "S. Arabistan", "New Zealand": "Y. Zelanda",
  "Haiti": "Haiti", "South Africa": "G. Afrika", "Ghana": "Gana",
  "Curaçao": "Curaçao", "Qatar": "Katar",
};

const trAd = (enAd) => ISIM_TR[enAd] || enAd;

// Bir JSON dosyasını public/veri/ altından okur. Yoksa null döner.
async function veriOku(dosya) {
  try {
    const yanit = await fetch(`/veri/${dosya}`);
    if (!yanit.ok) return null;
    return await yanit.json();
  } catch {
    return null;
  }
}

// Tüm canlı veriyi tek seferde yükler. Hiçbiri zorunlu değil; yoksa null gelir.
export async function canliVeriYukle() {
  const [elo, fikstur, oranlar, takimlar, standings, macDetay, hava, form] =
    await Promise.all([
      veriOku("elo.json"),
      veriOku("fikstur.json"),
      veriOku("oranlar.json"),
      veriOku("takimlar.json"),
      veriOku("standings.json"),
      veriOku("mac-detay.json"),
      veriOku("hava.json"),
      veriOku("form.json"),
    ]);

  // Fikstürdeki takım adlarını Türkçeleştir; oranı, stadyumu, havayı maça bağla.
  let maclar = null;
  if (fikstur?.veri) {
    const oranMap = oranlar?.veri || {};
    const havaMap = hava?.veri || {};
    maclar = fikstur.veri.map((m) => ({
      id: m.id,
      tarih: m.tarih,
      durum: m.durum,
      tur: m.tur,
      evSahibi: trAd(m.evSahibi),
      deplasman: trAd(m.deplasman),
      evGol: m.evGol,
      depGol: m.depGol,
      stat: m.stat || null,            // stadyum adı
      sehir: m.sehir || null,          // şehir
      sicaklik: havaMap[m.id] ?? null, // °C ya da null (tahmin penceresi dışındaysa)
      oran: oranMap[m.id] || null,     // { h, d, a } ondalık ya da null
    }));
  }

  // Takım istatistiklerini Türkçe ada göre yeniden anahtarla (korner/kart/diziliş).
  let takimMap = null;
  if (takimlar?.veri) {
    takimMap = {};
    for (const [enAd, v] of Object.entries(takimlar.veri)) {
      takimMap[trAd(enAd)] = v;
    }
  }

  // Grup puan durumundaki takım adlarını Türkçeleştir.
  let gruplar = null;
  if (standings?.veri) {
    gruplar = standings.veri.map((grup) =>
      grup.map((s) => ({ ...s, takim: trAd(s.takim) }))
    );
  }

  // Son 5 maç formunu Türkçe ada göre yeniden anahtarla ("GBGMG" gibi dizi).
  let formMap = null;
  if (form?.veri) {
    formMap = {};
    for (const [enAd, dizi] of Object.entries(form.veri)) {
      formMap[trAd(enAd)] = dizi;
    }
  }

  // Maç detayları (otoriteler tahmini + H2H): id'ye göre, H2H adları Türkçeleşir.
  let detayMap = null;
  if (macDetay?.veri) {
    detayMap = {};
    for (const [id, d] of Object.entries(macDetay.veri)) {
      detayMap[id] = {
        tahmin: d.tahmin || null,
        h2h: (d.h2h || []).map((m) => ({
          ...m, ev: trAd(m.ev), dep: trAd(m.dep),
        })),
      };
    }
  }

  return {
    elo: elo?.veri || null,                 // { "Türkiye": 1911, ... } ya da null
    eloTarih: elo?.guncellenme || null,
    maclar,                                  // Türkçeleştirilmiş maç dizisi ya da null
    maclarTarih: fikstur?.guncellenme || null,
    takimlar: takimMap,                      // { "Türkiye": {korner,kart,xg,gp,formation}, ... }
    form: formMap,                           // { "Türkiye": "GBGMG", ... } ya da null
    formTarih: form?.guncellenme || null,
    gruplar,                                 // [[grup A satırları], ...] Türkçe adlı
    detaylar: detayMap,                      // { macId: {tahmin, h2h} }
    detayTarih: macDetay?.guncellenme || null,
  };
}
