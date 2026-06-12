// modules/siswa.js - CRUD operasi untuk data siswa

const fs = require('fs');
const csv = require('csv-parser');
const { 
    addSiswa, 
    updateSiswa, 
    deleteSiswa, 
    deleteSiswaBatch, 
    upgradeKelas,
    getDataSiswa,
    getAllSiswa
} = require('./database.js');
const { 
    validateNISN, 
    validateNISNForUpdate, 
    validateNISNForDelete,
    validateSiswaData,
    displayErrors 
} = require('./validator.js');

// ==================== TAMBAH SATU SISWA ====================

async function tambahSiswa(nisn, nama, kelas, jk = '', ttl = '') {
    console.log(`\n📝 TAMBAH SISWA BARU\n`);
    
    // Validasi data
    const validation = await validateSiswaData(nisn, nama, kelas, jk, ttl);
    if (!validation.valid) {
        displayErrors(validation.errors);
        return false;
    }
    
    const dataSiswa = {
        nama: nama.trim(),
        kelas: kelas.trim(),
        jk: jk.trim() || '-',
        ttl: ttl.trim() || '-'
    };
    
    try {
        await addSiswa(nisn, dataSiswa);
        console.log(`✅ Siswa berhasil ditambahkan:`);
        console.log(`   NISN : ${nisn}`);
        console.log(`   Nama : ${dataSiswa.nama}`);
        console.log(`   Kelas: ${dataSiswa.kelas}`);
        return true;
    } catch (error) {
        console.log(`❌ Gagal menambah siswa: ${error.message}`);
        return false;
    }
}

// ==================== UPDATE SATU SISWA ====================

async function updateSiswaData(nisn, updates) {
    console.log(`\n📝 UPDATE DATA SISWA\n`);
    
    // Validasi NISN (harus ada)
    const nisnValidation = await validateNISNForUpdate(nisn);
    if (!nisnValidation.valid) {
        displayErrors(nisnValidation.errors);
        return false;
    }
    
    // Filter hanya field yang diisi
    const dataToUpdate = {};
    if (updates.nama) dataToUpdate.nama = updates.nama.trim();
    if (updates.kelas) dataToUpdate.kelas = updates.kelas.trim();
    if (updates.jk !== undefined) dataToUpdate.jk = updates.jk.trim() || '-';
    if (updates.ttl !== undefined) dataToUpdate.ttl = updates.ttl.trim() || '-';
    
    if (Object.keys(dataToUpdate).length === 0) {
        console.log('❌ Tidak ada data yang diupdate');
        return false;
    }
    
    try {
        const oldData = await getDataSiswa(nisn);
        await updateSiswa(nisn, dataToUpdate);
        
        console.log(`✅ Data siswa berhasil diupdate:`);
        console.log(`   NISN : ${nisn}`);
        console.log(`   Nama : ${oldData.nama} → ${dataToUpdate.nama || oldData.nama}`);
        console.log(`   Kelas: ${oldData.kelas} → ${dataToUpdate.kelas || oldData.kelas}`);
        return true;
    } catch (error) {
        console.log(`❌ Gagal update siswa: ${error.message}`);
        return false;
    }
}

// ==================== HAPUS SATU SISWA ====================

async function hapusSiswa(nisn) {
    console.log(`\n🗑️ HAPUS SISWA\n`);
    
    const nisnValidation = await validateNISNForDelete(nisn);
    if (!nisnValidation.valid) {
        displayErrors(nisnValidation.errors);
        return false;
    }
    
    try {
        await deleteSiswa(nisn);
        return true;
    } catch (error) {
        console.log(`❌ Gagal hapus siswa: ${error.message}`);
        return false;
    }
}

// ==================== BATCH IMPORT SISWA DARI CSV ====================

async function importSiswaFromCSV(filePath) {
    console.log(`\n📂 IMPORT SISWA DARI CSV: ${filePath}\n`);
    
    // Cek file
    if (!fs.existsSync(filePath)) {
        console.log(`❌ File tidak ditemukan: ${filePath}`);
        return;
    }
    
    const results = [];
    let header = null;
    let separator = ';';
    
    // Baca file untuk deteksi separator
    const firstLine = fs.readFileSync(filePath, 'utf8').split('\n')[0];
    if (firstLine.includes(',')) separator = ',';
    if (firstLine.includes(';')) separator = ';';
    
    console.log(`📋 Detected separator: ${separator}`);
    
    return new Promise((resolve) => {
        fs.createReadStream(filePath)
            .pipe(csv({ separator: separator }))
            .on('headers', (headers) => {
                header = headers;
                console.log(`📋 Header: ${header.join(', ')}`);
            })
            .on('data', (data) => {
                const nisn = data.nisn || data.NISN;
                const nama = data.nama || data.NAMA;
                const kelas = data.kelas || data.KELAS;
                const jk = data.jk || data.JK || '';
                const ttl = data.ttl || data.TTL || '';
                
                if (nisn && nama && kelas) {
                    results.push({ nisn: String(nisn).trim(), nama: String(nama).trim(), kelas: String(kelas).trim(), jk: String(jk).trim(), ttl: String(ttl).trim() });
                } else {
                    console.log(`⚠️  Baris tidak lengkap:`, data);
                }
            })
            .on('end', async () => {
                console.log(`\n📊 Total data dari CSV: ${results.length} baris\n`);
                
                let success = 0;
                let failed = 0;
                
                for (const item of results) {
                    const validation = await validateSiswaData(item.nisn, item.nama, item.kelas, item.jk, item.ttl);
                    if (!validation.valid) {
                        console.log(`❌ Gagal: ${item.nisn} - ${item.nama} (${validation.errors.join(', ')})`);
                        failed++;
                        continue;
                    }
                    
                    try {
                        await addSiswa(item.nisn, {
                            nama: item.nama,
                            kelas: item.kelas,
                            jk: item.jk || '-',
                            ttl: item.ttl || '-'
                        });
                        console.log(`✅ Berhasil: ${item.nisn} - ${item.nama}`);
                        success++;
                    } catch (error) {
                        console.log(`❌ Gagal: ${item.nisn} - ${error.message}`);
                        failed++;
                    }
                }
                
                console.log(`\n📊 RINGKASAN IMPORT:`);
                console.log(`   ✅ Berhasil: ${success}`);
                console.log(`   ❌ Gagal  : ${failed}`);
                resolve();
            });
    });
}

