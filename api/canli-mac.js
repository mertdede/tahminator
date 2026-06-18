// Vercel serverless function — SEÇİLİ maçın canlı istatistiği (xG, korner, kart).
// Tarayıcı seçili maç canlıyken /api/canli-mac?id=NNN çağırır.
// fixtures/statistics?fixture=NNN her iki takımın canlı istatistiğini verir.
//
// İstatistik ayıklama mantığı scripts/takim-cek.js ile birebir aynı
// (sayi() + regex: corner/yellow/expected goals). Anahtar yine sunucuda kalır.

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  const id = req.query?.id;
  if (!id) return res.status(200).json({ ev: null, dep: null });

  const anahtar = process.env.APISPORTS_KEY;
  if (!anahtar) return res.status(200).json({ ev: null, dep: null });

  // Bir istatistik değerini sayıya çevirir ("1.46" gibi metin de gelebilir).
  const sayi = (v) => {
    if (typeof v === "number") return v;
    if (typeof v === "string") {
      const n = parseFloat(v);
      return Number.isNaN(n) ? null : n;
    }
    return null;
  };

  // Bir takımın istatistik bloğundan xG/korner/kart ayıkla.
  const ayikla = (ist) => {
    const bul = (re) => ist.find((s) => re.test(s.type))?.value;
    return {
      xg: sayi(bul(/expected[_ ]?goals|xg/i)),
      korner: sayi(bul(/corner/i)),
      kart: sayi(bul(/yellow/i)),
    };
  };

  try {
    const yanit = await fetch(
      `https://v3.football.api-sports.io/fixtures/statistics?fixture=${id}`,
      { headers: { "x-apisports-key": anahtar } }
    );
    const j = await yanit.json();
    const taraflar = j.response || []; // [ {team, statistics}, {team, statistics} ]
    if (taraflar.length < 2) {
      return res.status(200).json({ ev: null, dep: null });
    }
    // response[0] = ev sahibi, response[1] = deplasman (API sırası).
    const ev = ayikla(taraflar[0].statistics || []);
    const dep = ayikla(taraflar[1].statistics || []);
    return res.status(200).json({ ev, dep });
  } catch {
    return res.status(200).json({ ev: null, dep: null });
  }
}
