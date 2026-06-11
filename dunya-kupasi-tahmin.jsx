import { useState, useMemo, useEffect } from "react";

// ----- Gerçek Elo puanları — eloratings.net, 9 Haziran 2026 + kullanıcı güncellemeleri -----
const TEAMS = [
  ["İspanya", 2157], ["Arjantin", 2114], ["Fransa", 2063], ["İngiltere", 2021],
  ["Brezilya", 1991], ["Portekiz", 1986], ["Kolombiya", 1982], ["Belçika", 1955],
  ["Avusturya", 1950], ["Hollanda", 1948], ["Ekvador", 1938], ["Almanya", 1932],
  ["Norveç", 1914], ["Hırvatistan", 1911], ["Türkiye", 1911], ["Japonya", 1906],
  ["Uruguay", 1892], ["İsviçre", 1891], ["Meksika", 1875], ["Senegal", 1867],
  ["Paraguay", 1833], ["Fas", 1827], ["Mısır", 1825], ["Kanada", 1788],
  ["İskoçya", 1782], ["Avustralya", 1777], ["İran", 1772], ["Cezayir", 1760],
  ["G. Kore", 1758], ["Çekya", 1740], ["ABD", 1726], ["İsveç", 1712],
  ["Bosna-Hersek", 1700], ["Yeşil Burun", 1699], ["Fildişi Sahili", 1695],
  ["Özbekistan", 1675], ["DR Kongo", 1661], ["Panama", 1641], ["Tunus", 1628],
  ["Irak", 1618], ["Ürdün", 1599], ["S. Arabistan", 1576], ["Y. Zelanda", 1575],
  ["Haiti", 1548], ["G. Afrika", 1518], ["Gana", 1510], ["Curaçao", 1434], ["Katar", 1421],
];

// ----- Resmi 2026 Dünya Kupası grupları (5 Aralık 2025 kurası) -----
const GROUPS = {
  A: ["Meksika", "G. Afrika", "G. Kore", "Çekya"],
  B: ["Kanada", "Bosna-Hersek", "Katar", "İsviçre"],
  C: ["Brezilya", "Fas", "Haiti", "İskoçya"],
  D: ["ABD", "Paraguay", "Avustralya", "Türkiye"],
  E: ["Almanya", "Curaçao", "Fildişi Sahili", "Ekvador"],
  F: ["Hollanda", "Japonya", "İsveç", "Tunus"],
  G: ["Belçika", "Mısır", "İran", "Y. Zelanda"],
  H: ["İspanya", "Yeşil Burun", "S. Arabistan", "Uruguay"],
  I: ["Fransa", "Irak", "Norveç", "Senegal"],
  J: ["Arjantin", "Cezayir", "Avusturya", "Ürdün"],
  K: ["Portekiz", "DR Kongo", "Özbekistan", "Kolombiya"],
  L: ["İngiltere", "Hırvatistan", "Gana", "Panama"],
};
const HOSTS = ["Meksika", "Kanada", "ABD"]; // grup maçlarını kendi ülkesinde oynayan ev sahipleri

// Sıcaklık toleransı yüksek takımlar: Güney Amerika + Kuzey/Orta Afrika
const HEAT_TEAMS = ["Arjantin", "Brezilya", "Kolombiya", "Ekvador", "Uruguay", "Paraguay", "Fas", "Cezayir", "Tunus", "Mısır", "DR Kongo"];

// ----- Doğrulanmış son 5 maç formu, 48/48 takım (eskiden yeniye) — eloratings.net maç geçmişleri, 10 Haziran 2026 -----
const FORM_DATA = {
  "İspanya": "BGBBG", "Arjantin": "GGGGG", "Fransa": "GGGGM", "İngiltere": "GGBMG",
  "Brezilya": "BMGGG", "Portekiz": "MGBGG", "Kolombiya": "GMMGG", "Belçika": "GGBGG",
  "Avusturya": "GBGGG", "Hollanda": "GGBMG", "Ekvador": "BBGBG", "Almanya": "GGGGG",
  "Norveç": "GMBGB", "Hırvatistan": "GGGMM", "Türkiye": "BGGGG", "Japonya": "GGGGG",
  "Uruguay": "GBMBB", "İsviçre": "BMBGB", "Meksika": "BBGGG", "Senegal": "GGGGM",
  "Paraguay": "MGGMG", "Fas": "BGGGB", "Mısır": "MBGGM", "Kanada": "GGBBG",
  "İskoçya": "GMMGG", "Avustralya": "MMGGM", "İran": "BMGGG", "Cezayir": "GMGBG",
  "G. Kore": "GMMGG", "Çekya": "GBBGG", "ABD": "GMMGM", "İsveç": "BGGMB",
  "Bosna-Hersek": "GBBBB", "Yeşil Burun": "BBMBG", "Fildişi Sahili": "GMGGG",
  "Özbekistan": "BGBMM", "DR Kongo": "GMGGB", "Panama": "BGMGB", "Tunus": "BBGBM",
  "Irak": "MMGGB", "Ürdün": "GMBBM", "S. Arabistan": "MBMMM", "Y. Zelanda": "MMGMM",
  "Haiti": "GGMBG", "G. Afrika": "MBMBG", "Gana": "MMMMB", "Curaçao": "GBMMM",
  "Katar": "MMBMM",
};
const seqOf = (name) => (FORM_DATA[name] ? FORM_DATA[name].split("") : ["-", "-", "-", "-", "-"]);
const adjOf = (seq) => seq.reduce((t, x) => t + (x === "G" ? 10 : x === "M" ? -10 : 0), 0);

