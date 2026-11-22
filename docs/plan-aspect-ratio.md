# Plan: Aspect Ratio Export Kustom + Deteksi Otomatis

Status: **Selesai (fase 1–6).** Keputusan: sisi pendek tetap 1080 (1080p), hanya mode fit "Isi" (cover), preset sesuai daftar, rasio kustom 1:3 sampai 3:1.
Tanggal: 2026-11-21

## 1. Tujuan

- User bisa memilih **rasio export**: preset (9:16, 1:1, 4:5, 16:9, dst.), **kustom** (W:H), atau **Otomatis** (mengikuti rasio video yang diupload).
- **Preview** (`Player`) memakai rasio yang sama dengan hasil export.
- Tampilan lirik (ukuran font, posisi, lebar teks) tetap proporsional di semua rasio.

## 2. Kondisi saat ini

| Bagian | Lokasi | Catatan |
| --- | --- | --- |
| Ukuran komposisi | `src/remotion/Root.tsx`: `width={1080}`, `height={1920}` | Hardcoded |
| Ukuran preview | `src/app/App.tsx` + `src/lib/format.ts`: `COMPOSITION_WIDTH/HEIGHT`, wadah `aspect-[9/16] max-w-[380px]` | Hardcoded 9:16 |
| Header info | `App.tsx`: "1080 × 1920 · 9:16 Vertical" | Teks statis |
| Gaya lirik | `templates/definitions.ts`, `LyricStage.tsx`, `EmptyClipBackdrop.tsx` | Semua angka dalam px yang disetel untuk 1080×1920 (font 68px, `maxWidth` 940, padding bawah 210, dst.) |
| Video | `LyricClipVideo.tsx`: `OffthreadVideo` dengan `objectFit: 'cover'` | Crop otomatis kalau rasio berbeda |
| Deteksi metadata | `App.tsx`: elemen `<video>` tersembunyi sudah membaca `duration` | Bisa sekalian membaca `videoWidth` dan `videoHeight` |
| Render | `server.mjs` meneruskan props ke `remotion render` | Ukuran ikut komposisi |

Artinya fitur ini mudah di sisi data (tinggal membuat `width`/`height` dinamis), tapi **gaya lirik harus dibuat skala-aware**. Kalau tidak, pada rasio lain teks akan terlalu besar atau kecil, dan posisinya salah.

## 3. Desain

### 3.1 Model rasio

```ts
// src/lib/aspect.ts
type AspectMode = 'auto' | 'preset' | 'custom';

type AspectSetting = {
  mode: AspectMode;
  presetId?: string;                 // '9:16', '1:1', ...
  custom?: { w: number; h: number }; // untuk mode 'custom'
};

type OutputSize = { width: number; height: number; label: string };

resolveOutputSize(setting, videoDims | null, baseShortSide = 1080): OutputSize
```

Preset awal:

| id | Rasio | Hasil (sisi pendek 1080) | Pemakaian |
| --- | --- | --- | --- |
| `9:16` | 9:16 | 1080×1920 | TikTok, Reels, Shorts (default, sama seperti sekarang) |
| `4:5` | 4:5 | 1080×1350 | Feed Instagram |
| `1:1` | 1:1 | 1080×1080 | Kotak |
| `3:4` | 3:4 | 1080×1440 | Feed portrait |
| `16:9` | 16:9 | 1920×1080 | YouTube, landscape |
| `4:3` | 4:3 | 1440×1080 | Landscape klasik |

Aturan perhitungan ukuran:
- **Sisi pendek = 1080** (basis tetap). Sisi panjang dihitung dari rasio.
- Hasil dibulatkan ke **angka genap**, karena H.264 mewajibkan lebar dan tinggi genap.
- Batas aman: tiap sisi 240–4096 px. Rasio ekstrem (misalnya 1:10) ditolak dengan pesan jelas.

### 3.2 Mode Otomatis

- Rasio dibaca dari `videoWidth` dan `videoHeight` elemen `<video>` tersembunyi yang sekarang sudah ada, pada event `onLoadedMetadata` yang sama dengan pembacaan durasi.
- Rasio hasil deteksi **dicocokkan ke preset terdekat** dalam toleransi sekitar 3%. Contoh: 1080×1920 menjadi 9:16, dan 1920×1080 menjadi 16:9. Kalau tidak ada yang cocok (misalnya 2.39:1), pakai rasio persis dari video, dengan sisi pendek 1080.
- Label di UI menunjukkan hasil deteksi, misalnya "Otomatis (terdeteksi 9:16, 1080×1920)".
- Sebelum ada video, mode Otomatis jatuh ke 9:16.
- **Catatan:** video ponsel yang berotasi lewat metadata rotasi biasanya dilaporkan browser dengan dimensi tampilan. Ini akan diuji pada tahap verifikasi.

