// Vercel serverless function — o an OYNANAN tüm maçların canlı skoru.
// Tarayıcı dakikada 1 /api/canli çağırır; biz API-Football'a TEK istek atarız
// (fixtures?live=all → tüm canlı maçlar tek yanıtta gelir).
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

  try {
    const yanit = await fetch(
      "https://v3.football.api-sports.io/fixtures?live=all&league=1",
      { headers: { "x-apisports-key": anahtar } }
    );
    const j = await yanit.json();
    const maclar = (j.response || []).map((m) => ({
      id: m.fixture.id,
      durum: m.fixture.status?.short || null, // "1H","2H","HT","ET"...
      dakika: m.fixture.status?.elapsed ?? null, // oynanan dakika
      evGol: m.goals?.home ?? null,
      depGol: m.goals?.away ?? null,
    }));
    return res.status(200).json({ maclar });
  } catch {
    // API'ye ulaşılamadı — site kırılmasın.
    return res.status(200).json({ maclar: [] });
  }
}
