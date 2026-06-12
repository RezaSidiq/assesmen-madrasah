# Aplikasi Manajemen Nilai Madrasah

Sistem manajemen nilai siswa berbasis **Firebase Realtime Database** dengan CLI (Command Line Interface) untuk mengelola data siswa, nilai, laporan, dan backup.

## Fitur Utama

### 📊 Manajemen Nilai
- Update nilai dari file CSV (teori, praktek, sikap, kehadiran)
- Update single nilai dengan verifikasi
- Hitung nilai akhir (bobot: 30% teori, 35% praktek, 20% sikap, 15% kehadiran)

### 👨‍🎓 Manajemen Siswa
- Tambah/update/hapus siswa (single & batch)
- Import/update/hapus siswa dari file CSV
- Naikkan kelas otomatis

### 📈 Laporan & Analytics
- Laporan nilai per mapel & kelas (export Excel)
- Daftar siswa remedial (filter by kelas, mapel, NISN)
- Tabel remedial yang rapi

### 💾 Backup & Restore
- Backup ke JSON (portable)
- Backup ke SQLite (relasional)
- Restore dari JSON

## Prasyarat

- Node.js (v16 atau lebih baru)
- Firebase project dengan Realtime Database
- Service account key (JSON)

## Instalasi

```bash
# Clone repository
git clone https://github.com/username/nilai-madrasah.git
cd nilai-madrasah

# Install dependencies
npm install

# Letakkan serviceAccountKey.json di root folder
# (download dari Firebase Console)