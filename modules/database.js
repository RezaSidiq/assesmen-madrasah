// modules/database.js - Manajemen koneksi Firebase (LENGKAP + CRUD SISWA)

const admin = require('firebase-admin');
const path = require('path');
const readline = require('readline');

let db = null;
let siswaCache = null;
let isInitialized = false;

// Helper untuk konfirmasi interaktif
function askConfirmation(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'ya');
        });
    });
}

// Inisialisasi Firebase
function initFirebase() {
    if (isInitialized) return db;
    
    try {
        const serviceAccount = require(path.join(process.cwd(), 'serviceAccountKey.json'));
        
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: "https://dev-assesment-default-rtdb.asia-southeast1.firebasedatabase.app"
        });
        
        db = admin.database();
        isInitialized = true;
        console.log('[DB] Firebase berhasil diinisialisasi');
        return db;
        
    } catch (error) {
        console.error(`[DB] Gagal inisialisasi Firebase: ${error.message}`);
        throw new Error(`Firebase init failed: ${error.message}`);
    }
}

// Get database instance
function getDB() {
    if (!db) {
        throw new Error('[DB] Firebase belum diinisialisasi. Panggil initFirebase() terlebih dahulu.');
    }
    return db;
}

// ==================== FUNGSI SISWA EXISTING ====================

// Ambil semua data siswa (dengan cache)
async function getAllSiswa(forceRefresh = false) {
    try {
        if (siswaCache && !forceRefresh) return siswaCache;
        
        const database = getDB();
        const snapshot = await database.ref('siswa').once('value');
        
        if (snapshot.exists()) {
            siswaCache = snapshot.val();
            return siswaCache;
        }
        return {};
    } catch (error) {
        console.error(`[DB] Error getAllSiswa: ${error.message}`);
        throw error;
    }
}

// Reset cache siswa
function resetSiswaCache() {
    siswaCache = null;
    console.log('[DB] Cache siswa direset');
}

// Ambil data satu siswa
async function getDataSiswa(nisn) {
    try {
        if (!nisn) {
            throw new Error('NISN tidak boleh kosong');
        }
        
        const database = getDB();
        const snapshot = await database.ref(`siswa/${nisn}`).once('value');
        
        if (snapshot.exists()) {
            return snapshot.val();
        }
        return null;
    } catch (error) {
        console.error(`[DB] Error getDataSiswa(${nisn}): ${error.message}`);
        return null;
    }
}

// Ambil siswa berdasarkan kelas (exact match)
async function getSiswaByKelas(kelas) {
    try {
        const siswa = await getAllSiswa();
        const result = [];
        
        for (let nisn in siswa) {
            const kelasSiswa = siswa[nisn].kelas || '';
            if (kelasSiswa === kelas) {
                result.push({
                    nisn: nisn,
                    nama: siswa[nisn].nama || '-',
                    kelas: kelasSiswa,
                    jk: siswa[nisn].jk || '-',
                    ttl: siswa[nisn].ttl || '-'
                });
            }
        }
        return result;
    } catch (error) {
        console.error(`[DB] Error getSiswaByKelas(${kelas}): ${error.message}`);
        return [];
    }
}

// Cek apakah NISN ada
async function isNISNExists(nisn) {
    try {
        const siswa = await getAllSiswa();
        return siswa.hasOwnProperty(nisn);
    } catch (error) {
        console.error(`[DB] Error isNISNExists(${nisn}): ${error.message}`);
        return false;
    }
}

// Cek apakah kelas ada
async function isKelasExists(kelas) {
    try {
        const siswa = await getAllSiswa();
        for (let nisn in siswa) {
            if (siswa[nisn].kelas === kelas) return true;
        }
        return false;
    } catch (error) {
        console.error(`[DB] Error isKelasExists(${kelas}): ${error.message}`);
        return false;
    }
}

// Ambil semua kelas unik dari database
async function getAllKelas() {
    try {
        const siswa = await getAllSiswa();
        const kelasSet = new Set();
        
        for (let nisn in siswa) {
            const kelas = siswa[nisn].kelas;
            if (kelas) kelasSet.add(kelas);
        }
        
        return Array.from(kelasSet).sort();
    } catch (error) {
        console.error(`[DB] Error getAllKelas: ${error.message}`);
        return [];
    }
}

// ==================== FUNGSI CRUD SISWA BARU ====================

// Tambah satu siswa
async function addSiswa(nisn, data) {
    try {
        const database = getDB();
        const siswaRef = database.ref(`siswa/${nisn}`);
        await siswaRef.set(data);
        
        // Reset cache
        resetSiswaCache();
        
        return true;
    } catch (error) {
        console.error(`[DB] Error addSiswa(${nisn}): ${error.message}`);
        throw error;
    }
}

