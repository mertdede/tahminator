// Vercel serverless function — o an OYNANAN ve BUGÜN BİTEN maçların skoru.
// Tarayıcı dakikada 1 /api/canli çağırır; biz API-Football'a İKİ istek atarız:
//   fixtures?live=all   → o an canlı maçlar (dakika bilgisiyle)
//   fixtures?date=BUGÜN → bugünün tüm maçları (biten maçlar "FT" + final skor)
// İkisini birleştiririz: canlı veri önceliklidir, biten maçlar listede kalır.
//
// NEDEN iki istek? live=all sadece O AN oynanan maçları döner; maç bitince
// listeden düşer. Yakın Fikstür'de biten maçın final skorunun ("MS 1-1")
// görünmesi için bugünün maçlarını da çekip biten durumları (FT/AET/PEN) ekleriz.
//
// API anahtarı SADECE burada (sunucuda) kalır: process.env.APISPORTS_KEY.
// İstemciye asla gitmez. Anahtar yoksa ya da hata olursa { maclar: [] } döner;
// site bu durumda statik modda sorunsuz çalışmaya devam eder.

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store"); // canlı veri önbelleğe alınmasın

  const anahtar = process.env.APISPORTS_KEY;
  if (!anahtar) {
    // Anahtar tanımsız (Vercel env var girilmemiş) — site kırılmasın.
    return res.status(200).json({ maclar: [], not: "anahtar yok" });
  }

  const H = { headers: { "x-apisports-key": anahtar } };

  // Bir API-Football maç nesnesini sadeleştirir.
  const sadele = (m) => ({
    id: m.fixture.id,
    durum: m.fixture.status?.short || null, // "1H","2H","HT","FT","AET"...
    dakika: m.fixture.status?.elapsed ?? null, // oynanan dakika (bitende null olabilir)
    evGol: m.goals?.home ?? null,
    depGol: m.goals?.away ?? null,
  });

  // Bugünün tarihini API'nin beklediği YYYY-MM-DD biçiminde üret (UTC).
  const bugun = new Date().toISOString().slice(0, 10);
  // date= sorgusu API-Football'da season parametresini zorunlu kılar (lig=1, sezon=2026).
  const SEZON = 2026;

  try {
    const [canliR, bugunR] = await Promise.all([
      fetch("https://v3.football.api-sports.io/fixtures?live=all&league=1", H),
      fetch(`https://v3.football.api-sports.io/fixtures?date=${bugun}&league=1&season=${SEZON}`, H),
    ]);
    const canliJ = await canliR.json();
    const bugunJ = await bugunR.json();

    // id → maç haritası. Önce bugünün maçlarını koy (biten skorlar dahil),
    // sonra canlı maçlarla ÜZERİNE yaz (canlı dakika bilgisi öncelikli).
    const harita = new Map();
    for (const m of bugunJ.response || []) harita.set(m.fixture.id, sadele(m));
    for (const m of canliJ.response || []) harita.set(m.fixture.id, sadele(m));

    return res.status(200).json({ maclar: [...harita.values()] });
  } catch {
    // API'ye ulaşılamadı — site kırılmasın.
    return res.status(200).json({ maclar: [] });
  }
}
