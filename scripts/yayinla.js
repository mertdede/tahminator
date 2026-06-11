// Tek tıkla yayınla: "npm run yayinla" bunu çalıştırır.
// 1) Güncel veriyi çeker (public/veri/ tazelenir)
// 2) Değişiklik varsa git'e kaydeder
// 3) GitHub'a gönderir → Vercel siteyi otomatik yeniler
//
// Hiçbir veri değişmediyse boş commit/push yapmaz, sadece bilgilendirir.

import { execSync } from "node:child_process";

// Bir komutu çalıştırır; çıktıyı doğrudan ekrana basar.
function calistir(komut) {
  execSync(komut, { stdio: "inherit" });
}

// Bir komutu çalıştırıp çıktısını metin olarak döndürür (ekrana basmaz).
function ciktiAl(komut) {
  return execSync(komut, { encoding: "utf8" }).trim();
}

console.log("\n=== TAHMINATOR — Tek Tıkla Yayınla ===\n");

// 1) Güncel veriyi çek
console.log("Adım 1/3: Güncel veri çekiliyor…\n");
calistir("node scripts/veri-guncelle.js");

// 2) public/veri/ içinde değişiklik var mı bak
console.log("\nAdım 2/3: Değişiklikler kontrol ediliyor…");
const degisiklik = ciktiAl("git status --porcelain public/veri");

if (!degisiklik) {
  console.log("\nVeride yeni bir değişiklik yok — site zaten güncel.");
  console.log("Yayınlamaya gerek kalmadı.\n");
  process.exit(0);
}

// Değişen dosyaları sade biçimde göster.
// "git status --porcelain" satırları "XY yol" biçimindedir (XY = durum kodu).
// İlk boşluğa kadar olan durum kodunu atıp sadece dosya yolunu gösteririz.
console.log("\nDeğişen veri dosyaları:");
for (const satir of degisiklik.split("\n")) {
  const yol = satir.trim().replace(/^\S+\s+/, "");
  console.log("  • " + yol);
}

// 3) Commit + push
console.log("\nAdım 3/3: GitHub'a gönderiliyor…\n");
const tarih = new Date().toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" });
calistir("git add public/veri");
calistir(`git commit -m "veri güncellendi (${tarih})"`);
calistir("git push");

console.log("\n=== Bitti! ===");
console.log("Site birkaç dakika içinde otomatik yenilenecek:");
console.log("https://tahminator-ten.vercel.app/\n");
