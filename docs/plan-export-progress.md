# Plan: Progress Export Video + Lokasi Hasil

Status: **Selesai diimplementasi, belum di-commit.**
Tanggal: 2026-11-22

## 1. Tujuan

- UI menampilkan **progress export secara real-time**, bukan hanya spinner.
- Ada tahapan yang jelas: menyiapkan, render frame, encoding, selesai.
- Menampilkan **estimasi waktu (ETA)** dan waktu berjalan.
- Setelah selesai, UI menunjukkan:
  - nama file hasil,
  - **path absolut di server** (`out/...`),
  - tombol salin path,
  - tombol download ulang,
  - tombol **Buka folder hasil** dan **Buka Downloads** (Windows),
  - info bahwa browser juga menyimpan salinan di folder Downloads.
- Export bisa **dibatalkan** di tengah jalan.

## 2. Kondisi saat ini

| Bagian | Lokasi | Perilaku sekarang |
| --- | --- | --- |
| Tombol export | `src/app/components/ExportPanel.tsx` | Hanya berubah jadi spinner + teks "Rendering MP4 via Remotion CLI..." |
| Request export | `src/app/App.tsx` (`handleExportVideo`) | `POST /api/render`, menunggu response berupa file MP4, lalu memicu download browser |
| Render | `server.mjs` (`runRemotionRender`) | `spawn('npx', ['remotion', 'render', ...])`, progress hanya muncul di console server |
| Output | `out/` | File disimpan di `out/lyric-clip-<width>x<height>-<timestamp>.mp4` |
| Download | Browser | Disimpan ke folder Downloads default; path-nya tidak bisa dibaca dari web |
| Cancel | — | Belum ada |

Artinya: server sudah tahu progress (Remotion CLI mencetaknya), tetapi **tidak pernah dikirim ke UI**. Selain itu, response HTTP baru selesai setelah render selesai, jadi tidak ada kesempatan mengirim progress di tengah request.

## 3. Opsi pendekatan

| Opsi | Cara | Kelebihan | Kekurangan |
| --- | --- | --- | --- |
| **A. NDJSON streaming** | Satu `POST /api/render`; server mengirim baris JSON progress, lalu event `done` | Perubahan paling kecil, real-time, tidak perlu job store, cancel mudah | Tidak bisa reconnect kalau tab di-refresh |
| **B. Job API + polling** | `POST` membuat job, UI polling `GET /jobs/:id`, download terpisah | Bisa reconnect, download ulang, status tahan refresh | Kode lebih banyak, perlu job store + cleanup |
| C. Parse stdout CLI | Baca output `npx remotion render` | Tidak perlu ganti renderer | Rapuh: format progress bisa berubah, ANSI/carriage return, sulit dapat ETA yang akurat |

**Rekomendasi: Opsi A (NDJSON streaming).** Cocok untuk aplikasi lokal single-user, dan sudah cukup untuk progress + cancel + lokasi file. Opsi B bisa jadi peningkatan nanti kalau butuh resume setelah refresh.

## 4. Desain yang dipilih (Opsi A)

### 4.1 Alur

```
[UI] klik Export
   |
   v
POST /api/render  (body: props yang sekarang)
   |
   |-- event: start      { outputName, outputPath }
   |-- event: phase      { phase: "bundling" }
   |-- event: progress   { progress, renderedFrames, encodedFrames, totalFrames, etaMs }
   |-- event: progress   ...
   |-- event: done       { outputName, outputPath, downloadUrl, bytes }
   v
[UI] progress bar 100% -> tampilkan lokasi file + tombol download ulang
```

Response memakai `Content-Type: application/x-ndjson`, satu objek JSON per baris.

### 4.2 Kontrak event

