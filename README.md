# 🏫 AbsensiKu — Sistem Absensi Siswa Digital

Aplikasi absensi siswa berbasis web dengan fitur kamera, GPS, dan device lock.  
**Dikembangkan oleh Murdani**

---

## ✨ Fitur

- 📸 **Absensi dengan foto** — kamera selfie langsung dari browser
- 📍 **Validasi lokasi GPS** — hanya bisa absen di area sekolah
- 📱 **Device Lock** — 1 siswa = 1 perangkat
- 📊 **Dashboard admin** — statistik kehadiran real-time
- 📅 **Kalender kehadiran** — visualisasi per bulan
- 📝 **Pengajuan izin** — approve/reject oleh admin
- 📢 **Pengumuman** — notifikasi ke semua siswa
- 📲 **PWA** — bisa diinstall di HP seperti aplikasi native
- ☁️ **Cloud database** — menggunakan Supabase (PostgreSQL)

---

## 🚀 Deploy ke GitHub Pages

### Langkah 1 — Fork / Clone repo ini

```bash
git clone https://github.com/username/absensi-ku.git
cd absensi-ku
```

### Langkah 2 — Setup Supabase

1. Buat akun di [supabase.com](https://supabase.com)
2. Buat project baru
3. Buka **SQL Editor** dan jalankan isi file `database.sql`
4. Copy **Project URL** dan **anon key** dari Settings → API

### Langkah 3 — Update kredensial

Edit file `index.html`, cari baris:

```javascript
const SUPABASE_URL = 'https://xxxxx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJ...';
```

Ganti dengan URL dan key Supabase Anda.

### Langkah 4 — Enable GitHub Pages

1. Push ke branch `main`
2. Buka **Settings → Pages**
3. Source: **GitHub Actions**
4. Workflow akan otomatis berjalan dan deploy

---

## 📁 Struktur File

```
absensi-ku/
├── index.html          ← Aplikasi utama (single file)
├── manifest.json       ← PWA manifest
├── sw.js              ← Service Worker (offline support)
├── icons/             ← PWA icons
│   ├── icon-72.png
│   ├── icon-96.png
│   ├── icon-128.png
│   ├── icon-144.png
│   ├── icon-152.png
│   ├── icon-192.png
│   ├── icon-384.png
│   └── icon-512.png
├── database.sql       ← Script setup database Supabase
├── .github/
│   └── workflows/
│       └── deploy.yml ← GitHub Actions auto-deploy
└── README.md
```

---

## 🔐 Akun Default

| Role  | Username | Password |
|-------|----------|----------|
| Admin | `admin`  | `admin123` |
| Siswa | `SIS001` | `123456`   |

> ⚠️ Ganti password admin setelah deploy pertama kali!

---

## 🛠️ Tech Stack

- **Frontend**: React 18 (via CDN, no build tools)
- **Database**: Supabase (PostgreSQL + REST API)
- **PWA**: Service Worker + Web App Manifest
- **Hosting**: GitHub Pages

---

## 📄 Lisensi

MIT License — bebas digunakan dan dimodifikasi.

---

*Dikembangkan oleh **Murdani** © 2025*
