# Dünya Kupası 2026 Tahmin Uygulaması

## Proje nedir?
2026 Dünya Kupası maçları için istatistiksel tahmin üreten kişisel bir web uygulaması.
Claude.ai'da prototip olarak geliştirildi; bu klasördeki `dunya-kupasi-tahmin.jsx`
çalışan prototiptir ve modelin TEK DOĞRU KAYNAĞIDIR. Yeni uygulama bu modeli
birebir korumalı, üzerine canlı veri katmanı eklemelidir.

Kullanıcı kodlama bilmiyor; her adımı sade Türkçeyle açıkla, jargonu tanımla,
büyük değişikliklerden önce planı özetleyip onay al.

## Model matematiği (DEĞİŞTİRME — kalibre edilmiş durumda)
- Elo farkı: d = (eloA + formA + evSahibiA*60) − (eloB + formB + evSahibiB*60)
- Beklenen gol: λA = min(1.32 · e^(0.0019·d) · sıcaklıkA, 5.5); λB simetrik
- Skor dağılımı: bağımsız Poisson, 0–10 gol matrisi → 1/X/2, skor ısı haritası, ilk 5 skor
- Form: son 5 maç, G=+10 / B=0 / M=−10 Elo; elle ±100 ince ayar kaydıracı
- Ev sahibi avantajı: ABD, Meksika, Kanada kendi sahasında +60 Elo
- Sıcaklık faktörü (kullanıcı hipotezi): sıcak hava maçında şu takımların λ'sı
  ×(1 + %5–10): Arjantin, Brezilya, Kolombiya, Ekvador, Uruguay, Paraguay,
  Fas, Cezayir, Tunus, Mısır, DR Kongo. Varsayılan kapalı; kaydıraç 5–10.
- Piyasa kıyası: ondalık oranlar → 1/oran, toplam marja bölünerek adil olasılık;
  model − piyasa farkı ±3 puandan büyükse vurgulanır
- Korner modeli: takım başına maç-TOPLAMI korner ortalaması; λ = (ortA+ortB)/2,
  Poisson; hatlar 7.5–11.5; veri yoksa varsayılan 9.0
- Sarı kart modeli: takımın KENDİ aldığı kart ortalaması; λ = (A+B) × hakem
  çarpanı (0.85/1.00/1.20) × CONMEBOL/tansiyon (1.15); hatlar 2.5–6.5; varsayılan 2.21/takım
- Grup simülasyonu: 6 maçlık fikstür Monte Carlo 10.000 koşu; puan→averaj→atılan
  gol→rastgele sıralama; Çıkış = P(ilk2) + P(3.)·8/12 (yaklaşım — bilinen sınırlama)

## Veri kaynakları
1. **Elo:** eloratings.net — `https://www.eloratings.net/World.tsv` (ham TSV).
   Takım adlarını jsx'teki Türkçe adlara eşleyen bir sözlük gerekir.
2. **Fikstür / istatistik / oranlar:** API-Football v3 (api-sports.io)
   - Base URL: `https://v3.football.api-sports.io/`
   - Kimlik: her istekte `x-apisports-key` HTTP başlığı
   - Anahtar `.env` dosyasında `APISPORTS_KEY` olarak tutulur; ASLA koda gömme,
     ASLA git'e commit etme (`.gitignore`'a `.env` ekle)
   - ÜCRETSİZ PLAN GÜNDE 100 İSTEK: sonuçları diske JSON olarak önbelleğe al
     (örn. `cache/` klasörü, günde 1 tazeleme); her sayfa yüklemesinde API çağırma
3. **iddaa oranları:** API yok; prototipteki kopyala-yapıştır ayrıştırıcı korunur
   (virgüllü ondalık "2,40" formatını tanır).
4. Prototipteki gömülü TEAMS / GROUPS / FORM_DATA değerleri ÇEVRİMDIŞI YEDEK
   olarak kalsın; canlı veri alınamazsa onlara düşülsün (9–10 Haziran 2026 anlık görüntüsü).

## Resmî gruplar (5 Aralık 2025 kurası) — jsx'teki GROUPS sabiti doğrudur
A: Meksika, G. Afrika, G. Kore, Çekya · B: Kanada, Bosna-Hersek, Katar, İsviçre
C: Brezilya, Fas, Haiti, İskoçya · D: ABD, Paraguay, Avustralya, Türkiye
E: Almanya, Curaçao, Fildişi Sahili, Ekvador · F: Hollanda, Japonya, İsveç, Tunus
G: Belçika, Mısır, İran, Y. Zelanda · H: İspanya, Yeşil Burun, S. Arabistan, Uruguay
I: Fransa, Irak, Norveç, Senegal · J: Arjantin, Cezayir, Avusturya, Ürdün
K: Portekiz, DR Kongo, Özbekistan, Kolombiya · L: İngiltere, Hırvatistan, Gana, Panama

## Teknik tercihler
- Vite + React, tek sayfa; model saf fonksiyonlar halinde `src/model/` altında
  (UI'dan ayrı, test edilebilir)
- Veri çekme Node script'i: `npm run veri-guncelle` → cache/*.json üretir
- Arayüz Türkçe; mevcut koyu tema korunur (zemin #0C120E, panel #121A14,
  altın vurgu #E9B44C, yeşil #7BD389, mavi #6FB7E0, Archivo + IBM Plex Mono)
- Localde `npm run dev` ile çalışır; dağıtım (Vercel vb.) ileriki faz

## Yol haritası
1. Faz: jsx prototipi Vite projesine taşı, aynen çalışır hale getir
2. Faz: Elo'yu eloratings.net'ten, fikstür+form+korner+kart istatistiklerini
   API-Football'dan çeken günlük güncelleme script'i + önbellek
3. Faz: maç günü görünümü (günün maçları otomatik listelenir, tek tıkla hesap)
4. Faz: dağıtım ve oran-model farkı geçmişi (modelin isabet takibi)

## İlkeler
- Eğitim amaçlı kişisel araç; bahis tavsiyesi değildir, arayüzdeki uyarı kalır
- Veri uydurma: kaynak yoksa alanı boş bırak ve kullanıcıya söyle
- Her model değişikliğinde eski/yeni çıktıyı aynı örnek maçta kıyaslayıp göster