// Update data siswa
async function updateSiswa(nisn, data) {
    try {
        const database = getDB();
        const siswaRef = database.ref(`siswa/${nisn}`);
        
        // Ambil data lama
        const oldData = await getDataSiswa(nisn);
        if (!oldData) {
            throw new Error(`Siswa dengan NISN ${nisn} tidak ditemukan`);
        }
        
        // Merge data baru dengan data lama
        const newData = { ...oldData, ...data };
        await siswaRef.set(newData);
        
        // Reset cache
        resetSiswaCache();
        
        return true;
    } catch (error) {
        console.error(`[DB] Error updateSiswa(${nisn}): ${error.message}`);
        throw error;
    }
}

// Hapus satu siswa beserta semua nilainya
async function deleteSiswa(nisn, skipConfirm = false) {
    try {
        // Konfirmasi jika tidak di-skip
        if (!skipConfirm) {
            const siswa = await getDataSiswa(nisn);
            if (!siswa) {
                console.log(`❌ Siswa dengan NISN ${nisn} tidak ditemukan`);
                return false;
            }
            
            const confirmed = await askConfirmation(`\n⚠️  Yakin hapus siswa ${nisn} - ${siswa.nama || '-'}? (Y/T): `);
            if (!confirmed) {
                console.log(`❌ Dibatalkan.`);
                return false;
            }
        }
        
        const database = getDB();
        
        // Hapus dari semua node terkait
        await Promise.all([
            database.ref(`siswa/${nisn}`).remove(),
            database.ref(`nilai/${nisn}`).remove(),
            database.ref(`nilai_praktek/${nisn}`).remove(),
            database.ref(`nilai_sikap/${nisn}`).remove(),
            database.ref(`kehadiran/${nisn}`).remove()
        ]);
        
        // Reset cache
        resetSiswaCache();
        
        console.log(`✅ Siswa ${nisn} berhasil dihapus (termasuk semua nilai)`);
        return true;
        
    } catch (error) {
        console.error(`[DB] Error deleteSiswa(${nisn}): ${error.message}`);
        throw error;
    }
}

// Hapus banyak siswa sekaligus
async function deleteSiswaBatch(nisnList, skipConfirm = false) {
    if (!nisnList || nisnList.length === 0) {
        console.log('❌ Tidak ada NISN untuk dihapus');
        return { success: 0, failed: 0 };
    }
    
    // Konfirmasi batch (sekali untuk semua)
    if (!skipConfirm) {
        const confirmed = await askConfirmation(`\n⚠️  Yakin hapus ${nisnList.length} siswa? (Y/T): `);
        if (!confirmed) {
            console.log(`❌ Dibatalkan.`);
            return { success: 0, failed: 0 };
        }
    }
    
    let success = 0;
    let failed = 0;
    
    for (const nisn of nisnList) {
        try {
            await deleteSiswa(nisn, true); // skip confirm internal
            success++;
        } catch (error) {
            console.log(`❌ Gagal hapus ${nisn}: ${error.message}`);
            failed++;
        }
    }
    
    console.log(`\n📊 Hasil hapus batch: ${success} berhasil, ${failed} gagal`);
    return { success, failed };
}

// Naikkan kelas semua siswa
async function upgradeKelas(dariKelas, keKelas) {
    try {
        const siswaList = await getSiswaByKelas(dariKelas);
        
        if (siswaList.length === 0) {
            console.log(`❌ Tidak ada siswa di kelas ${dariKelas}`);
            return 0;
        }
        
        console.log(`\n📊 Ditemukan ${siswaList.length} siswa di kelas ${dariKelas}`);
        console.log(`🔄 Menaikkan kelas ke: ${keKelas}...\n`);
        
        let success = 0;
        
        for (const siswa of siswaList) {
            try {
                await updateSiswa(siswa.nisn, { kelas: keKelas });
                console.log(`   ✅ ${siswa.nisn} - ${siswa.nama}`);
                success++;
            } catch (error) {
                console.log(`   ❌ Gagal: ${siswa.nisn} - ${error.message}`);
            }
        }
        
        console.log(`\n✅ Berhasil menaikkan ${success} dari ${siswaList.length} siswa`);
        return success;
        
    } catch (error) {
        console.error(`[DB] Error upgradeKelas: ${error.message}`);
        throw error;
    }
}

// ==================== FUNGSI NILAI EXISTING ====================