### 3.3 Skala gaya lirik (bagian terpenting)

Semua nilai di template dianggap ditulis untuk **sisi pendek 1080**. Komposisi menghitung:

```ts
unit = Math.min(width, height) / 1080
```

- `fontSize`, `stroke.width`, padding kotak, dan gap antar kata dikalikan `unit`.
- `maxWidth` dan padding samping menjadi **pecahan dari lebar**. Nilai sekarang: 940/1080 sekitar 87%. Dengan begitu di 16:9 teks tidak sempit.
- Offset vertikal (210 px dari bawah, 240 px dari atas) menjadi **pecahan dari tinggi**: 210/1920 sekitar 11%, dan 240/1920 sekitar 12,5%.
- Untuk 9:16 hasilnya **identik** dengan sekarang, jadi tampilan lama tidak berubah.
- `EmptyClipBackdrop` ikut diskalakan dengan cara yang sama.

Perubahan ke `LyricTemplate`: `position.offsetPx` dan `position.maxWidth` diganti `offsetRatio` dan `maxWidthRatio`. Karena template dipakai di tempat sedikit, perubahan ini kecil.

### 3.4 Fit video (ditunda)

Untuk versi ini hanya mode **Isi (cover)**: video memenuhi frame dan sisanya terpotong (perilaku sekarang). Pada mode Otomatis rasio export sama dengan video, jadi tidak ada yang terpotong. Mode **Muat (contain)** dengan latar blur ditunda ke pengembangan berikutnya.

### 3.5 Props dan komposisi

`LyricClipProps` bertambah dua field (opsional, kompatibel dengan props lama):

```ts
width?: number;   // default 1080
height?: number;  // default 1920
```

- `Root.tsx`: `calculateMetadata` mengembalikan `width` dan `height` dari props (selain `durationInFrames` yang sudah ada). Validasi dan fallback ke 1080×1920 kalau tidak valid.
- Komponen membaca ukuran lewat `useVideoConfig()`, tanpa angka tetap.

## 4. UI

### 4.1 Panel "Aspect Ratio" di studio

Diletakkan setelah "Lyric Style" sebagai "04. Aspect Ratio" (Offset menjadi 05).

- Grid chip: **Otomatis** (dengan keterangan hasil deteksi) + preset (9:16, 4:5, 1:1, 3:4, 16:9, 4:3) + **Kustom**.
- Mode Kustom: dua input angka W dan H (misalnya 21 dan 9) dengan validasi rentang. Hasil ukuran piksel ditampilkan.
- Teks ringkas: "Export: 1080×1920 (9:16)".
- Pilihan disimpan di `localStorage` (kunci `lyriccut:aspect`). Mode Otomatis dihitung ulang setiap video baru diupload. Default awal tetap preset 9:16.

### 4.2 Preview

- `Player` memakai `compositionWidth` dan `compositionHeight` dari hasil `resolveOutputSize`.
- Wadah preview memakai `aspect-ratio` dinamis (`style={{ aspectRatio: w / h }}`) dengan batas **tinggi maksimum** (misalnya 70vh) dan lebar maksimum. Rasio portrait tetap sempit, dan landscape tampil lebar tanpa meluap.
- `Player` diberi `key` berdasarkan ukuran agar render ulang bersih saat rasio berubah.
- Header "1080 × 1920 · 9:16 Vertical" menjadi dinamis (ukuran, rasio, dan label orientasi).

## 5. Perubahan server

- `/api/render` menerima `width` dan `height`. Server memvalidasi: bilangan bulat, genap, 240–4096. Nilai tidak valid diabaikan (fallback 1080×1920).
- Diteruskan ke `.render-props.json`, lalu `calculateMetadata` menentukan ukuran final.
- Nama file hasil export ikut memuat ukuran supaya mudah dibedakan, misalnya `lyric-clip-1080x1920-20261121-143052.mp4` (melanjutkan penamaan unik yang sudah ada).

## 6. File yang disentuh

