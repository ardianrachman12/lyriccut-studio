<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/b338921a-2227-4ba5-9b33-7d7b36f2e51e

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Struktur folder

```
docs/                       Dokumentasi dan plan
public/                     Video upload (uploaded-clip.mp4)
out/                        Hasil export (nama unik per export: lyric-clip-YYYYMMDD-HHMMSS.mp4)
server.mjs                  Server lokal: upload + render Remotion
src/app/                    UI (App.tsx + components/)
src/lib/                    Validasi caption, helper format
src/data/                   Caption contoh
src/remotion/               Komposisi Remotion
  components/               EmptyClipBackdrop, LyricStage
  templates/                Template gaya lirik (types, definitions, index)
```

## Template gaya lirik

Pilih template di panel "03. Lyric Style", lalu atur override ringan: ukuran font, warna utama (kata aktif), dan posisi vertikal. Pilihan disimpan di `localStorage`, dan dikirim ke server saat export (`templateId`, `overrides`).

Menambah template baru:

1. Tambah objek `LyricTemplate` di `src/remotion/templates/definitions.ts` (font lewat `@remotion/google-fonts`).
2. Daftarkan di `LYRIC_TEMPLATES` pada `src/remotion/templates/index.ts`.

Template tidak dikenal otomatis fallback ke `sky-karaoke`.
