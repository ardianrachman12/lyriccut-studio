# Plan: Fitur Tambah Riwayat Lirik Manual (Manual Lyric History Input)

**Status**: ✅ Selesai (Completed)

## 1. Latar Belakang & Tujuan
Saat ini, riwayat lirik (`localStorage` history) hanya tercipta secara otomatis setelah pengguna berhasil melakukan *generate* lirik melalui Google Gemini API. 

Fitur **Manual Lyric History Input** bertujuan untuk memungkinkan pengguna memasukkan data lirik beserta timestamp (dalam format JSON atau form terstruktur) secara manual ke dalam panel riwayat/hasil. Dengan demikian, pengguna dapat:
- Menyimpan dan menggunakan kembali data lirik yang sudah pernah dibuat tanpa harus memanggil Gemini API lagi (menghemat kuota/waktu).
- Menambahkan data lirik buatan sendiri atau dari sumber eksternal yang sudah memiliki format timestamp yang sesuai.
- Mengirim langsung data manual tersebut ke Studio untuk dirender menjadi video.

---

## 2. Ruang Lingkup & Fitur

1. **Tombol "Tambah Manual" (Manual Entry Modal / Form)**:
   - Ditemukan di area panel hasil atau riwayat di halaman `LyricGeneratorPage`.
   - Membuka dialog/form sederhana atau textarea input JSON caption.
   - Kolom input: Judul/Label (opsional untuk identifikasi riwayat), dan teks JSON Captions (`Caption[]`).

2. **Validasi Format**:
   - Memanfaatkan fungsi `validateCaptionsJson` yang sudah ada di `src/lib/captions.ts` untuk memastikan format JSON timestamp valid sebelum disimpan.

3. **Penyimpanan (Storage)**:
   - Entri manual akan disimpan ke dalam `localStorage` menggunakan fungsi `saveHistory` yang sudah ada di `src/lib/lyricsHistory.ts`.
   - Diberi penanda/label khusus (misal: "Manual Entry") agar bisa dibedakan dengan hasil generate AI.

4. **Aksi (Actions)**:
   - Pengguna dapat langsung memilih (open) entri manual tersebut.
   - Pengguna dapat mengirimkannya ke Studio (*Send to Studio*) untuk langsung dipakai di Remotion Player.

---

## 3. Rencana Implementasi Teknis

### A. Komponen UI Baru (`src/app/components/ManualLyricModal.tsx` atau sejenisnya)
- Membuat komponen modal atau drawer collapsible di `LyricGeneratorPage` untuk input data manual.
- Input utama berupa:
  - Judul / Nama Lagu / Keterangan.
  - Textarea JSON Captions (dengan contoh format default).
  - Tombol Validasi & Simpan.

### B. Helper & State (`src/lib/lyricsHistory.ts` & `src/app/LyricGeneratorPage.tsx`)
- Memperbarui fungsi `createHistoryEntry` atau menambahkan fungsi `createManualHistoryEntry(title, captionsJson)` di `src/lib/lyricsHistory.ts`.
- Menambahkan state dan handler di `LyricGeneratorPage.tsx` untuk membuka modal manual input dan memproses penyimpanan ke riwayat.

---

## 4. Langkah Pengerjaan
1. Buat plan ini di `docs/plan-manual-lyric-history.md` (Selesai).
2. Buat komponen UI input manual `ManualLyricModal.tsx` (Selesai).
3. Integrasikan ke `LyricGeneratorPage.tsx` dan `HistoryPanel.tsx` (Selesai).
4. Uji coba validasi dan penyimpanan ke `localStorage` (Selesai).
