# Plan: Halaman Generate Lirik (Gemini)

Status: **Draft, belum dikerjakan**
Tanggal: 2026-11-21

## 1. Tujuan

Halaman terpisah untuk menghasilkan JSON caption (word-level, sama formatnya dengan editor di studio) dari:

- **Audio** (klip yang dipakai di video), dan
- **Lirik lengkap** yang ditempel user.

Gemini mendengarkan audio, mencocokkan dengan lirik, lalu mengembalikan `startMs`, `endMs`, `timestampMs`, `confidence` per kata. Hasilnya bisa dikirim ke editor studio dengan satu klik.

Prompt yang dipakai adalah prompt dari user. Placeholder `[TEMPEL LIRIK LAGU LENGKAP DI SINI]` diganti dengan lirik dari input halaman.

## 2. Kelayakan dan batasan (jujur)

- **Bisa dikerjakan.** `@google/genai` (v2.32.0) sudah terpasang, `GEMINI_API_KEY` sudah ada di `.env.example`, dan `metadata.json` sudah mendeklarasikan `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API`.
- **Akurasi timestamp tidak dijamin.** Model bahasa tidak sepresisi forced alignment (misalnya Whisper atau aligner khusus). Pada klip panjang, waktu kata bisa meleset ratusan ms atau drift. Karena itu hasil diperlakukan sebagai **draf**:
  - Tetap ada slider Offset di studio.
  - JSON bisa diedit manual sebelum export.
  - Ada validasi dan normalisasi otomatis (bagian 6).
- Nilai `confidence` dari model bukan angka terukur. Nilainya hanya dipakai agar format tetap sesuai `@remotion/captions`.
- Kalau akurasi ternyata kurang, ada jalur cadangan: `@remotion/openai-whisper` sudah ada di `node_modules` (belum dipakai) untuk transkripsi dengan timestamp kata, lalu lirik dicocokkan ke hasilnya. Ini **di luar cakupan** plan ini.

## 3. Keamanan API key

- Key hanya dibaca di **server** (`process.env.GEMINI_API_KEY`). Tidak boleh ada di bundle client, jadi jangan pakai awalan `VITE_`.
- `.env` sudah di-ignore oleh `.gitignore` (`.env*`, kecuali `.env.example`).
- `server.mjs` memuat `.env` lewat `dotenv` (sudah jadi dependency).
- Saat ini `server.mjs` memakai CORS `*` dan `listen(PORT)` tanpa host, artinya bisa diakses dari perangkat lain di jaringan yang sama. Karena endpoint baru memakai kuota API key, perlu diperketat:
  - `listen(PORT, '127.0.0.1')`.
  - CORS dibatasi ke `http://localhost:3000` / `http://127.0.0.1:3000`.
- Error dari Gemini diteruskan ke client tanpa membocorkan key atau header request.

## 4. Alur

```
[Halaman Generate]
  1. Pilih/Upload audio (atau pakai klip yang sudah diupload di studio)
  2. Tempel lirik lengkap
  3. Klik "Generate"
        |
        v
POST /api/lyrics/generate   (server.mjs)
  a. Siapkan audio (lihat bagian 5)
  b. Kirim audio + prompt (lirik disisipkan) ke Gemini
  c. Terima JSON, validasi, normalisasi
        |
        v
[Halaman Generate]
  4. Tampilkan hasil (JSON + ringkasan: jumlah kata, durasi tercakup)
  5. Aksi: Copy, Download .json, "Kirim ke Studio"
```

"Kirim ke Studio" menyimpan JSON ke `localStorage` (`lyriccut:captions`) dan pindah ke halaman studio, yang membacanya saat load dan mengisi editor Captions JSON.

## 5. Penanganan audio

Prompt user bicara tentang "file audio", sedangkan alur app sekarang mengunggah **MP4**. Opsi:

| Opsi | Cara | Kelebihan | Kekurangan |
| --- | --- | --- | --- |
| A | Kirim MP4 langsung ke Gemini | Paling sederhana | Ukuran upload besar, lebih lambat |
| B | Ekstrak audio ke MP3 dulu dengan ffmpeg bawaan Remotion (`npx remotion ffmpeg`), kirim MP3 | Upload kecil, cepat, sesuai maksud prompt | Satu langkah tambahan di server |
| C | User upload file audio terpisah | Fleksibel (mis. vokal saja) | Harus upload dua kali |

**Rekomendasi:** B sebagai default untuk klip dari studio, plus C sebagai opsi (input file audio langsung di halaman Generate).

Pengiriman ke Gemini:
- Audio di bawah sekitar 20 MB: kirim inline (base64).
- Lebih besar: upload lewat Gemini Files API, lalu rujuk file tersebut.
- Durasi audio dihitung di server (dari ffmpeg/ffprobe atau metadata) dan dipakai untuk validasi di bagian 6.

## 6. Output: jaminan format

- Pakai **structured output** (`responseMimeType: 'application/json'` + `responseSchema` berupa array objek `{text, startMs, endMs, timestampMs, confidence}`). Ini menjamin JSON valid, lebih andal daripada hanya meminta "tanpa teks pembuka" di prompt.
- Suhu rendah (`temperature` sekitar 0 sampai 0.2) agar hasil lebih konsisten.
- **Normalisasi di server** setelah respons diterima:
  1. Urutkan berdasarkan `startMs`.
  2. Paksa `endMs >= startMs`, dan `startMs` tidak mundur dibanding `endMs` kata sebelumnya.
  3. Batasi `endMs` ke durasi audio.
  4. `timestampMs` diisi tengah rentang jika kosong atau di luar rentang.
  5. Aturan spasi: kata pertama baris tanpa spasi, kata berikutnya diawali satu spasi. (Pembatas baris diambil dari susunan lirik asli.)
  6. `confidence` dibatasi 0 sampai 1.
