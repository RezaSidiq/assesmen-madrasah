// modules/backup.js - Backup data ke JSON dan SQLite (FIX SQLite)

const fs = require('fs');
const path = require('path');
const { getDB, getAllSiswa, getAllMapel } = require('./database.js');

// ==================== BACKUP KE JSON ====================

async function backupToJSON(outputPath = null) {
    console.log(`\n💾 BACKUP DATA KE JSON\n`);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = outputPath || `backup_firebase_${timestamp}.json`;
    
    try {
        const db = getDB();
        
        console.log('📂 Mengambil data dari Firebase...');
        
        const snapshot = await db.ref('/').once('value');
        const allData = snapshot.val();
        
        if (!allData) {
            console.log('❌ Tidak ada data untuk di-backup');
            return null;
        }
        
        const backupData = {
            metadata: {
                timestamp: new Date().toISOString(),
                version: '1.0',
                source: 'Firebase Realtime Database',
                tables: Object.keys(allData)
            },
            data: allData
        };
        
        fs.writeFileSync(filename, JSON.stringify(backupData, null, 2), 'utf8');
        
        const stats = fs.statSync(filename);
        const fileSizeKB = (stats.size / 1024).toFixed(2);
        
        console.log(`\n✅ Backup JSON berhasil!`);
        console.log(`   📁 File: ${filename}`);
        console.log(`   📦 Ukuran: ${fileSizeKB} KB`);
        console.log(`   📊 Tabel: ${Object.keys(allData).join(', ')}`);
        
        return filename;
        
    } catch (error) {
        console.error(`❌ Gagal backup ke JSON: ${error.message}`);
        return null;
    }
}

// ==================== BACKUP KE SQLITE (FIX) ====================

