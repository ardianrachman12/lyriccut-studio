# Shortcut Desktop: Jalankan LyricCut Studio 1 Klik

Status: **Selesai dan sudah diuji.**
Tanggal: 2026-11-22
Platform: Windows

## 1. Tujuan

Memungkinkan LyricCut Studio dijalankan hanya dengan **satu klik** dari desktop:

- `npm run local` otomatis dijalankan (backend render + Vite sekaligus).
- Browser otomatis dibuka setelah dev server siap.
- Tidak membuat server dobel kalau aplikasi sudah berjalan.

## 2. File yang dibuat

| File | Peran |
| --- | --- |
| `start-lyriccut.cmd` | Launcher: cek instance, jalankan `npm run local`, tunggu server siap, buka browser |
| `public/lyriccut.ico` | Icon shortcut (256×256, PNG di dalam container ICO) |
| `C:\Users\<user>\OneDrive\Desktop\LyricCut Studio.lnk` | Shortcut desktop (path mengikuti folder Desktop user) |

Shortcut memakai:

- **Target**: `start-lyriccut.cmd`
- **Working directory**: root project (`D:\coding\react-project\lyriccut-studio`)
- **Window style**: minimized (jendela launcher tidak mengganggu)
- **Icon**: `public/lyriccut.ico,0`

## 3. Alur kerja `start-lyriccut.cmd`

1. `cd` ke folder project (dari lokasi file `.cmd`, jadi aman dipindah).
2. Cek `http://localhost:5173` dan `http://localhost:3000`:
   - Kalau salah satu merespons, browser langsung dibuka dan script selesai.
   - Jadi klik shortcut berkali-kali tidak akan menjalankan server dobel.
3. Kalau belum ada, buka jendela baru **“LyricCut Studio - Server”** yang menjalankan `npm run local`.
4. Polling tiap 500 ms (maksimal 60 detik) sampai dev server merespons, lalu buka URL-nya di browser default.
5. Kalau timeout, tampilkan pesan dan `pause` supaya pesan error bisa dibaca.

Jendela server **sengaja dibiarkan terbuka** agar log terlihat dan bisa dihentikan dengan `Ctrl+C` atau dengan menutup jendelanya.

## 4. Port: 5173, bukan 3000

Script `local` di `package.json` adalah:

```json
"local": "concurrently \"node server.mjs\" \"vite\""
```

Karena `vite` dipanggil tanpa `--port`, Vite memakai port default **5173**. Ini sudah diverifikasi saat pengujian. Sebelumnya README menyebut 3000, padahal 3000 hanya dipakai oleh script `dev` (`vite --port=3000`).

Launcher karena itu membuka **5173** lebih dulu, dengan fallback ke **3000** untuk kasus aplikasi dijalankan lewat `npm run dev`.

## 5. Cara pakai dan mematikan

- **Menjalankan**: klik 2× shortcut **LyricCut Studio** di desktop.
- **Mematikan**: tutup jendela **“LyricCut Studio - Server”**, atau tekan `Ctrl+C` di jendela itu.
- Kalau browser ditutup tapi server masih jalan, klik shortcut lagi — browser akan dibuka ulang tanpa memulai server baru.

## 6. Membuat ulang shortcut

Kalau shortcut terhapus, project dipindah, atau dipakai di komputer lain, jalankan PowerShell berikut dari root project (icon `public/lyriccut.ico` harus sudah ada):

```powershell
$project = (Get-Location).Path
$desktop = [Environment]::GetFolderPath('Desktop')
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut((Join-Path $desktop 'LyricCut Studio.lnk'))
$shortcut.TargetPath = Join-Path $project 'start-lyriccut.cmd'
$shortcut.WorkingDirectory = $project
$shortcut.WindowStyle = 7
$shortcut.Description = 'Jalankan LyricCut Studio dan buka di browser'
$shortcut.IconLocation = "$(Join-Path $project 'public\lyriccut.ico'),0"
$shortcut.Save()
```

## 7. Catatan dan batasan

- **Khusus Windows**, karena memakai `.cmd` dan shortcut `.lnk`.
- Butuh **Node.js + npm** yang ada di `PATH`. Kalau tidak ada, jendela server akan menampilkan error `'npm' is not recognized`.
- `start-lyriccut.cmd` disimpan sebagai teks ASCII dengan akhir baris CRLF.
- Icon `public/lyriccut.ico` saat ini **hanya dipakai shortcut**, belum dipasang sebagai favicon di `index.html`.
- **Risiko port bentrok:** kalau port 5173 sedang dipakai aplikasi lain, Vite (tanpa `strictPort`) akan pindah ke 5174, sementara launcher bisa membuka aplikasi lain di 5173. Mitigasi yang disarankan: tambahkan `--strictPort` ke script `local`, sehingga Vite gagal dengan pesan jelas alih-alih pindah port diam-diam.
- Path shortcut mengikuti folder Desktop user. Di mesin ini Desktop diarahkan ke OneDrive: `C:\Users\ardia\OneDrive\Desktop`.

## 8. Hasil pengujian

- `npm run local` berjalan: render server di `127.0.0.1:3001`, Vite di `localhost:5173`.
- `GET http://localhost:5173` → `200`.
- `GET http://127.0.0.1:3001/api/health` → `200` dengan `{"ok":true,"port":3001}`.
- `start-lyriccut.cmd` dijalankan: jendela server terbuka, browser default terbuka otomatis.
