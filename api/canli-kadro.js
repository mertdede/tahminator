// Vercel serverless function — SEÇİLİ maçın kadrosu ve oyuncu değişiklikleri.
// İki API-Football ucunu birleştirir:
//   fixtures/lineups?fixture=NNN → diziliş + ilk 11 (numara, ad, mevki, grid) + yedekler
//   fixtures/events?fixture=NNN  → maç olayları; içinden "subst" (oyuncu değişikliği) süzülür
//
// grid alanı "satır:sütun" biçimindedir (örn. "1:1" kaleci, "3:4" orta sahanın 4. oyuncusu);
// tarayıcı bununla oyuncuları taktiksel dizilime uygun sahaya yerleştirir.
// API anahtarı sunucuda (process.env) kalır; istemciye gitmez.

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  const id = req.query?.id;
  if (!id) return res.status(200).json({ ev: null, dep: null, degisiklikler: [] });

  const anahtar = process.env.APISPORTS_KEY;
  if (!anahtar) return res.status(200).json({ ev: null, dep: null, degisiklikler: [] });

  const H = { headers: { "x-apisports-key": anahtar } };

  // Bir oyuncu nesnesini sadeleştirir.
  const oyuncu = (p) => ({
    numara: p.player?.number ?? null,
    ad: p.player?.name || "",
    mevki: p.player?.pos || null,   // G/D/M/F
    grid: p.player?.grid || null,   // "satır:sütun" ya da null (yedeklerde yok)
  });

  // Bir takım dizilişini (lineups response[i]) sadeleştirir.
  const takim = (t) => ({
    ad: t.team?.name || "",
    formation: t.formation || null,
    ilk11: (t.startXI || []).map((p) => oyuncu(p)),
    yedek: (t.substitutes || []).map((p) => oyuncu(p)),
  });

  try {
    const [lr, er] = await Promise.all([
      fetch(`https://v3.football.api-sports.io/fixtures/lineups?fixture=${id}`, H),
      fetch(`https://v3.football.api-sports.io/fixtures/events?fixture=${id}`, H),
    ]);
    const lj = await lr.json();
    const ej = await er.json();

    const taraflar = lj.response || [];
    const ev = taraflar[0] ? takim(taraflar[0]) : null;
    const dep = taraflar[1] ? takim(taraflar[1]) : null;

    // Oyuncu değişiklikleri (type "subst"). API-Football'da:
    //   player = SAHADAN ÇIKAN oyuncu, assist = SAHAYA GİREN oyuncu.
    const degisiklikler = (ej.response || [])
      .filter((o) => /subst/i.test(o.type || ""))
      .map((o) => ({
        dakika: o.time?.elapsed ?? null,
        ekDakika: o.time?.extra ?? null,
        takim: o.team?.name || "",
        cikan: o.player?.name || null,
        giren: o.assist?.name || null,
      }));

    return res.status(200).json({ ev, dep, degisiklikler });
  } catch {
    return res.status(200).json({ ev: null, dep: null, degisiklikler: [] });
  }
}
