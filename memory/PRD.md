# Kost KTP Manager — PRD

## Original Problem Statement
Admin kost perlu menyetor & mengupdate data KTP penghuni ke RT setiap bulan.
Aplikasi web dengan 2 role:
- **Admin** (PIN `060896`): kendali penuh - tambah, edit, hapus, upload foto KTP
- **User RT/RW/Owner** (PIN `00100735`): view-only, tanpa screenshot/download, foto KTP bisa dizoom
Login sederhana pakai 6-digit PIN, tanpa registrasi/reset.

## User Choices
- Storage: MongoDB base64
- Watermark: tidak perlu
- Bahasa: Indonesia
- Fields: Nomor Kamar, Nama, Foto KTP saja
- Tema: Modern minimalist, aksen hangat, Apple iOS-style
- Kamar tetap 68 (A1-A11, B1-B11, C1-C11, D1-D11, 101-106, 201-206, 301-306, 401-406). Admin toggle status isi/kosong; kamar kosong disembunyikan dari user.

## Architecture
- **Backend**: FastAPI + Motor (MongoDB). Auth via 6-digit PIN → opaque bearer token. Endpoints:
  - `POST /api/auth/login` `{pin}` → `{token, role}`
  - `GET /api/auth/me`
  - `GET /api/rooms` (viewer sees only `is_occupied=true`)
  - `PUT /api/rooms/{nomor_kamar}` (admin) — set occupied+data, atau kosongkan
  - Kamar di-seed otomatis pada startup.
- **Frontend**: React + Tailwind + shadcn + framer-motion. Routes: `/` (login), `/admin`, `/viewer`. Auth di localStorage via `AuthContext`.
- **Security (viewer)**: `useNoCapture` disables context menu, Ctrl/Cmd+S/P/U/C, F12 devtools shortcuts, drag, blurs body on window blur (best-effort screenshot deterrent). Image `pointer-events: none`, `-webkit-user-select: none`, `-webkit-touch-callout: none`.

## Implemented (Iteration 1)
- PIN keypad iOS-style login dengan shake feedback
- Admin dashboard: stats (total/terisi/kosong), search, segmented filter, grid kamar, sheet form isi/kosong, konfirmasi kosongkan
- Viewer dashboard: view-only, notice banner, hanya kamar terisi
- Fullscreen KTP viewer dengan zoom in/out/reset, drag pan, ESC close, restrictions untuk role viewer
- 68 kamar auto-seed

## Backlog
- P1: Export daftar penghuni ke PDF/Excel untuk RT
- P1: Log aktivitas admin (audit trail)
- P2: Filter kamar per lantai/blok
- P2: Bulk upload CSV
- P2: Statistik occupancy per bulan