// ----- Model yardımcıları -----
const fact = (n) => { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; };
const pois = (k, l) => (Math.exp(-l) * Math.pow(l, k)) / fact(k);

function computeModel(eloA, eloB, formA, formB, hostA, hostB, multA = 1, multB = 1) {
  const d = (eloA + formA + (hostA ? 60 : 0)) - (eloB + formB + (hostB ? 60 : 0));
  const BASE = 1.32, K = 0.0019;
  const lA = Math.min(BASE * Math.exp(K * d) * multA, 5.5);
  const lB = Math.min(BASE * Math.exp(-K * d) * multB, 5.5);
  const N = 11;
  let pW = 0, pD = 0, pL = 0;
  const matrix = [];
  for (let a = 0; a < N; a++) {
    matrix[a] = [];
    for (let b = 0; b < N; b++) {
      const p = pois(a, lA) * pois(b, lB);
      matrix[a][b] = p;
      if (a > b) pW += p; else if (a === b) pD += p; else pL += p;
    }
  }
  const scores = [];
  for (let a = 0; a <= 5; a++) for (let b = 0; b <= 5; b++) scores.push({ a, b, p: matrix[a][b] });
  scores.sort((x, y) => y.p - x.p);
  return { lA, lB, pW, pD, pL, matrix, top: scores.slice(0, 5) };
}

const pct = (x) => (x * 100).toFixed(1) + "%";
const toOdds = (p) => (p > 0 ? (1 / p).toFixed(2) : "—");

// ----- Grup simülasyonu yardımcıları -----
const BASE = 1.32, K = 0.0019;
const lambdas = (eA, eB) => {
  const d = eA - eB;
  return [Math.min(BASE * Math.exp(K * d), 5.5), Math.min(BASE * Math.exp(-K * d), 5.5)];
};
const samplePois = (l) => {
  const L = Math.exp(-l);
  let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
};

function simulateGroup(names, elos, runs = 10000, mults = null) {
  const n = 4;
  const counts = names.map(() => [0, 0, 0, 0]); // 1.,2.,3.,4. bitirme sayıları
  const eff = names.map((nm, i) => elos[i] + (HOSTS.includes(nm) ? 60 : 0));
  const mu = mults || names.map(() => 1);
  const pairs = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const [li, lj] = lambdas(eff[i], eff[j]);
    pairs.push([i, j, Math.min(li * mu[i], 5.5), Math.min(lj * mu[j], 5.5)]);
  }
  for (let r = 0; r < runs; r++) {
    const pts = [0, 0, 0, 0], gd = [0, 0, 0, 0], gf = [0, 0, 0, 0];
    for (const [i, j, li, lj] of pairs) {
      const gi = samplePois(li), gj = samplePois(lj);
      gd[i] += gi - gj; gd[j] += gj - gi; gf[i] += gi; gf[j] += gj;
      if (gi > gj) pts[i] += 3; else if (gj > gi) pts[j] += 3; else { pts[i]++; pts[j]++; }
    }
    const order = [0, 1, 2, 3].sort((a, b) =>
      pts[b] - pts[a] || gd[b] - gd[a] || gf[b] - gf[a] || Math.random() - 0.5
    );
    order.forEach((team, place) => counts[team][place]++);
  }
  return names.map((nm, i) => {
    const [p1, p2, p3, p4] = counts[i].map((c) => c / runs);
    return { name: nm, elo: elos[i], host: HOSTS.includes(nm), p1, p2, p3, p4, top2: p1 + p2, adv: p1 + p2 + p3 * (8 / 12) };
  }).sort((a, b) => b.adv - a.adv);
}