| File | Perubahan |
| --- | --- |
| `src/lib/aspect.ts` (baru) | Preset, `resolveOutputSize`, pencocokan ke preset terdekat, validasi |
| `src/lib/format.ts` | Hapus `COMPOSITION_WIDTH/HEIGHT` tetap |
| `src/app/components/AspectRatioPanel.tsx` (baru) | Chip preset, input kustom |
| `src/app/App.tsx` | State aspek, baca `videoWidth/videoHeight`, kirim ke `Player` dan export, header dinamis, wadah preview dinamis |
| `src/remotion/LyricClipVideo.tsx` | Props `width`, `height` |
| `src/remotion/Root.tsx` | `calculateMetadata` mengembalikan `width` dan `height` |
| `src/remotion/templates/*` | `offsetRatio`, `maxWidthRatio` |
| `src/remotion/components/LyricStage.tsx`, `EmptyClipBackdrop.tsx` | Skala berdasarkan `unit` |
| `server.mjs` | Validasi `width`, `height`; nama file memuat ukuran |
| `README.md`, `docs/plan-lyric-templates.md` | Catatan fitur baru |

## 7. Tahapan kerja

1. **Skala-aware tanpa mengubah tampilan:** ubah template dan komponen ke `unit` dan rasio. Cek: 9:16 hasilnya identik dengan sebelumnya.
2. **Model rasio:** `aspect.ts` + props `width`/`height` + `calculateMetadata`. Uji render still pada berbagai rasio.
3. **UI dan preview:** `AspectRatioPanel`, wadah preview dinamis, header dinamis, simpan ke `localStorage`.
4. **Deteksi otomatis:** baca dimensi video, cocokkan ke preset terdekat.
5. **Integrasi export:** kirim ke server, validasi, penamaan file.
6. **Finishing:** README dan uji manual.

## 8. Verifikasi

- `npm run lint` tiap fase.
- Render still tiap preset dan satu rasio kustom untuk semua 6 template. Periksa teks tidak terpotong dan posisinya benar.
- Export video pendek di 9:16, 1:1, 16:9, lalu cek dimensi file dengan `remotion ffprobe`. Pastikan sesuai dan genap.
- Bandingkan preview dengan hasil export untuk satu rasio (posisi, ukuran, dan crop harus sama).
- Uji mode Otomatis dengan video portrait, landscape, dan kotak (dan, kalau ada, video ponsel dengan metadata rotasi).
- Uji props lama tanpa `width`/`height`: harus tetap 1080×1920.

## 9. Risiko

| # | Hal | Mitigasi |
| --- | --- | --- |
| 1 | Dimensi ganjil membuat encoder H.264 gagal | Selalu dibulatkan ke genap, divalidasi di klien dan server |
| 2 | Resolusi besar (16:9 = 1920×1080, atau rasio kustom lebar) membuat render lebih lambat dan berat memori | Batas 4096 px, sisi pendek tetap 1080 (1080p) |
| 3 | Gaya lirik terlihat salah di rasio ekstrem | Batasi rasio kustom (misalnya 1:3 sampai 3:1) |
| 4 | Metadata rotasi video ponsel membuat rasio terdeteksi terbalik | Diuji di fase 4, dengan opsi mengganti manual ke preset |
| 5 | Preview landscape terlalu besar atau meluap | Batas tinggi maksimum pada wadah preview |

## 10. Pertanyaan terbuka (sudah terjawab)

1. Resolusi: sisi pendek tetap 1080 (1080p). Pilihan kualitas menyusul nanti.
2. Fit: hanya Isi (cover) dulu. Muat (contain) ditunda.
3. Preset: 9:16, 4:5, 1:1, 3:4, 16:9, 4:3 sesuai usulan.
4. Rasio kustom: dibatasi 1:3 sampai 3:1 (sesuai usulan).

## 11. Catatan hasil implementasi

- Template memakai `offsetRatio` dan `maxWidthRatio`. `LyricStage` dan `EmptyClipBackdrop` mengalikan nilai px dengan `unit = min(lebar, tinggi) / 1080`. Karena sisi pendek selalu 1080, `unit` praktis 1; skala ini hanya berjaga untuk ukuran lain (misalnya dari Remotion Studio). Bayangan teks (`text-shadow`) tidak ikut diskalakan.
- Tampilan 9:16 diperiksa identik dengan sebelum perubahan (render still).
- Teks "9:16" pada backdrop kosong menjadi dinamis (rasio dari ukuran komposisi).
- Server menolak `width`/`height` yang ganjil, di luar 240–4096, atau bukan bilangan bulat, lalu memakai 1080×1920.
- Diuji lewat export nyata: 1920×1080 dan 1080×1350 menghasilkan dimensi yang sesuai (dicek dengan `ffprobe`), dan lebar ganjil (1081) jatuh ke 1080×1920.
- Belum diuji di browser: deteksi otomatis dari video (`videoWidth`/`videoHeight`), termasuk video ponsel dengan metadata rotasi.
