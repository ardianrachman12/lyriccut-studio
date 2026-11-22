# Plan: Template Gaya Lirik + Override Ringan + Rapikan Folder

Status: **Selesai (fase 1–6). `server.mjs` tetap di root, tidak dipindah.**
Tanggal: 2026-11-21

## 1. Tujuan

- Pilih gaya lirik lewat **template siap pakai** (sekali klik), bukan custom penuh.
- Tambah **override ringan** di atas template: ukuran font, warna utama, posisi vertikal.
- Preview (`Player`) dan hasil export (Remotion render) **identik**.
- Rapikan struktur folder supaya fitur berikutnya (overlay gambar, upload font) mudah ditambah.

Di luar cakupan (sengaja ditunda): overlay gambar, upload font sendiri, edit via Remotion Studio, schema zod.

## 2. Kondisi saat ini

| Bagian | Lokasi | Catatan |
| --- | --- | --- |
| UI app | `src/App.tsx` (609 baris) | Validasi JSON, upload, export, dan UI jadi satu file |
| Komposisi | `src/remotion/LyricClipVideo.tsx` (301 baris) | `EmptyClipBackdrop`, logika halaman caption, dan styling lirik jadi satu |
| Style lirik | Hardcoded di `LyricClipVideo.tsx` | Font Plus Jakarta Sans 68px, aktif `#38bdf8`, sudah dinyanyikan `#f8fafc`, belum `rgba(248,250,252,.72)`, scrim gradient bawah, padding bawah 210 |
| Server render | `server.mjs` (root) | Upload, render, nama output unik (timestamp) |
| Props | `LyricClipProps` | `videoSrc`, `captions`, `offsetMs`, `durationInFrames` |

Gaya yang ada sekarang akan menjadi template pertama (`sky-karaoke`), jadi tampilan lama tidak berubah.

## 3. Desain data

### 3.1 Tipe

```ts
// src/remotion/templates/types.ts
export type LyricTemplate = {
  id: string;                 // 'sky-karaoke'
  name: string;               // 'Sky Karaoke'
  font: { family: string; weight: number; letterSpacing: string; lineHeight: number };
  fontSize: number;           // px di resolusi 1080x1920
  colors: { active: string; sung: string; upcoming: string };
  stroke?: { width: number; color: string };
  shadow: { active: string; idle: string };
  scrim: { enabled: boolean; css?: string };
  position: { vertical: 'top' | 'middle' | 'bottom'; offsetPx: number; maxWidth: number };
  caps: boolean;              // huruf kapital semua
  animation: { enter: 'rise' | 'fade' | 'pop'; activeScale: number };
};

export type TemplateOverrides = {
  fontScale?: number;         // 0.1 .. 1.5, pengali terhadap fontSize template
  primaryColor?: string;      // menggantikan colors.active
  vertical?: 'top' | 'middle' | 'bottom';
};
```

### 3.2 Props baru

```ts
LyricClipProps = {
  ...existing,
  templateId?: string;            // default 'sky-karaoke'
  overrides?: TemplateOverrides;  // default {}
};
```

Dua field baru bersifat opsional, jadi `.render-props.json` lama dan kode lain tetap kompatibel.

### 3.3 Resolusi style

`resolveStyle(templateId, overrides) -> LyricTemplate` (fungsi murni di `templates/resolve.ts`).
Dipakai oleh `LyricClipVideo`, sehingga preview dan render pasti memakai logika yang sama.

## 4. Template awal (6)

| id | Nama | Ciri |
| --- | --- | --- |
| `sky-karaoke` | Sky Karaoke | Gaya sekarang: biru langit, scrim gelap bawah (default) |
| `neon-pulse` | Neon Pulse | Magenta/cyan, glow kuat, pop saat aktif |
| `clean-white` | Clean White | Putih minimalis, shadow tipis, tanpa scrim berat |
| `bold-yellow` | Bold Yellow | Kuning tebal + outline hitam, gaya TikTok |
| `retro-wave` | Retro Wave | Serif/display, oranye-ungu, huruf kapital |
| `classic-sub` | Classic Subtitle | Putih dengan kotak hitam semi-transparan, posisi bawah |

Nilai warna dan font final ditentukan saat implementasi, lalu dicek langsung di preview.

## 5. Font

- Pakai `@remotion/google-fonts` agar font termuat dengan benar saat **preview dan render**.
- Setiap template mendeklarasikan fontnya, dan modul `fonts.ts` memuat via `loadFont()`.
- **Risiko yang harus dicek di awal:** font sekarang (`Plus Jakarta Sans`, `DM Sans`) dipanggil lewat nama CSS. Perlu dipastikan apakah ia benar-benar termuat saat render Remotion, atau diam-diam jatuh ke font fallback. Kalau fallback, tampilan render lama sudah berbeda dari preview, dan itu ikut diperbaiki di sini.

## 6. UI (halaman app)

- Panel **Template**: grid kartu kecil (nama + contoh teks bergaya template). Klik untuk memilih.
- Panel **Override** (di bawah template terpilih):
  - Slider ukuran font (10%–150%).
  - Color picker warna utama + tombol "reset ke warna template".
  - Segmented control posisi: Atas / Tengah / Bawah.
- Tombol **Reset override**.
- Pilihan disimpan di `localStorage` supaya tidak hilang saat refresh.
- `handleExportVideo` mengirim `templateId` dan `overrides` ke `/api/render`.