// ----- Bileşen -----
export default function App() {
  const [idxA, setIdxA] = useState(14); // Türkiye
  const [idxB, setIdxB] = useState(30); // ABD
  const [paste, setPaste] = useState("");
  const [eloOv, setEloOv] = useState({});
  const [formA, setFormA] = useState(adjOf(seqOf("Türkiye")));
  const [formB, setFormB] = useState(adjOf(seqOf("ABD")));
  const [hostA, setHostA] = useState(false);
  const [hostB, setHostB] = useState(true);
  const [seqA, setSeqA] = useState(seqOf("Türkiye"));
  const [seqB, setSeqB] = useState(seqOf("ABD"));
  const [grp, setGrp] = useState("D");
  const [simRes, setSimRes] = useState(null);
  const [heat, setHeat] = useState({ on: false, val: 7.5 });
  const [odds, setOdds] = useState({ h: "", d: "", a: "" });
  const [corn, setCorn] = useState({ avgA: "", last5A: "", avgB: "", last5B: "" });
  const [cards, setCards] = useState({ avgA: "", last5A: "", avgB: "", last5B: "", ref: "1", conmebol: false });

  // Sarı kart modeli: her takımın ALDIĞI kart ortalamaları toplanır, hakem/bölge çarpanı uygulanır
  const cardModel = useMemo(() => {
    const parse5 = (s) => (s.match(/\d+/g) || []).map(Number).filter((n) => n >= 0 && n <= 12);
    const teamAvg = (avgStr, last5Str) => {
      const l5 = parse5(last5Str);
      if (l5.length >= 3) return { val: l5.reduce((a, b) => a + b, 0) / l5.length, src: `son ${l5.length} maç` };
      const a = parseFloat(avgStr);
      if (a >= 0 && avgStr !== "") return { val: a, src: "10 maç ort." };
      return { val: 2.21, src: "varsayılan (küresel ort.)" };
    };
    const A = teamAvg(cards.avgA, cards.last5A);
    const B = teamAvg(cards.avgB, cards.last5B);
    const refMult = parseFloat(cards.ref);
    const mult = refMult * (cards.conmebol ? 1.15 : 1);
    const lambda = (A.val + B.val) * mult;
    const cdf = (k) => { let s = 0; for (let i = 0; i <= k; i++) s += pois(i, lambda); return s; };
    const lines = [2.5, 3.5, 4.5, 5.5, 6.5].map((L) => {
      const over = 1 - cdf(Math.floor(L));
      return { L, over, under: 1 - over };
    });
    return { lambda, A, B, mult, lines };
  }, [cards]);

  // Korner modeli: takım ortalamaları → toplam korner Poisson dağılımı
  const cornerModel = useMemo(() => {
    const parse5 = (s) => (s.match(/\d+/g) || []).map(Number).filter((n) => n >= 0 && n <= 30);
    const teamAvg = (avgStr, last5Str) => {
      const l5 = parse5(last5Str);
      if (l5.length >= 3) return { val: l5.reduce((a, b) => a + b, 0) / l5.length, src: `son ${l5.length} maç` };
      const a = parseFloat(avgStr);
      if (a > 0) return { val: a, src: "10 maç ort." };
      return { val: 9.0, src: "varsayılan (uluslararası ort.)" };
    };
    const A = teamAvg(corn.avgA, corn.last5A);
    const B = teamAvg(corn.avgB, corn.last5B);
    const lambda = (A.val + B.val) / 2;
    const cdf = (k) => { let s = 0; for (let i = 0; i <= k; i++) s += pois(i, lambda); return s; };
    const lines = [7.5, 8.5, 9.5, 10.5, 11.5].map((L) => {
      const over = 1 - cdf(Math.floor(L));
      return { L, over, under: 1 - over };
    });
    return { lambda, A, B, lines };
  }, [corn]);

  const eloA = eloOv["A" + idxA] ?? TEAMS[idxA][1];
  const eloB = eloOv["B" + idxB] ?? TEAMS[idxB][1];
  const nameA = TEAMS[idxA][0], nameB = TEAMS[idxB][0];

  // Takım değişince son 5 maç formunu güvenilir şekilde tazele
  useEffect(() => { const s = seqOf(nameA); setSeqA(s); setFormA(adjOf(s)); }, [idxA]);
  useEffect(() => { const s = seqOf(nameB); setSeqB(s); setFormB(adjOf(s)); }, [idxB]);

  const heatMult = (name) => (heat.on && HEAT_TEAMS.includes(name) ? 1 + heat.val / 100 : 1);

  const m = useMemo(
    () => computeModel(eloA, eloB, formA, formB, hostA, hostB, heatMult(nameA), heatMult(nameB)),
    [eloA, eloB, formA, formB, hostA, hostB, heat, nameA, nameB]
  );

  // Piyasa oranları → marjsız olasılık
  const market = useMemo(() => {
    const h = parseFloat(odds.h), d = parseFloat(odds.d), a = parseFloat(odds.a);
    if (!(h > 1 && d > 1 && a > 1)) return null;
    const s = 1 / h + 1 / d + 1 / a;
    return { h: 1 / h / s, d: 1 / d / s, a: 1 / a / s, vig: (s - 1) * 100 };
  }, [odds]);

  const C = {
    bg: "#0C120E", panel: "#121A14", panel2: "#0F1711",
    line: "rgba(237,242,236,0.14)", text: "#EDF2EC", dim: "#93A096",
    gold: "#E9B44C", green: "#7BD389", blue: "#6FB7E0", gray: "#8E9A93",
  };

  const input = {
    background: C.panel2, color: C.text, border: `1px solid ${C.line}`,
    borderRadius: 6, padding: "8px 10px", width: "100%",
    fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, outline: "none",
  };

  const TeamCard = ({ label, color, idx, setIdx, elo, eloKey, form, setForm, host, setHost, seq, setSeq }) => (
    <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: 16, flex: 1, minWidth: 260 }}>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: 2, color, marginBottom: 10 }}>{label}</div>
      <select value={idx} onChange={(e) => setIdx(+e.target.value)} style={{ ...input, marginBottom: 10, fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 16 }}>
        {TEAMS.map((t, i) => <option key={i} value={i}>{t[0]}{FORM_DATA[t[0]] ? "" : " ·"}</option>)}
      </select>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
        <span style={{ color: C.dim, fontSize: 12, width: 90 }}>Elo puanı</span>
        <input type="number" value={elo} onChange={(e) => setEloOv((o) => ({ ...o, [eloKey]: +e.target.value }))} style={{ ...input, width: 100 }} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: C.dim, marginBottom: 6 }}>Son 5 maç — eskiden yeniye (veri varsa otomatik dolar; tıklayıp G/B/M değiştir)</div>
        <div style={{ display: "flex", gap: 6 }}>
          {seq.map((v, i) => {
            const next = { "-": "G", G: "B", B: "M", M: "-" };
            const bg = v === "G" ? C.green : v === "B" ? C.gray : v === "M" ? "#E07A6F" : C.panel2;
            return (
              <button key={i} onClick={() => {
                const s = [...seq]; s[i] = next[v]; setSeq(s);
                setForm(s.reduce((t, x) => t + (x === "G" ? 10 : x === "M" ? -10 : 0), 0));
              }} style={{
                flex: 1, padding: "8px 0", borderRadius: 6, border: `1px solid ${C.line}`,
                background: bg, color: v === "-" ? C.dim : "#10150F", cursor: "pointer",
                fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: 13,
              }}>{v}</button>
            );
          })}
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.dim, marginBottom: 4 }}>
          <span>Form / sakatlık düzeltmesi (elle de ayarlanır)</span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: form === 0 ? C.dim : form > 0 ? C.green : "#E07A6F" }}>
            {form > 0 ? "+" : ""}{form} Elo
          </span>
        </div>
        <input type="range" min={-100} max={100} step={5} value={form} onChange={(e) => setForm(+e.target.value)} style={{ width: "100%", accentColor: color }} />
      </div>
      <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: C.dim, cursor: "pointer" }}>
        <input type="checkbox" checked={host} onChange={(e) => setHost(e.target.checked)} style={{ accentColor: color }} />
        Ev sahibi avantajı (+60 Elo — ABD/Meksika/Kanada kendi sahasında)
      </label>
    </div>
  );

  const Bar = ({ label, p, color, marketP }) => (
    <div style={{ flex: 1, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: 14 }}>
      <div style={{ fontSize: 12, color: C.dim, marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 900, fontSize: 30, color }}>{pct(p)}</div>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: C.dim, marginBottom: 8 }}>adil oran {toOdds(p)}</div>
      <div style={{ height: 6, background: "rgba(255,255,255,0.07)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${p * 100}%`, height: "100%", background: color, transition: "width .4s ease" }} />
      </div>
      {marketP != null && (
        <div style={{ marginTop: 8, fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", color: p - marketP > 0.03 ? C.green : p - marketP < -0.03 ? "#E07A6F" : C.dim }}>
          piyasa {pct(marketP)} · fark {((p - marketP) * 100).toFixed(1)} puan
        </div>
      )}
    </div>
  );

  const maxCell = Math.max(...m.matrix.slice(0, 6).flatMap((r) => r.slice(0, 6)));

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Archivo', sans-serif", padding: "24px 16px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;700;900&family=IBM+Plex+Mono:wght@400;500&display=swap');
        select option { background: ${C.panel2}; }
        input[type=number]::-webkit-inner-spin-button { opacity: 1; }
      `}</style>

      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        {/* Başlık */}
        <div style={{ borderBottom: `1px dashed ${C.line}`, paddingBottom: 16, marginBottom: 20 }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: 3, color: C.gold }}>DÜNYA KUPASI 2026 · ELO + POISSON MODELİ</div>
          <h1 style={{ fontWeight: 900, fontSize: "clamp(26px, 5vw, 40px)", margin: "6px 0 0", lineHeight: 1.05 }}>Maç İhtimal Hesaplayıcı</h1>
        </div>

        {/* Takım kartları */}
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 20 }}>
          {TeamCard({ label: "TAKIM A", color: C.green, idx: idxA, setIdx: setIdxA, elo: eloA, eloKey: "A" + idxA, form: formA, setForm: setFormA, host: hostA, setHost: setHostA, seq: seqA, setSeq: setSeqA })}
          {TeamCard({ label: "TAKIM B", color: C.blue, idx: idxB, setIdx: setIdxB, elo: eloB, eloKey: "B" + idxB, form: formB, setForm: setFormB, host: hostB, setHost: setHostB, seq: seqB, setSeq: setSeqB })}
        </div>

        {/* Sıcaklık faktörü */}
        <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: "12px 16px", marginBottom: 14, display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, cursor: "pointer", fontWeight: 700 }}>
            <input type="checkbox" checked={heat.on} onChange={(e) => setHeat((h) => ({ ...h, on: e.target.checked }))} style={{ accentColor: C.gold }} />
            ☀️ Sıcak hava maçı (gündüz / sıcak şehir)
          </label>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flex: 1, minWidth: 220, opacity: heat.on ? 1 : 0.4 }}>
            <span style={{ fontSize: 12, color: C.dim, whiteSpace: "nowrap" }}>Avantaj</span>
            <input type="range" min={5} max={10} step={0.5} value={heat.val} disabled={!heat.on}
              onChange={(e) => setHeat((h) => ({ ...h, val: +e.target.value }))} style={{ flex: 1, accentColor: C.gold }} />
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: C.gold, width: 48 }}>+%{heat.val}</span>
          </div>
          <div style={{ fontSize: 11, color: C.dim, width: "100%" }}>
            Güney Amerika + Kuzey/Orta Afrika takımlarının gol beklentisine uygulanır.
            {heat.on && (HEAT_TEAMS.includes(nameA) || HEAT_TEAMS.includes(nameB)) && (
              <span style={{ color: C.gold }}> Bu maçta: {[nameA, nameB].filter((n) => HEAT_TEAMS.includes(n)).join(", ")} ☀️</span>
            )}
            {heat.on && !HEAT_TEAMS.includes(nameA) && !HEAT_TEAMS.includes(nameB) && (
              <span> Bu maçta iki takım da listede değil; etki yok.</span>
            )}
          </div>
        </div>

        {/* Beklenen gol */}
        <div style={{ textAlign: "center", fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: C.dim, marginBottom: 14 }}>
          beklenen gol — {nameA}: <span style={{ color: C.green }}>{m.lA.toFixed(2)}</span> · {nameB}: <span style={{ color: C.blue }}>{m.lB.toFixed(2)}</span>
        </div>

        {/* 1 X 2 */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
          <Bar label={`1 · ${nameA} kazanır`} p={m.pW} color={C.green} marketP={market?.h} />
          <Bar label="X · Beraberlik" p={m.pD} color={C.gray} marketP={market?.d} />
          <Bar label={`2 · ${nameB} kazanır`} p={m.pL} color={C.blue} marketP={market?.a} />
        </div>

        {/* Skor ısı haritası + en olası skorlar */}
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 24 }}>
          <div style={{ flex: 2, minWidth: 300, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: 16 }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: 2, color: C.gold, marginBottom: 10 }}>SKOR ISI HARİTASI</div>
            <div style={{ display: "grid", gridTemplateColumns: "auto repeat(6, 1fr)", gap: 3, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 }}>
              <div />
              {[0, 1, 2, 3, 4, 5].map((b) => <div key={b} style={{ textAlign: "center", color: C.blue }}>{b}</div>)}
              {[0, 1, 2, 3, 4, 5].map((a) => (
                <>
                  <div key={"r" + a} style={{ color: C.green, display: "flex", alignItems: "center" }}>{a}</div>
                  {[0, 1, 2, 3, 4, 5].map((b) => {
                    const p = m.matrix[a][b];
                    const t = p / maxCell;
                    return (
                      <div key={a + "-" + b} title={`${a}-${b}: ${pct(p)}`} style={{
                        background: `rgba(233,180,76,${0.06 + t * 0.85})`,
                        color: t > 0.5 ? "#1A1408" : C.dim,
                        borderRadius: 4, textAlign: "center", padding: "8px 0", cursor: "default",
                      }}>{(p * 100).toFixed(1)}</div>
                    );
                  })}
                </>
              ))}
            </div>
            <div style={{ fontSize: 11, color: C.dim, marginTop: 8 }}>Satır: {nameA} golü · Sütun: {nameB} golü · değerler %</div>
          </div>
          <div style={{ flex: 1, minWidth: 200, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: 16 }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: 2, color: C.gold, marginBottom: 10 }}>EN OLASI 5 SKOR</div>
            {m.top.map((s, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: i < 4 ? `1px dashed ${C.line}` : "none", fontFamily: "'IBM Plex Mono', monospace", fontSize: 14 }}>
                <span><span style={{ color: C.green }}>{s.a}</span> - <span style={{ color: C.blue }}>{s.b}</span></span>
                <span style={{ color: C.dim }}>{pct(s.p)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Piyasa karşılaştırma */}
        <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: 16, marginBottom: 20 }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: 2, color: C.gold, marginBottom: 4 }}>PİYASA ORANI KARŞILAŞTIRMASI</div>
          <div style={{ fontSize: 13, color: C.dim, marginBottom: 12 }}>Ondalık oranları gir (örn. 2.40) ya da iddaa ekranından maç satırını aşağıya yapıştır; ilk üç oran otomatik ayrıştırılır, marj temizlenip modelle kıyaslanır.</div>
          <textarea
            value={paste}
            placeholder="iddaa.com'dan kopyaladığın satırı buraya yapıştır… (örn. Türkiye - ABD  2,40  3,10  3,05)"
            onChange={(e) => {
              const v = e.target.value;
              setPaste(v);
              const nums = (v.match(/\d+[.,]\d{2}/g) || [])
                .map((s) => parseFloat(s.replace(",", ".")))
                .filter((n) => n > 1.0 && n < 100);
              if (nums.length >= 3) setOdds({ h: String(nums[0]), d: String(nums[1]), a: String(nums[2]) });
            }}
            rows={2}
            style={{ ...input, marginBottom: 12, resize: "vertical", fontSize: 13 }}
          />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {[["h", "1 (" + nameA + ")"], ["d", "X"], ["a", "2 (" + nameB + ")"]].map(([k, lbl]) => (
              <div key={k} style={{ flex: 1, minWidth: 120 }}>
                <div style={{ fontSize: 12, color: C.dim, marginBottom: 4 }}>{lbl}</div>
                <input type="number" step="0.01" min="1.01" placeholder="—" value={odds[k]}
                  onChange={(e) => setOdds((o) => ({ ...o, [k]: e.target.value }))} style={input} />
              </div>
            ))}
          </div>
          {market && (
            <div style={{ marginTop: 10, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: C.dim }}>
              bahisçi marjı: {market.vig.toFixed(1)}% · yukarıdaki kartlarda model–piyasa farkı görünüyor
            </div>
          )}
        </div>

        {/* Korner modeli */}
        <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: 16, marginBottom: 20 }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: 2, color: C.gold, marginBottom: 4 }}>KORNER MODELİ · ALT/ÜST</div>
          <div style={{ fontSize: 13, color: C.dim, marginBottom: 12 }}>
            Her takım için son maçlarındaki <strong>toplam</strong> korner verisini gir (Flashscore/Sofascore → takım → son maçlar → istatistik). Son 5 maç girilirse o kullanılır; yoksa 10 maç ortalaması; o da yoksa uluslararası ortalama 9.0 varsayılır.
          </div>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 14 }}>
            {[
              { name: nameA, color: C.green, avgK: "avgA", l5K: "last5A" },
              { name: nameB, color: C.blue, avgK: "avgB", l5K: "last5B" },
            ].map((t) => (
              <div key={t.avgK} style={{ flex: 1, minWidth: 240 }}>
                <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700, color: t.color, marginBottom: 6 }}>{t.name}</div>
                <div style={{ fontSize: 12, color: C.dim, marginBottom: 4 }}>Son 10 maç korner ortalaması (maç toplamı)</div>
                <input type="number" step="0.1" min="0" placeholder="örn. 9.4" value={corn[t.avgK]}
                  onChange={(e) => setCorn((c) => ({ ...c, [t.avgK]: e.target.value }))} style={{ ...input, marginBottom: 8 }} />
                <div style={{ fontSize: 12, color: C.dim, marginBottom: 4 }}>Son 5 maç toplam kornerleri (virgülle, öncelikli)</div>
                <input type="text" placeholder="örn. 11, 8, 9, 12, 7" value={corn[t.l5K]}
                  onChange={(e) => setCorn((c) => ({ ...c, [t.l5K]: e.target.value }))} style={input} />
              </div>
            ))}
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: C.dim, marginBottom: 10 }}>
            beklenen toplam korner: <span style={{ color: C.gold, fontWeight: 700 }}>{cornerModel.lambda.toFixed(1)}</span>
            {" "}({nameA}: {cornerModel.A.val.toFixed(1)} · {cornerModel.A.src} — {nameB}: {cornerModel.B.val.toFixed(1)} · {cornerModel.B.src})
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {cornerModel.lines.map((l) => (
              <div key={l.L} style={{ flex: 1, minWidth: 110, background: C.panel2, border: `1px solid ${C.line}`, borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: C.dim }}>{l.L} hattı</div>
                <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 900, fontSize: 18, color: l.over >= 0.5 ? C.green : C.blue }}>
                  {l.over >= 0.5 ? "ÜST " + pct(l.over) : "ALT " + pct(l.under)}
                </div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: C.dim }}>
                  Ü {toOdds(l.over)} / A {toOdds(l.under)}
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: C.dim, marginTop: 10 }}>
            Model: iki takımın maç-toplamı ortalamalarının ortalaması λ kabul edilip Poisson dağılımı uygulanır. Korner varyansı Poisson'dan biraz yüksektir (gerçekte uçlar daha olasıdır); sınıra yakın hatlarda temkinli yorumla.
          </div>
        </div>

        {/* Sarı kart modeli */}
        <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: 16, marginBottom: 20 }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: 2, color: C.gold, marginBottom: 4 }}>SARI KART MODELİ · ALT/ÜST</div>
          <div style={{ fontSize: 13, color: C.dim, marginBottom: 12 }}>
            Her takımın kendi <strong>aldığı</strong> sarı kartları gir (korner bölümünden farklı: maç toplamı değil, takımın kartları). Son 5 maç girilirse o kullanılır; yoksa 10 maç ortalaması; o da yoksa küresel ortalama 2.21 kart/takım varsayılır.
          </div>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 12 }}>
            {[
              { name: nameA, color: C.green, avgK: "avgA", l5K: "last5A" },
              { name: nameB, color: C.blue, avgK: "avgB", l5K: "last5B" },
            ].map((t) => (
              <div key={t.avgK} style={{ flex: 1, minWidth: 240 }}>
                <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700, color: t.color, marginBottom: 6 }}>{t.name}</div>
                <div style={{ fontSize: 12, color: C.dim, marginBottom: 4 }}>Son 10 maç aldığı sarı kart ortalaması</div>
                <input type="number" step="0.1" min="0" placeholder="örn. 2.4" value={cards[t.avgK]}
                  onChange={(e) => setCards((c) => ({ ...c, [t.avgK]: e.target.value }))} style={{ ...input, marginBottom: 8 }} />
                <div style={{ fontSize: 12, color: C.dim, marginBottom: 4 }}>Son 5 maçta aldığı kartlar (virgülle, öncelikli)</div>
                <input type="text" placeholder="örn. 3, 1, 2, 4, 2" value={cards[t.l5K]}
                  onChange={(e) => setCards((c) => ({ ...c, [t.l5K]: e.target.value }))} style={input} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 12, color: C.dim, marginBottom: 4 }}>Hakem profili (atama açıklanınca seç)</div>
              <select value={cards.ref} onChange={(e) => setCards((c) => ({ ...c, ref: e.target.value }))} style={{ ...input, width: "auto" }}>
                <option value="0.85">Yumuşak (×0.85)</option>
                <option value="1">Normal (×1.00)</option>
                <option value="1.2">Sert (×1.20)</option>
              </select>
            </div>
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: C.dim, cursor: "pointer", marginTop: 16 }}>
              <input type="checkbox" checked={cards.conmebol} onChange={(e) => setCards((c) => ({ ...c, conmebol: e.target.checked }))} style={{ accentColor: C.gold }} />
              Güney Amerika takımı / yüksek tansiyonlu maç (×1.15)
            </label>
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: C.dim, marginBottom: 10 }}>
            beklenen toplam sarı kart: <span style={{ color: C.gold, fontWeight: 700 }}>{cardModel.lambda.toFixed(1)}</span>
            {" "}({nameA}: {cardModel.A.val.toFixed(1)} · {cardModel.A.src} — {nameB}: {cardModel.B.val.toFixed(1)} · {cardModel.B.src} — çarpan ×{cardModel.mult.toFixed(2)})
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {cardModel.lines.map((l) => (
              <div key={l.L} style={{ flex: 1, minWidth: 110, background: C.panel2, border: `1px solid ${C.line}`, borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: C.dim }}>{l.L} hattı</div>
                <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 900, fontSize: 18, color: l.over >= 0.5 ? C.green : C.blue }}>
                  {l.over >= 0.5 ? "ÜST " + pct(l.over) : "ALT " + pct(l.under)}
                </div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: C.dim }}>
                  Ü {toOdds(l.over)} / A {toOdds(l.under)}
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: C.dim, marginTop: 10 }}>
            Model: iki takımın aldığı kart ortalamaları toplanıp hakem/bölge çarpanıyla λ elde edilir, Poisson uygulanır. Kart sayısında hakem en büyük değişkendir; eleme maçlarında ve maç sonlarında kart eğilimi artar.
          </div>
        </div>

        {/* Grup simülasyonu */}
        <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: 16, marginBottom: 20 }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: 2, color: C.gold, marginBottom: 4 }}>GRUP SİMÜLASYONU · 10.000 KOŞU</div>
          <div style={{ fontSize: 13, color: C.dim, marginBottom: 12 }}>
            Grup seç; 6 maçlık fikstür Monte Carlo ile 10.000 kez oynatılır. Ev sahipleri (ABD, Meksika, Kanada) otomatik +60 Elo alır. Sıcaklık faktörü açıksa ☀️ takımlarına simülasyonda da uygulanır.
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
            <select value={grp} onChange={(e) => { setGrp(e.target.value); setSimRes(null); }} style={{ ...input, width: "auto", fontWeight: 700 }}>
              {Object.keys(GROUPS).map((g) => <option key={g} value={g}>Grup {g} — {GROUPS[g].join(", ")}</option>)}
            </select>
            <button onClick={() => {
              const names = GROUPS[grp];
              const elos = names.map((nm) => TEAMS.find((t) => t[0] === nm)[1]);
              const mults = names.map((nm) => (heat.on && HEAT_TEAMS.includes(nm) ? 1 + heat.val / 100 : 1));
              setSimRes(simulateGroup(names, elos, 10000, mults));
            }} style={{
              padding: "10px 18px", borderRadius: 6, border: "none", background: C.gold,
              color: "#1A1408", fontWeight: 700, fontFamily: "'Archivo', sans-serif",
              fontSize: 14, cursor: "pointer",
            }}>10.000 kez simüle et</button>
          </div>
          {simRes && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'IBM Plex Mono', monospace", fontSize: 13 }}>
                <thead>
                  <tr style={{ color: C.dim, fontSize: 11 }}>
                    {["Takım", "Elo", "1.", "2.", "3.", "4.", "İlk 2", "Çıkış*"].map((h) => (
                      <th key={h} style={{ textAlign: h === "Takım" ? "left" : "right", padding: "6px 8px", borderBottom: `1px solid ${C.line}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {simRes.map((t) => (
                    <tr key={t.name}>
                      <td style={{ padding: "8px", borderBottom: `1px dashed ${C.line}`, fontFamily: "'Archivo', sans-serif", fontWeight: 700 }}>
                        {t.name}{t.host && <span style={{ color: C.gold, fontSize: 11 }}> ★ev</span>}
                      </td>
                      <td style={{ textAlign: "right", padding: "8px", borderBottom: `1px dashed ${C.line}`, color: C.dim }}>{t.elo}</td>
                      <td style={{ textAlign: "right", padding: "8px", borderBottom: `1px dashed ${C.line}` }}>{pct(t.p1)}</td>
                      <td style={{ textAlign: "right", padding: "8px", borderBottom: `1px dashed ${C.line}` }}>{pct(t.p2)}</td>
                      <td style={{ textAlign: "right", padding: "8px", borderBottom: `1px dashed ${C.line}` }}>{pct(t.p3)}</td>
                      <td style={{ textAlign: "right", padding: "8px", borderBottom: `1px dashed ${C.line}`, color: C.dim }}>{pct(t.p4)}</td>
                      <td style={{ textAlign: "right", padding: "8px", borderBottom: `1px dashed ${C.line}`, color: C.green, fontWeight: 700 }}>{pct(t.top2)}</td>
                      <td style={{ textAlign: "right", padding: "8px", borderBottom: `1px dashed ${C.line}`, color: C.gold, fontWeight: 700 }}>{pct(t.adv)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ fontSize: 11, color: C.dim, marginTop: 8 }}>
                *Çıkış = İlk 2 + üçüncülük × 8/12 (en iyi 8 üçüncü turu geçer; gruplar arası kıyas yapılmadığı için 8/12 ortalama varsayımdır).
              </div>
            </div>
          )}
        </div>

        <div style={{ fontSize: 12, color: C.dim, borderTop: `1px dashed ${C.line}`, paddingTop: 12 }}>
          Elo puanları: World Football Elo Ratings (eloratings.net), 9 Haziran 2026 + kullanıcı tarafından sağlanan değerler. Son 5 maç formu 48 takımın tamamı için gerçek maç sonuçlarından yüklü (10 Haziran 2026 itibarıyla; kupa başlayınca eskir, elle güncelle). Tüm değerler düzenlenebilir. Bu araç eğitim amaçlı bir prototiptir; bahis tavsiyesi değildir.
        </div>
      </div>
    </div>
  );
}