```json
{"type":"start","outputName":"lyric-clip-1080x1920-20261122-143052.mp4","outputPath":"D:\\coding\\react-project\\lyriccut-studio\\out\\lyric-clip-1080x1920-20261122-143052.mp4"}
{"type":"phase","phase":"bundling"}
{"type":"progress","progress":0.42,"renderedFrames":184,"encodedFrames":150,"totalFrames":438,"stitchStage":"encoding","etaMs":18500}
{"type":"done","title":"Lagu Cinta Ku","outputName":"Lagu-Cinta-Ku-20261122-143052.mp4","outputPath":"D:\\...\\out\\Lagu-Cinta-Ku-20261122-143052.mp4","downloadUrl":"/api/render/output/Lagu-Cinta-Ku-20261122-143052.mp4","bytes":12345678}
{"type":"error","message":"Render gagal: ..."}
```

Aturan:
- `progress` bernilai 0..1.
- Event `progress` di-throttle maksimal ~10 per detik (atau saat progress berubah ≥ 0.5%).
- `error` dan `done` bersifat final; setelah itu stream ditutup.
- Kalau koneksi putus tanpa `done`, UI menganggapnya error.

### 4.3 Tahapan progress

| Phase | Rentang UI | Sumber |
| --- | --- | --- |
| `preparing` | 0–2% | Validasi body + tulis `.render-props.json` |
| `bundling` | 2–8% (indeterminate) | `bundle()` dari `@remotion/bundler` |
| `rendering` | 8–90% | `onProgress.progress` dari `renderMedia` |
| `encoding` | 90–99% | `stitchStage` / `encodedFrames` |
| `done` | 100% | `renderMedia` selesai |

ETA memakai `renderEstimatedTime` dari Remotion (ms), diformat `mm:ss`. Kalau nilainya belum tersedia, tampilkan "Menghitung...".

### 4.4 Perubahan server

Ganti `spawn npx remotion render` dengan Remotion Node API:

```js
// server/render.mjs (baru)
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';

export async function renderClip({ inputProps, outputPath, onProgress, signal }) {
  const serveUrl = await bundle({ entryPoint: 'src/remotion/index.ts' });
  const composition = await selectComposition({
    serveUrl,
    id: 'LyricClip',
    inputProps,
  });
  await renderMedia({
    composition,
    serveUrl,
    codec: 'h264',
    outputLocation: outputPath,
    inputProps,
    onProgress,
    cancelSignal: signal,
    overwrite: true,
  });
}
```

Detail:
- Tambahkan `@remotion/bundler` dan `@remotion/renderer` ke `dependencies` (saat ini hanya terpasang sebagai dependensi transitif `@remotion/cli`, versi `4.0.545`).
- `selectComposition` diperlukan agar `calculateMetadata` di `src/remotion/Root.tsx` ikut menentukan `width`, `height`, dan `durationInFrames`.
- Bundle dibuat per render supaya perubahan kode langsung terpakai saat development. Kalau terlalu lambat, bisa ditambah cache dengan invalidasi mtime.
- `/api/render` mengirim NDJSON seperti kontrak di atas.
- Batalkan render kalau client disconnect: `res.on('close')` dan belum `writableEnded` → `abortController.abort()`.
- Hapus file parsial di `out/` kalau render gagal atau dibatalkan.
- **Satu render aktif dalam satu waktu**: request kedua mendapat `409 { error: 'Render sedang berjalan.' }`.
- Route baru `GET /api/render/output/:name` untuk mengunduh hasil:
  - validasi nama dengan pola `lyric-clip-<angka>x<angka>-<timestamp>.mp4`,
  - pastikan path hasil resolve tetap di dalam `out/`,
  - pakai `serveMp4WithRange` yang sudah ada agar browser bisa seek.
- Tetap tulis `.render-props.json` untuk debugging/reproduksi (file ini sudah di-ignore).

### 4.5 Perubahan client

- Helper baru `src/lib/renderClient.ts`:
  - `startRender(payload, { onEvent, signal })`
  - membaca `response.body.getReader()`, memecah per baris, `JSON.parse`, lalu memanggil callback.
