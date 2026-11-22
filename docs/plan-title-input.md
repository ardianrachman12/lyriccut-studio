# Plan: Input Judul sebagai Nama File Export

Status: **Selesai diimplementasi, belum di-commit.**
Tanggal: 2026-11-22

## 1. Tujuan

- Ada input **Judul** di workspace Studio.
- Judul dipakai sebagai **nama file MP4 hasil export**.
- Nama file tetap aman di Windows (tanpa karakter terlarang, tanpa path traversal, tidak menimpa file lama).
- Judul ikut tersimpan di `.render-props.json` untuk debugging dan ditampilkan di kartu hasil.

## 2. Kondisi saat ini

| Bagian | Lokasi | Perilaku sekarang |
| --- | --- | --- |
| Nama file | `server.mjs` → `makeOutputName(size)` | Selalu `lyric-clip-<w>x<h>-<yyyymmdd>-<hhmmss>.mp4` |
| Payload export | `App.tsx` → `payload: LyricClipProps` | Tidak ada field judul |
| Tipe props video | `src/remotion/LyricClipVideo.tsx` | `LyricClipProps` belum punya `title` |
| Validasi nama | `server.mjs` → `OUTPUT_NAME_PATTERN`, `safeOutputPath()` | Hanya menerima pola `lyric-clip-...` lama |
| Download ulang / reveal | `/api/render/output/:name`, `/api/render/reveal` | Mengandalkan `safeOutputPath()` |
| Auto-download | `App.tsx` → `renderResult.outputName` | Mengambil nama dari event `done` server |

Jadi perubahan utamanya ada di server (pembuatan nama + validasi) dan UI (input + kartu hasil).

## 3. Desain yang diusulkan

### 3.1 UI

- Komponen baru `src/app/components/TitleInput.tsx`:
  - label **`06. Title**` (mengikuti gaya campuran UI),
  - `<input type="text">` dengan placeholder `Judul lagu / project`,
  - maksimal 60 karakter,
  - preview nama file ditampilkan di bawah input (slug + placeholder timestamp).
- State di `App.tsx`: `title`, **hanya untuk sesi ini** (tidak disimpan ke localStorage).
- `handleResetWorkspace` mengosongkan `title`.
- Export tetap bisa diklik walaupun judul kosong (fallback ke `lyric-clip`).

### 3.2 Payload

Tambahkan field opsional ke `LyricClipProps`:

```ts
export type LyricClipProps = {
  // ...field existing
  title?: string;
};
```

`App.tsx` mengirim `title` di payload `startRender`. `server.mjs` menerimanya, menyimpannya ke `.render-props.json`, lalu memakainya untuk nama file.

### 3.3 Sanitasi nama file (server)

`sanitizeTitle(title)` + `makeOutputName(title)` melakukan:

1. `trim()`; kalau kosong → `lyric-clip`.
2. Ganti karakter terlarang Windows `< > : " / \ | ? *` dan karakter kontrol dengan `-`.
3. Ganti spasi beruntung dan `-` beruntung menjadi satu `-`.
4. Batasi panjang maksimal 60 karakter sebelum timestamp.
5. Tolak/awali nama perangkat Windows: `CON`, `PRN`, `AUX`, `NUL`, `COM1`–`COM9`, `LPT1`–`LPT9`.
6. Hasil akhir:

```
<slug>-<yyyymmdd>-<hhmmss>.mp4
```

Contoh:

| Judul | Nama file |
| --- | --- |
| `Lagu Cinta Ku` | `Lagu-Cinta-Ku-20261122-201328.mp4` |
| `Live: Session #1?` | `Live-Session-1-20261122-201328.mp4` |
| `   ` | `lyric-clip-20261122-201328.mp4` |
| `Judul yang sangat panjang ...` | dipotong 60 karakter + timestamp |

**Timestamp tetap dipertahankan** supaya dua export dengan judul sama tidak menimpa file lama. (Bisa diubah kalau diinginkan — lihat pertanyaan terbuka.)

### 3.4 Validasi route

`OUTPUT_NAME_PATTERN` diganti dari pola lama menjadi pola slug + timestamp, masih dengan flag Unicode supaya judul beraksara non-Latin tetap bisa:

```js
const OUTPUT_NAME_PATTERN = /^[\p{L}\p{N}._-]{1,60}-\d{8}-\d{6}\.mp4$/u;
```

`safeOutputPath()` tetap dipakai oleh route download dan reveal, jadi proteksi path traversal tidak berubah.

`downloadUrl` di event `done` perlu di-encode:

```js
downloadUrl: `/api/render/output/${encodeURIComponent(outputName)}`
```