- Hasil akhir dilewatkan ke `validateCaptionsJson` yang sudah ada di `src/lib/captions.ts`. Kalau gagal, server mencoba **satu kali ulang**, lalu mengembalikan error yang jelas.
- Peringatan non-fatal di UI: misalnya "X kata dari lirik tidak terdeteksi" atau "audio berakhir sebelum lirik habis", dan itu wajar karena prompt memang meminta bagian lirik di luar klip diabaikan.

## 7. Prompt

- Disimpan di file sendiri: `server/prompts/lyricTiming.mjs`, sebagai fungsi `buildLyricTimingPrompt(lyrics)`.
- Isi prompt mengikuti teks dari user apa adanya. Perubahan yang diusulkan, semuanya kecil:
  - Lirik dibungkus pembatas `"""` seperti aslinya, dan ditegaskan bahwa isinya hanya **data**, bukan instruksi, supaya teks di dalam lirik tidak dianggap perintah.
  - Instruksi "kembalikan HANYA array JSON" dipertahankan, tapi sekarang dijamin juga oleh `responseSchema`.
- Batas panjang lirik (misalnya 20.000 karakter) divalidasi di server.

## 8. Struktur file

```
lyriccut-studio/
├─ docs/plan-lyric-generator.md
├─ server.mjs                         # tambah route /api/lyrics/generate, bind 127.0.0.1, CORS terbatas
├─ server/
│  ├─ gemini.mjs                      # client Gemini, kirim audio, structured output, retry
│  ├─ audio.mjs                       # ekstrak audio (ffmpeg Remotion), durasi, ukuran
│  ├─ normalizeCaptions.mjs           # langkah normalisasi bagian 6
│  └─ prompts/lyricTiming.mjs         # buildLyricTimingPrompt(lyrics)
└─ src/
   ├─ main.tsx                        # pilih halaman berdasarkan hash (#/lyrics)
   └─ app/
      ├─ App.tsx                      # studio: baca captions dari localStorage saat load
      ├─ LyricGeneratorPage.tsx       # halaman baru
      └─ components/
         ├─ AudioSourcePicker.tsx
         ├─ LyricsInput.tsx
         └─ GeneratedResult.tsx
```

Routing: cukup **hash routing** sederhana (`#/` studio, `#/lyrics` generator), jadi tidak perlu menambah dependency router. Header studio dan generator saling menaut.

`server.mjs` hanya mengimpor modul di `server/`, jadi file server utama tidak membengkak. Script `npm run local` tidak berubah.

## 9. Konfigurasi

- `.env` (tidak masuk git): `GEMINI_API_KEY=...`
- `.env.example`: tambah `GEMINI_MODEL=` (opsional).
- **Model dibuat bisa dikonfigurasi** lewat `GEMINI_MODEL`. Nama model default **belum ditentukan**: saya cek daftar model yang tersedia untuk key tersebut saat implementasi (bukan ditebak sekarang), lalu pilih model yang mendukung input audio.
- Server menolak start fitur ini dengan pesan jelas jika `GEMINI_API_KEY` kosong atau masih `MY_GEMINI_API_KEY`.

## 10. UI halaman Generate

- Kolom kiri: sumber audio, textarea lirik (hitungan karakter), tombol **Generate** (disabled saat kosong atau sedang proses).
- Kolom kanan: hasil JSON (read-only, bisa diformat), ringkasan (jumlah kata, rentang waktu), peringatan, serta tombol Copy / Download / Kirim ke Studio.
- State loading dengan teks jelas ("Mengunggah audio", "Gemini sedang menganalisis"). Panggilan bisa memakan puluhan detik, jadi ada tombol **Batal** (AbortController).
- Pesan error dalam Bahasa Indonesia untuk kasus umum: key kosong, kuota habis, audio terlalu besar, respons tidak valid.

## 11. Tahapan kerja

1. **Server dasar:** `dotenv`, bind `127.0.0.1`, CORS terbatas, modul `server/gemini.mjs` + endpoint dengan audio kecil inline. Uji dengan klip pendek.
2. **Audio:** ekstraksi MP3 lewat ffmpeg Remotion, Files API untuk file besar, hitung durasi.
3. **Output:** `responseSchema`, normalisasi, validasi, retry sekali.
4. **Halaman:** hash routing, `LyricGeneratorPage` dan komponennya.
5. **Integrasi studio:** "Kirim ke Studio" lewat `localStorage`.
6. **Finishing:** `.env.example`, README, uji manual dengan beberapa lagu (klip pendek, klip panjang, lirik lebih panjang dari klip, vokal bersahutan).

## 12. Verifikasi

- `npm run lint` tiap fase.
- Uji endpoint tanpa key: harus error jelas, bukan crash.
- Uji JSON hasil melewati `validateCaptionsJson` dan tampil di Player studio.
- Bandingkan sebagian timestamp dengan audio secara manual (mendengar, bukan hanya melihat angka), dan catat rata-rata selisih sebagai gambaran akurasi.
- Pastikan key tidak muncul di hasil `vite build` (`dist/`) maupun di respons API.

## 13. Pertanyaan terbuka

1. **Sumber audio:** opsi B (ekstrak dari klip studio) + C (upload audio terpisah), atau salah satu saja?
2. **Model Gemini:** ada preferensi? Kalau tidak, saya pilih model terbaru yang mendukung audio dan tersedia di key kamu.
3. **Halaman:** hash routing dalam app yang sama (rekomendasi), atau halaman benar-benar terpisah (file HTML lain)?
4. **Akurasi:** kalau hasil Gemini kurang presisi, apakah mau jalur cadangan Whisper nanti?