- `App.tsx`:
  - State baru: `renderProgress` (phase, percent, frames, etaMs, startedAt) dan `renderResult` (name, path, downloadUrl, bytes).
  - `AbortController` disimpan di ref; tombol Cancel memanggil `abort()`.
  - Saat `done`, picu download otomatis lewat `<a href={downloadUrl} download>` (same-origin, lewat proxy Vite), lalu simpan `renderResult`.
  - Saat `error`/`cancelled`, tampilkan pesan yang jelas.
  - Cleanup saat unmount: abort render yang masih jalan.
- `ExportPanel.tsx`:
  - Props baru: `progress`, `result`, `onCancel`, `onReveal`.
  - Saat render: progress bar + persentase + phase + frame + ETA + elapsed + tombol **Cancel**.
  - Saat selesai: kartu hasil berisi **judul** (dari event `done`), nama file hasil, path server (tombol **Copy path**), tombol **Download lagi**, tombol **Buka folder hasil** dan **Buka Downloads** (memanggil `POST /api/render/reveal`), serta catatan folder Downloads browser. Detail judul ada di [`plan-title-input.md`](plan-title-input.md).
  - Aksesibilitas: `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`.

### 4.6 Menampilkan lokasi hasil

Yang bisa ditampilkan dengan akurat:
- **Path server**: dari event `done` (`outputPath`), misalnya `D:\coding\react-project\lyriccut-studio\out\Lagu-Cinta-Ku-20261122-143052.mp4`. Ini yang paling jelas.
- **Path browser**: browser tidak memberi tahu folder download. UI hanya bisa menulis "Salinan juga diunduh ke folder Downloads browser."

Peningkatan yang dipilih:
1. **Buka folder hasil** (Windows): membuka folder `out/` dan menyorot file hasil.
2. **Buka Downloads**: membuka folder download default Windows, `%USERPROFILE%\Downloads`.
3. **Save As tidak dipakai** karena user memilih auto-download.

Implementasi:
- `POST /api/render/reveal` dengan body `{ name, target: 'output' | 'downloads' }`.
- `target: 'output'`: validasi nama file dan path resolve harus di dalam `out/`, lalu jalankan `explorer.exe /select,<path>`.
- `target: 'downloads'`: buka `path.join(os.homedir(), 'Downloads')` dengan `explorer.exe <path>`.
- Hanya untuk Windows; platform lain mengembalikan `501 { error: 'Fitur ini hanya tersedia di Windows.' }`.
- **Batasan jujur:** browser tidak memberi tahu folder download yang sebenarnya. Kalau user mengubah folder download di pengaturan browser, tombol **Buka Downloads** tetap membuka folder default Windows. Path server (`out/`) adalah satu-satunya lokasi yang bisa dipastikan.

### 4.7 Sketsa UI

```
Export Video (MP4)
┌─────────────────────────────────────────────┐
│ Merender video...                    42%    │
│ ███████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│ Frame 184/438 · Encoding · ETA 00:18        │
│ 00:12 berjalan                  [Cancel]    │
└─────────────────────────────────────────────┘

Selesai
┌─────────────────────────────────────────────┐
│ ✓ Lagu Cinta Ku                               │
│   Lagu-Cinta-Ku-20261122-143052.mp4          │
│ Server: D:\...\out\lyric-clip-...mp4  [Copy]│
│ Salinan diunduh ke folder Downloads browser │
│ [Download lagi] [Buka folder hasil] [Buka Downloads] │
└─────────────────────────────────────────────┘
```

## 5. File yang disentuh

| File | Perubahan |
| --- | --- |
| `package.json`, `package-lock.json` | Tambah `@remotion/bundler`, `@remotion/renderer` versi 4.0.545 |
| `server/render.mjs` (baru) | Bundle, `selectComposition`, `renderMedia`, progress, cancel |
| `server.mjs` | `/api/render` jadi NDJSON, route output, guard concurrency, hapus spawn CLI |
| `src/lib/renderClient.ts` (baru) | Parser NDJSON + `AbortController` |
| `src/app/App.tsx` | State progress/result, alur export baru, cancel |
| `src/app/components/ExportPanel.tsx` | Progress bar, kartu hasil, copy path, download ulang, dua tombol buka folder |
| `README.md` | Catatan fitur progress + lokasi hasil |
| `docs/plan-export-progress.md` | Dokumen ini |