// ==================== BATCH UPDATE SISWA DARI CSV ====================

async function updateSiswaBatchFromCSV(filePath) {
    console.log(`\n📂 UPDATE SISWA DARI CSV: ${filePath}\n`);
    
    if (!fs.existsSync(filePath)) {
        console.log(`❌ File tidak ditemukan: ${filePath}`);
        return;
    }
    
    const results = [];
    let separator = ';';
    const firstLine = fs.readFileSync(filePath, 'utf8').split('\n')[0];
    if (firstLine.includes(',')) separator = ',';
    
    return new Promise((resolve) => {
        fs.createReadStream(filePath)
            .pipe(csv({ separator: separator }))
            .on('data', (data) => {
                const nisn = data.nisn || data.NISN;
                const updates = {};
                if (data.nama || data.NAMA) updates.nama = data.nama || data.NAMA;
                if (data.kelas || data.KELAS) updates.kelas = data.kelas || data.KELAS;
                if (data.jk || data.JK) updates.jk = data.jk || data.JK;
                if (data.ttl || data.TTL) updates.ttl = data.ttl || data.TTL;
                
                if (nisn && Object.keys(updates).length > 0) {
                    results.push({ nisn: String(nisn).trim(), updates });
                }
            })
            .on('end', async () => {
                console.log(`📊 Total data dari CSV: ${results.length} baris\n`);
                
                let success = 0;
                let failed = 0;
                
                for (const item of results) {
                    const nisnValidation = await validateNISNForUpdate(item.nisn);
                    if (!nisnValidation.valid) {
                        console.log(`❌ Gagal: ${item.nisn} - NISN tidak ditemukan`);
                        failed++;
                        continue;
                    }
                    
                    try {
                        const oldData = await getDataSiswa(item.nisn);
                        await updateSiswa(item.nisn, item.updates);
                        console.log(`✅ Berhasil: ${item.nisn} - ${oldData.nama} → ${item.updates.nama || oldData.nama}`);
                        success++;
                    } catch (error) {
                        console.log(`❌ Gagal: ${item.nisn} - ${error.message}`);
                        failed++;
                    }
                }
                
                console.log(`\n📊 RINGKASAN UPDATE BATCH:`);
                console.log(`   ✅ Berhasil: ${success}`);
                console.log(`   ❌ Gagal  : ${failed}`);
                resolve();
            });
    });
}

// ==================== BATCH HAPUS SISWA DARI CSV ====================

async function hapusSiswaBatchFromCSV(filePath) {
    console.log(`\n📂 HAPUS SISWA DARI CSV: ${filePath}\n`);
    
    if (!fs.existsSync(filePath)) {
        console.log(`❌ File tidak ditemukan: ${filePath}`);
        return;
    }
    
    const nisnList = [];
    let separator = ';';
    const firstLine = fs.readFileSync(filePath, 'utf8').split('\n')[0];
    if (firstLine.includes(',')) separator = ',';
    
    return new Promise((resolve) => {
        fs.createReadStream(filePath)
            .pipe(csv({ separator: separator }))
            .on('data', (data) => {
                const nisn = data.nisn || data.NISN;
                if (nisn) {
                    nisnList.push(String(nisn).trim());
                }
            })
            .on('end', async () => {
                console.log(`📊 Total NISN dari CSV: ${nisnList.length}\n`);
                
                if (nisnList.length === 0) {
                    console.log('❌ Tidak ada NISN untuk dihapus');
                    resolve();
                    return;
                }
                
                const { deleteSiswaBatch } = require('./database.js');
                await deleteSiswaBatch(nisnList);
                resolve();
            });
    });
}

// ==================== NAIKKAN KELAS ====================

async function naikkanKelas(dariKelas, keKelas) {
    console.log(`\n📊 NAIKKAN KELAS\n`);
    console.log(`   Dari: ${dariKelas}`);
    console.log(`   Ke  : ${keKelas}\n`);
    
    if (dariKelas === keKelas) {
        console.log('❌ Kelas asal dan tujuan sama');
        return;
    }
    
    try {
        const jumlah = await upgradeKelas(dariKelas, keKelas);
        if (jumlah > 0) {
            console.log(`\n✅ Berhasil menaikkan ${jumlah} siswa`);
        }
    } catch (error) {
        console.log(`❌ Gagal menaikkan kelas: ${error.message}`);
    }
}

module.exports = {
    tambahSiswa,
    updateSiswaData,
    hapusSiswa,
    importSiswaFromCSV,
    updateSiswaBatchFromCSV,
    hapusSiswaBatchFromCSV,
    naikkanKelas
};