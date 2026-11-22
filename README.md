# 🎬 LyricCut Studio

LyricCut Studio adalah aplikasi web untuk membuat video lirik secara otomatis dan profesional. Proyek ini menggabungkan kekuatan **Remotion** untuk rendering video berbasis React dan **Google Gemini AI** untuk sinkronisasi lirik otomatis yang presisi.

---

## ✨ Fitur Utama

- **🤖 AI Lyric Sync**: Menghasilkan timestamp lirik secara otomatis dari file audio menggunakan Google Gemini AI (Gemini 2.0 Flash Lite).
- **📺 Live Preview**: Lihat perubahan gaya, posisi, dan lirik secara real-time melalui Remotion Player yang terintegrasi.
- **🎨 Kustomisasi Gaya**: Berbagai pilihan template lirik, pengaturan skala font, warna primer, dan posisi vertikal yang fleksibel.
- **📱 Dukungan Berbagai Rasio**: Preset untuk Shorts/Reels (9:16), Instagram (4:5), Square (1:1), hingga Widescreen (16:9).
- **🚀 Export MP4**: Rendering video hasil akhir langsung menjadi file MP4 menggunakan server lokal Node.js.
- **📝 Editor JSON**: Kemampuan untuk mengedit manual hasil sinkronisasi lirik untuk mencapai presisi maksimal.
- **🕒 Offset Control**: Geser seluruh waktu lirik dengan mudah jika terdapat delay pada audio.

---

## 🛠️ Teknologi yang Digunakan

- **Frontend**: [React 19](https://react.dev/), [Vite](https://vitejs.dev/), [Tailwind CSS](https://tailwindcss.com/)
- **Video Engine**: [Remotion](https://www.remotion.dev/)
- **AI**: [Google Generative AI (Gemini)](https://ai.google.dev/)
- **Backend**: Node.js (HTTP Server)
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 🚀 Memulai (Local Setup)

### Prasyarat

- [Node.js](https://nodejs.org/) (versi terbaru direkomendasikan)
- [Bun](https://bun.sh/) atau NPM
- Google Gemini API Key (Dapatkan di [Google AI Studio](https://aistudio.google.com/))

### Instalasi

1. **Clone repositori**
2. **Instal dependensi**:
   ```bash
   npm install
   ```
3. **Konfigurasi Environment**:
   Salin file `.env.example` menjadi `.env`:
   ```bash
   cp .env.example .env
   ```
   Lalu masukkan API Key Gemini Anda:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

### Menjalankan Aplikasi

Gunakan perintah berikut untuk menjalankan frontend dan backend secara bersamaan:

```bash
npm run local
```

- **Frontend**: `http://localhost:5173` (script `local` memanggil `vite` tanpa `--port`)
- **Render Server**: `http://localhost:3001`

> Kalau memakai `npm run dev`, frontend berjalan di `http://localhost:3000`.

### Shortcut Desktop (Windows)

Klik dua kali shortcut **LyricCut Studio** di Desktop untuk menjalankan server dan membuka browser otomatis. Detail dan cara membuat ulang shortcut ada di [`docs/shortcut-desktop.md`](docs/shortcut-desktop.md).

---

## 📖 Cara Penggunaan

1. **Generate Lirik**:
   - Buka halaman **"Generate Lirik"** via tombol di header.
   - Unggah file audio (MP3/WAV).
   - Tempel teks lirik mentah.
   - Klik **"Generate Caption"**. AI akan menganalisis audio dan memberikan timestamp.
   - Klik **"Kirim ke Studio"**.

2. **Editing di Studio**:
   - Unggah file video background (MP4).
   - Pilih template gaya lirik di panel **"Lyric Style"**.
   - Atur **Aspect Ratio** sesuai platform tujuan (TikTok, Instagram, YouTube).
   - Gunakan **Offset Control** jika lirik terasa mendahului atau tertinggal dari audio.

3. **Export**:
   - Klik **"Render & Download MP4"**.
   - Server akan memproses video dan otomatis mengunduh hasilnya setelah selesai.

---

## 📁 Struktur Folder

- `src/app/`: Kode sumber aplikasi React (UI/Frontend).
- `src/remotion/`: Komposisi video, template lirik, dan logika rendering Remotion.
- `server/`: Modul backend untuk integrasi Gemini AI dan normalisasi caption.
- `server.mjs`: Entry point server lokal (Upload, Render, & API).
- `docs/`: Dokumentasi perubahan dan rencana pengembangan.
- `uploads/`: Penyimpanan sementara video yang diunggah (diabaikan oleh Git).
- `public/`: Aset statis aplikasi.
- `out/`: Folder hasil render MP4.


---

Dibuat dengan ❤️ menggunakan **Remotion** dan **Gemini AI**.