## 7. Perubahan server

- `/api/render` menerima `templateId` dan `overrides`, divalidasi sederhana (id harus dikenal, `fontScale` dibatasi rentang, warna harus hex), lalu diteruskan ke `.render-props.json`.
- Untuk menghindari duplikasi daftar template di server dan client, server tidak perlu mengenal isi template. Cukup meneruskan `templateId` dan `overrides` apa adanya, dan `resolveStyle` fallback ke default kalau id tidak dikenal.

## 8. Struktur folder target

```
lyriccut-studio/
├─ docs/
│  └─ plan-lyric-templates.md
├─ public/                      # uploaded-clip.mp4 (+ aset lain nanti)
├─ out/                         # hasil export (nama unik)
├─ server/
│  └─ index.mjs                 # dipindah dari server.mjs
├─ src/
│  ├─ main.tsx
│  ├─ app/
│  │  ├─ App.tsx
│  │  └─ components/
│  │     ├─ VideoUploadPanel.tsx
│  │     ├─ CaptionsEditor.tsx
│  │     ├─ TemplatePicker.tsx
│  │     ├─ OverridePanel.tsx
│  │     └─ ExportButton.tsx
│  ├─ lib/
│  │  ├─ captions.ts            # validateCaptionsJson
│  │  └─ format.ts              # formatBytes, formatDurationSec
│  ├─ data/
│  │  └─ defaultCaptions.ts
│  ├─ remotion/
│  │  ├─ index.ts
│  │  ├─ Root.tsx
│  │  ├─ LyricClipVideo.tsx     # komposisi tipis: video + scrim + LyricStage
│  │  ├─ components/
│  │  │  ├─ EmptyClipBackdrop.tsx
│  │  │  └─ LyricStage.tsx
│  │  ├─ fonts.ts
│  │  └─ templates/
│  │     ├─ types.ts
│  │     ├─ resolve.ts
│  │     ├─ index.ts            # registry + daftar template
│  │     └─ *.ts                # satu file per template
│  └─ index.css
├─ server.mjs                   # dihapus setelah dipindah (lihat catatan)
└─ package.json
```

Catatan:
- `server.mjs` dipindah ke `server/index.mjs`. Script `local` di `package.json` harus diubah menjadi `node server/index.mjs`. Server memakai `process.cwd()` sebagai root, jadi path `public/` dan `out/` tetap benar selama dijalankan dari root project.
- Pemindahan server bersifat opsional, dan bisa dilewati kalau ingin perubahan minimal.
- Path `src/remotion/index.ts` tidak berubah, jadi perintah render di server aman.

## 9. Tahapan kerja

Tiap fase bisa diuji sendiri, dan tampilan tidak boleh berubah sampai fase 3.

1. **Rapikan folder (tanpa ubah perilaku)**
   - Pecah `App.tsx` dan `LyricClipVideo.tsx` sesuai struktur di atas.
   - Pindahkan `validateCaptionsJson` dan helper format ke `src/lib/`.
   - Cek: `npm run lint` bersih, preview dan export identik dengan sebelumnya.
2. **Sistem template**
   - Buat `types.ts`, `resolve.ts`, registry, dan template `sky-karaoke` dari nilai hardcoded sekarang.
   - `LyricStage` membaca style dari hasil `resolveStyle`.
   - Cek: tampilan sama persis dengan sebelum fase ini.
3. **Template tambahan + font**
   - Tambah 5 template lain, pasang `@remotion/google-fonts`, verifikasi font termuat di preview dan render.
4. **UI pemilihan + override**
   - `TemplatePicker`, `OverridePanel`, simpan ke `localStorage`.
5. **Integrasi export**
   - Kirim `templateId` dan `overrides` ke server, teruskan ke render.
   - Cek: hasil MP4 sama dengan preview untuk tiap template.
6. **Finishing**
   - Update `README.md` (struktur folder, cara menambah template).
   - Tes manual semua template + kombinasi override.

## 10. Verifikasi

- `npm run lint` (tsc) tiap akhir fase.
- Export satu video pendek per template, bandingkan dengan preview (posisi, warna, font, ukuran).
- Uji props lama (tanpa `templateId`/`overrides`) tetap render dengan tampilan default.
- Uji id template tidak dikenal, harus fallback ke `sky-karaoke` tanpa error.

## 11. Risiko dan keputusan terbuka

| # | Hal | Rencana |
| --- | --- | --- |
| 1 | Font saat render belum tentu termuat | Cek di fase 3 sebelum lanjut |
| 2 | Teks panjang bisa meluap pada ukuran font besar | Batasi `fontScale` maksimal 1.5 dan pakai `maxWidth` per template |
| 3 | Warna utama yang dipilih bisa kontras buruk dengan latar | Scrim tetap aktif di template yang butuh, dan tampilkan preview langsung |
| 4 | Pindah `server.mjs` mengubah script npm | Opsional, dikerjakan di fase 1 hanya jika disetujui |
| 5 | Daftar 6 template dan gayanya | Perlu konfirmasi selera sebelum fase 3 |

## 12. Pengembangan berikutnya (setelah ini)

- Overlay gambar (upload, drag, resize, opacity) memakai struktur `app/components` dan props `images`.
- Upload font sendiri.
- Remotion Studio dengan schema zod, dan template/override otomatis jadi form.