## 6. Tahapan kerja

1. **Server renderer**: `server/render.mjs` + dependency baru, uji render 1 klip pendek tanpa UI.
2. **NDJSON endpoint**: ganti `/api/render`, kirim `start`/`phase`/`progress`/`done`/`error`, tambah route output.
3. **Client parser**: `renderClient.ts`, sambungkan ke `App.tsx`, progress muncul di console dulu.
4. **UI progress**: progress bar, phase, frame, ETA, elapsed.
5. **Cancel + concurrency guard**: abort, hapus file parsial, 409 untuk render kedua.
6. **Kartu hasil**: path server, copy, download ulang, catatan Downloads.
7. **Buka folder**: tombol "Buka folder hasil" dan "Buka Downloads" lewat `POST /api/render/reveal` (Windows).
8. **Finishing**: README, `npm run lint`, uji manual.

## 7. Verifikasi

- `npm run lint` tiap akhir tahap.
- Render klip 10 detik dan 60 detik: progress bergerak, persentase tidak mundur, ETA wajar.
- Cancel di tengah render: proses berhenti, file parsial hilang, UI menampilkan "dibatalkan".
- Tutup tab saat render: server membatalkan render (tidak ada proses menggantung).
- Dua tab export bersamaan: tab kedua mendapat 409.
- Setelah selesai: path server benar, tombol Copy menghasilkan path yang sama, download ulang berhasil.
- Restart server saat render: UI menampilkan error yang jelas, bukan menggantung.
- Cek file hasil dengan `ffprobe`: dimensi dan durasi sesuai.

## 8. Risiko

| Risiko | Mitigasi |
| --- | --- |
| API `@remotion/renderer` berbeda antar versi | Pin versi sama dengan `remotion` (`4.0.545`), uji render nyata |
| Bundling menambah waktu awal | Tampilkan phase `bundling`; cache bundle kalau perlu |
| Event progress terlalu sering | Throttle ~10/detik |
| Browser tidak bisa melaporkan folder download | Tampilkan path server + jelaskan folder Downloads; sediakan "Buka folder hasil" (pasti benar) dan "Buka Downloads" (default Windows) |
| Render paralel menghabiskan CPU/RAM | Batasi satu render aktif (409) |
| File parsial tertinggal | Hapus di `finally` saat error/cancel |
| Path traversal di route output | Validasi pola nama + pastikan resolve path di dalam `out/` |

## 9. Keputusan yang sudah disetujui

1. **Auto-download**: file tetap otomatis terunduh lewat browser seperti sekarang, ditambah tombol "Download lagi" di kartu hasil.
2. **Buka folder**: dua tombol — "Buka folder hasil" (`out/`, Windows) dan "Buka Downloads" (folder default Windows). Save As **tidak** dipakai.
3. **Render bersamaan**: tolak dengan `409` (satu render aktif), bukan antrekan.
4. **File di `out/`**: dibiarkan, tidak dibersihkan otomatis.
5. **Bahasa UI**: campuran, mengikuti gaya yang sudah ada.

## 10. Catatan implementasi

- Remotion `4.0.545` tidak menerima `AbortSignal` langsung. `server/render.mjs` memakai `makeCancelSignal()` dan menjembatani `AbortController` dari server ke callback `cancel()`.
- `stitchStage` bernilai `"encoding"` sejak awal render (encoding berjalan paralel dengan rendering). Fase UI ditentukan dari `renderedFrames >= totalFrames`, bukan dari `stitchStage`.
- Kalau browser yang membatalkan, `fetch` menolak dengan `AbortError` dan UI menandai render sebagai dibatalkan. Kalau koneksi putus, server mengirim event `cancelled`.
- File MP4 parsial dihapus di blok `finally` saat render gagal atau dibatalkan; file yang berhasil dibiarkan di `out/`.
- Route output memvalidasi pola nama dan memastikan path tetap di dalam `out/` sebelum melayani file dengan HTTP Range.