// Ambil nilai siswa untuk mapel tertentu
async function getNilaiSiswaByMapel(nisn, mapel) {
    try {
        const database = getDB();
        const [teoriSnapshot, praktekSnapshot, sikapSnapshot, kehadiranSnapshot] = await Promise.all([
            database.ref(`nilai/${nisn}/${mapel}`).once('value'),
            database.ref(`nilai_praktek/${nisn}/${mapel}`).once('value'),
            database.ref(`nilai_sikap/${nisn}/${mapel}`).once('value'),
            database.ref(`kehadiran/${nisn}/${mapel}`).once('value')
        ]);
        
        return {
            teori: teoriSnapshot.exists() ? teoriSnapshot.val() : null,
            praktek: praktekSnapshot.exists() ? praktekSnapshot.val() : null,
            sikap: sikapSnapshot.exists() ? sikapSnapshot.val() : null,
            kehadiran: kehadiranSnapshot.exists() ? kehadiranSnapshot.val() : null
        };
    } catch (error) {
        console.error(`[DB] Error getNilaiSiswaByMapel(${nisn}, ${mapel}): ${error.message}`);
        return { teori: null, praktek: null, sikap: null, kehadiran: null };
    }
}

// Update nilai ke node tertentu
async function updateNilai(nisn, mapel, nilai, targetNode) {
    try {
        const database = getDB();
        const nilaiRef = database.ref(`${targetNode}/${nisn}/${mapel}`);
        await nilaiRef.set(nilai);
        return true;
    } catch (error) {
        console.error(`[DB] Error updateNilai(${nisn}, ${mapel}): ${error.message}`);
        throw error;
    }
}

// Batch update
async function batchUpdate(updates) {
    try {
        if (!updates || Object.keys(updates).length === 0) {
            throw new Error('Tidak ada data untuk diupdate');
        }
        
        const database = getDB();
        await database.ref().update(updates);
        return true;
    } catch (error) {
        console.error(`[DB] Error batchUpdate: ${error.message}`);
        throw error;
    }
}

// Ambil semua NISN
async function getAllNISN() {
    try {
        const siswa = await getAllSiswa();
        return Object.keys(siswa);
    } catch (error) {
        console.error(`[DB] Error getAllNISN: ${error.message}`);
        return [];
    }
}

// Ambil semua mapel
async function getAllMapel() {
    try {
        const mapelSet = new Set();
        const database = getDB();
        
        const nilaiSnapshot = await database.ref('nilai').once('value');
        if (nilaiSnapshot.exists()) {
            const data = nilaiSnapshot.val();
            for (let nisn in data) {
                Object.keys(data[nisn]).forEach(m => mapelSet.add(m));
            }
        }
        
        const praktekSnapshot = await database.ref('nilai_praktek').once('value');
        if (praktekSnapshot.exists()) {
            const data = praktekSnapshot.val();
            for (let nisn in data) {
                Object.keys(data[nisn]).forEach(m => mapelSet.add(m));
            }
        }
        
        return Array.from(mapelSet).sort();
    } catch (error) {
        console.error(`[DB] Error getAllMapel: ${error.message}`);
        return [];
    }
}

// Cek apakah mapel ada
async function isMapelExists(mapel) {
    try {
        const mapelList = await getAllMapel();
        return mapelList.includes(mapel);
    } catch (error) {
        console.error(`[DB] Error isMapelExists(${mapel}): ${error.message}`);
        return false;
    }
}

// Cek apakah mapel dimiliki siswa
async function isMapelDimilikiSiswa(nisn, mapel) {
    try {
        const database = getDB();
        const snapshot = await database.ref(`nilai/${nisn}/${mapel}`).once('value');
        return snapshot.exists();
    } catch (error) {
        console.error(`[DB] Error isMapelDimilikiSiswa(${nisn}, ${mapel}): ${error.message}`);
        return false;
    }
}

module.exports = {
    // Inisialisasi
    initFirebase,
    getDB,
    
    // Cache
    getAllSiswa,
    resetSiswaCache,
    
    // Baca data
    getDataSiswa,
    getSiswaByKelas,
    getAllNISN,
    getAllMapel,
    getAllKelas,
    
    // Validasi existence
    isNISNExists,
    isKelasExists,
    isMapelExists,
    isMapelDimilikiSiswa,
    
    // Nilai operations
    getNilaiSiswaByMapel,
    updateNilai,
    batchUpdate,
    
    // CRUD Siswa
    addSiswa,
    updateSiswa,
    deleteSiswa,
    deleteSiswaBatch,
    upgradeKelas,
    
    // Helper
    askConfirmation
};