### 3.5 Kartu hasil

Kartu hasil di `ExportPanel.tsx` saat ini menampilkan `outputName` dan `outputPath`. Diubah menjadi:

- baris pertama: judul (atau `lyric-clip` kalau kosong),
- baris kedua: nama file asli,
- baris berikutnya: path server + tombol yang sudah ada.

`RenderResult` mendapat field `title` dari event `done`, supaya kartu hasil menampilkan judul yang benar-benar dipakai server.

## 4. File yang disentuh

| File | Perubahan |
| --- | --- |
| `src/app/components/TitleInput.tsx` (baru) | Input judul + preview nama file |
| `src/app/App.tsx` | State `title` (sesi saja), reset, payload, pemasangan `TitleInput` |
| `src/remotion/LyricClipVideo.tsx` | Tambah `title?: string` di `LyricClipProps` |
| `src/app/components/ExportPanel.tsx` | Tampilkan judul di kartu hasil |
| `src/lib/renderClient.ts` | `title` di `RenderResult` dan tipe event `done` |
| `server.mjs` | `sanitizeTitle()`, `makeOutputName(title)`, pattern baru, encode downloadUrl, simpan title ke props |
| `README.md` | Langkah export menyebut input judul |
| `docs/plan-title-input.md` | Dokumen ini |

## 5. Tahapan kerja

1. **UI input**: `TitleInput.tsx`, state `title` (sesi saja), reset.
2. **Payload & tipe**: `title` masuk `LyricClipProps` dan payload render.
3. **Server**: sanitasi + pola nama baru + `encodeURIComponent` + tulis `.render-props.json`.
4. **Kartu hasil**: tampilkan judul dan nama file.
5. **Finishing**: README, `npm run lint`, `npm run build`, uji render nyata.

## 6. Verifikasi

- Judul normal (`Lagu Cinta Ku`) → file di `out/` bernama sesuai slug + timestamp.
- Judul mengandung `:\/|?*<>"` → karakter dibersihkan, tidak ada error di Explorer.
- Judul kosong/spasi saja → fallback `lyric-clip-...`.
- Judul sangat panjang → dipotong, masih valid, tidak melebihi batas.
- Judul `CON` / `PRN` / `COM1` → tidak dipakai sebagai nama dasar.
- Judul Unicode (mis. `Lagu 🎶` atau aksara non-Latin) → tetap aman.
- Dua export dengan judul sama → dua file berbeda karena timestamp.
- Tombol **Download lagi** dan **Buka folder hasil** tetap berfungsi dengan nama baru.
- `npm run lint` dan `npm run build` lolos.

## 7. Risiko

| Risiko | Mitigasi |
| --- | --- |
| Nama file terlalu panjang | Batasi 60 karakter + timestamp |
| Karakter khusus Windows bikin error | Sanitasi ketat di server, bukan di client saja |
| Path traversal lewat judul | Judul hanya dipakai sebagai basename; `safeOutputPath` tetap memvalidasi |
| Unicode tidak lolos regex | Gunakan flag `u` dan `\p{L}` / `\p{N}` |
| Timestamp sama dalam detik yang sama | Tetap ada risiko; bisa ditambah counter jika diperlukan |
| Client dan server sanitasi beda | Sanitasi **hanya di server** sebagai sumber kebenaran; client hanya preview |

## 8. Keputusan yang sudah disetujui

1. Judul **tidak dirender di video**; dipakai hanya untuk nama file dan ditampilkan di UI.
2. Format nama: `<judul>-<timestamp>.mp4`, timestamp tetap dipertahankan.
3. Spasi diganti `-`.
4. Judul **opsional**; kosong → fallback `lyric-clip`.
5. Judul **cukup untuk sesi ini**, tidak disimpan di localStorage.
6. Label input: **Title**.

## 9. Catatan implementasi

- `TitleInput.tsx` hanya menampilkan **preview** slug. Sanitasi final tetap dilakukan di `server.mjs` supaya tidak ada perbedaan aturan antara client dan server.
- `title` ikut dikirim di payload `LyricClipProps`, disimpan ke `.render-props.json`, dan dikirim kembali lewat event `done` supaya kartu hasil menampilkan judul yang benar-benar dipakai.
- `downloadUrl` di-encode dengan `encodeURIComponent()` agar nama file beraksara non-Latin tetap bisa diunduh.
- `OUTPUT_NAME_PATTERN` sekarang menerima huruf/angka Unicode, titik, garis bawah, dan tanda hubung, diikuti timestamp. `safeOutputPath()` masih dipakai oleh route download dan reveal.