async function backupToSQLite(outputPath = null) {
    console.log(`\n💾 BACKUP DATA KE SQLITE\n`);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = outputPath || `backup_firebase_${timestamp}.db`;
    
    let sqlite3;
    try {
        sqlite3 = require('sqlite3').verbose();
    } catch (error) {
        console.log(`\n⚠️  Module 'sqlite3' tidak ditemukan.`);
        console.log(`   Install dengan: npm install sqlite3`);
        console.log(`   Atau gunakan --format json sebagai alternatif.\n`);
        return null;
    }
    
    try {
        const db = getDB();
        
        // Hapus file lama jika ada
        if (fs.existsSync(filename)) {
            fs.unlinkSync(filename);
        }
        
        const dbSqlite = new sqlite3.Database(filename);
        
        console.log('📂 Mengambil data dari Firebase...');
        
        // Ambil semua data
        const [siswaSnapshot, nilaiSnapshot, nilaiPraktekSnapshot, nilaiSikapSnapshot, kehadiranSnapshot] = await Promise.all([
            db.ref('siswa').once('value'),
            db.ref('nilai').once('value'),
            db.ref('nilai_praktek').once('value'),
            db.ref('nilai_sikap').once('value'),
            db.ref('kehadiran').once('value')
        ]);
        
        const siswa = siswaSnapshot.exists() ? siswaSnapshot.val() : {};
        const nilai = nilaiSnapshot.exists() ? nilaiSnapshot.val() : {};
        const nilaiPraktek = nilaiPraktekSnapshot.exists() ? nilaiPraktekSnapshot.val() : {};
        const nilaiSikap = nilaiSikapSnapshot.exists() ? nilaiSikapSnapshot.val() : {};
        const kehadiran = kehadiranSnapshot.exists() ? kehadiranSnapshot.val() : {};
        
        console.log('📊 Membuat tabel dan mengisi data...');
        
        // Jalankan dalam transaction untuk memastikan semua atau tidak sama sekali
        dbSqlite.serialize(() => {
            // ========== TABEL SISWA ==========
            dbSqlite.run(`CREATE TABLE IF NOT EXISTS siswa (
                nisn TEXT PRIMARY KEY,
                nama TEXT,
                kelas TEXT,
                jk TEXT,
                ttl TEXT
            )`);
            
            const insertSiswa = dbSqlite.prepare(`INSERT OR REPLACE INTO siswa (nisn, nama, kelas, jk, ttl) VALUES (?, ?, ?, ?, ?)`);
            
            for (const [nisn, data] of Object.entries(siswa)) {
                insertSiswa.run(nisn, data.nama || '', data.kelas || '', data.jk || '', data.ttl || '');
            }
            insertSiswa.finalize();
            
            // ========== TABEL NILAI TEORI ==========
            dbSqlite.run(`CREATE TABLE IF NOT EXISTS nilai_teori (
                nisn TEXT,
                mapel TEXT,
                nilai REAL,
                PRIMARY KEY (nisn, mapel)
            )`);
            
            const insertTeori = dbSqlite.prepare(`INSERT OR REPLACE INTO nilai_teori (nisn, mapel, nilai) VALUES (?, ?, ?)`);
            
            for (const [nisn, mapels] of Object.entries(nilai)) {
                for (const [mapel, nilaiAngka] of Object.entries(mapels)) {
                    insertTeori.run(nisn, mapel, nilaiAngka);
                }
            }
            insertTeori.finalize();
            
            // ========== TABEL NILAI PRAKTEK ==========
            dbSqlite.run(`CREATE TABLE IF NOT EXISTS nilai_praktek (
                nisn TEXT,
                mapel TEXT,
                nilai REAL,
                PRIMARY KEY (nisn, mapel)
            )`);
            
            const insertPraktek = dbSqlite.prepare(`INSERT OR REPLACE INTO nilai_praktek (nisn, mapel, nilai) VALUES (?, ?, ?)`);
            
            for (const [nisn, mapels] of Object.entries(nilaiPraktek)) {
                for (const [mapel, nilaiAngka] of Object.entries(mapels)) {
                    insertPraktek.run(nisn, mapel, nilaiAngka);
                }
            }
            insertPraktek.finalize();
            
            // ========== TABEL NILAI SIKAP ==========
            dbSqlite.run(`CREATE TABLE IF NOT EXISTS nilai_sikap (
                nisn TEXT,
                mapel TEXT,
                nilai TEXT,
                PRIMARY KEY (nisn, mapel)
            )`);
            
            const insertSikap = dbSqlite.prepare(`INSERT OR REPLACE INTO nilai_sikap (nisn, mapel, nilai) VALUES (?, ?, ?)`);
            
            for (const [nisn, mapels] of Object.entries(nilaiSikap)) {
                for (const [mapel, nilaiHuruf] of Object.entries(mapels)) {
                    insertSikap.run(nisn, mapel, String(nilaiHuruf));
                }
            }
            insertSikap.finalize();
            
            // ========== TABEL KEHADIRAN ==========
            dbSqlite.run(`CREATE TABLE IF NOT EXISTS kehadiran (
                nisn TEXT,
                mapel TEXT,
                persen REAL,
                PRIMARY KEY (nisn, mapel)
            )`);
            
            const insertKehadiran = dbSqlite.prepare(`INSERT OR REPLACE INTO kehadiran (nisn, mapel, persen) VALUES (?, ?, ?)`);
            
            for (const [nisn, mapels] of Object.entries(kehadiran)) {
                for (const [mapel, persen] of Object.entries(mapels)) {
                    insertKehadiran.run(nisn, mapel, persen);
                }
            }
            insertKehadiran.finalize();
        });
        
        // Tunggu sampai semua selesai
        await new Promise((resolve) => {
            dbSqlite.close(resolve);
        });
        
        const stats = fs.statSync(filename);
        const fileSizeKB = (stats.size / 1024).toFixed(2);
        
        // Hitung statistik untuk ditampilkan
        const statsData = {
            siswa: Object.keys(siswa).length,
            nilaiTeori: Object.values(nilai).reduce((sum, m) => sum + Object.keys(m).length, 0),
            nilaiPraktek: Object.values(nilaiPraktek).reduce((sum, m) => sum + Object.keys(m).length, 0),
            nilaiSikap: Object.values(nilaiSikap).reduce((sum, m) => sum + Object.keys(m).length, 0),
            kehadiran: Object.values(kehadiran).reduce((sum, m) => sum + Object.keys(m).length, 0)
        };
        
        console.log(`\n✅ Backup SQLite berhasil!`);
        console.log(`   📁 File: ${filename}`);
        console.log(`   📦 Ukuran: ${fileSizeKB} KB`);
        console.log(`   📊 Statistik:`);
        console.log(`      - Siswa: ${statsData.siswa}`);
        console.log(`      - Nilai Teori: ${statsData.nilaiTeori}`);
        console.log(`      - Nilai Praktek: ${statsData.nilaiPraktek}`);
        console.log(`      - Nilai Sikap: ${statsData.nilaiSikap}`);
        console.log(`      - Kehadiran: ${statsData.kehadiran}`);
        
        return filename;
        
    } catch (error) {
        console.error(`❌ Gagal backup ke SQLite: ${error.message}`);
        return null;
    }
}

// ==================== RESTORE DARI JSON ====================

async function restoreFromJSON(filePath) {
    console.log(`\n🔄 RESTORE DATA DARI JSON\n`);
    
    if (!fs.existsSync(filePath)) {
        console.log(`❌ File tidak ditemukan: ${filePath}`);
        return false;
    }
    
    try {
        const rawData = fs.readFileSync(filePath, 'utf8');
        const backupData = JSON.parse(rawData);
        
        if (!backupData.data) {
            console.log('❌ Format file backup tidak valid');
            return false;
        }
        
        const allData = backupData.data;
        const db = getDB();
        
        console.log('📂 Memulihkan data ke Firebase...');
        
        for (const [node, data] of Object.entries(allData)) {
            if (data && typeof data === 'object') {
                await db.ref(node).set(data);
                console.log(`   ✅ ${node}: ${Object.keys(data).length} entri`);
            }
        }
        
        console.log(`\n✅ Restore berhasil dari: ${filePath}`);
        return true;
        
    } catch (error) {
        console.error(`❌ Gagal restore: ${error.message}`);
        return false;
    }
}

module.exports = { backupToJSON, backupToSQLite, restoreFromJSON };