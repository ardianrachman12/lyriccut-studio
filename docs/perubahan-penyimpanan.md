# Perubahan Struktur Penyimpanan File Sementara

## Lokasi Penyimpanan Baru
File video sementara yang diunggah pengguna kini dipindahkan dari folder `public/` ke folder `uploads/` di root proyek.

### Alasan Perubahan:
1. **Kebersihan Aset Statis**: Folder `public/` sekarang hanya berisi aset statis permanen aplikasi.
2. **Manajemen Git**: Folder `uploads/` telah ditambahkan ke `.gitignore` sehingga tidak akan mengotori repositori dengan file video besar.
3. **Pemisahan Peran**: Memisahkan antara file yang dihasilkan pengguna (*user-generated*) dengan kode sumber aplikasi.

## Komponen yang Terpengaruh

### 1. Server (`server.mjs`)
- Variabel `PUBLIC_DIR` diganti menjadi `UPLOADS_DIR`.
- Route `/api/upload` sekarang menyimpan file ke folder `uploads/`.
- Route GET untuk preview video sekarang melayani file dari folder `uploads/`.

### 2. Frontend (`src/app/App.tsx`)
- Pesan status unggahan diperbarui untuk menunjukkan lokasi `uploads/uploaded-clip.mp4`.

### 3. Konfigurasi Git (`.gitignore`)
- Menambahkan `/uploads/*` ke dalam daftar abaikan.
- Menghapus `public/*` dari daftar abaikan agar aset statis asli di folder public tetap bisa masuk ke sistem kontrol versi.

---
*Dokumentasi ini dibuat sebagai catatan migrasi folder penyimpanan.*
