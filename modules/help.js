function showHelp() {
    console.log(`
╔═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════╗
║                                         UPDATE NILAI - SISTEM MANAJEMEN NILAI                                     ║
╚═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════╝

📝 UPDATE NILAI:
   node updateNilai.js --file <file.csv> --tipe <teori|praktek|sikap|kehadiran>
   node updateNilai.js --single <nisn> <mapel> <nilai> --tipe <teori|praktek|sikap|kehadiran>

🔍 LIHAT DATA NILAI:
   node updateNilai.js --get <nisn>
   node updateNilai.js --get-mapel <mapel> [--kelas <kelas>]

📊 LAPORAN & REMEDIAL:
   node updateNilai.js --laporan <mapel> [--kelas <kelas>]              # Export ke Excel
   node updateNilai.js --remedial --by-kelas "VII (Tujuh)"
   node updateNilai.js --remedial --by-kelas "VII (Tujuh)" --export
   node updateNilai.js --remedial --by-mapel Matematika
   node updateNilai.js --remedial --by-mapel Matematika --export
   node updateNilai.js --remedial --by-nisn 0129781421 
   node updateNilai.js --remedial --by-nisn 0129781421 --export
   node updateNilai.js --remedial --export

👨‍🎓 MANAJEMEN SISWA (BARU):
   node updateNilai.js --tambah-siswa --nisn <10digit> --nama <nama> --kelas <kelas> [--jk <jk>] [--ttl <ttl>]
   node updateNilai.js --update-siswa --nisn <10digit> [--nama <nama>] [--kelas <kelas>] [--jk <jk>] [--ttl <ttl>]
   node updateNilai.js --hapus-siswa --nisn <10digit>

📦 BATCH MANAJEMEN SISWA (CSV):
   node updateNilai.js --import-siswa --file <file.csv>                 # Tambah banyak siswa
   node updateNilai.js --update-siswa-batch --file <file.csv>           # Update banyak siswa
   node updateNilai.js --hapus-siswa-batch --file <file.csv>            # Hapus banyak siswa

📈 MANAJEMEN KELAS:
   node updateNilai.js --naik-kelas --dari <kelas> --ke <kelas>         # Naikkan semua siswa

📋 INFORMASI:
   node updateNilai.js --list-nisn
   node updateNilai.js --list-kelas
   node updateNilai.js --list-mapel
   node updateNilai.js --help
💾 BACKUP & RESTORE:
   node updateNilai.js --backup json [--output file.json}              # Backup ke JSON
   node updateNilai.js --backup sqlite [--output file.db]             # Backup ke SQLite
   node updateNilai.js --restore --file backup.json                   # Restore dari JSON
   Contoh:
      node updateNilai.js --backup json
      node updateNilai.js --backup sqlite 
      node updateNilai.js --restore --file backup_20250101.json

📋 FORMAT CSV UNTUK SISWA:
   nisn;nama;kelas;jk;ttl
   1234567890;Ahmad Fauzi;VII (Tujuh);L;Jakarta, 1 Jan 2010

📋 FORMAT CSV UNTUK HAPUS SISWA:
   nisn
   1234567890
   1234567891

⚠️  PERINGATAN:
   - NISN harus 10 digit angka
   - Nilai harus antara 0-100
   - Tipe yang valid: teori, praktek, sikap, kehadiran
   - Hapus siswa akan menghapus semua nilai yang bersangkutan
    `);
}

module.exports = { showHelp };