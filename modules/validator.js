// modules/validator.js - Validasi input (TANPA KONVERSI KELAS)

const { TIPE_VALID } = require('./utils.js');
const { isNISNExists, isMapelExists, isKelasExists, isMapelDimilikiSiswa, getAllSiswa } = require('./database.js');

// ==================== VALIDASI KELAS (EXACT MATCH, TANPA KONVERSI) ====================

// Validasi kelas (exact match, tanpa konversi)
async function validateKelas(kelas, checkExists = true) {
    if (!kelas) {
        return { valid: true, errors: [], kelas: null };
    }
    
    const errors = [];
    if (typeof kelas !== 'string' || kelas.trim() === '') {
        errors.push('Kelas tidak boleh kosong');
        return { valid: false, errors };
    }
    
    const trimmedKelas = kelas.trim();
    
    if (checkExists) {
        const exists = await isKelasExists(trimmedKelas);
        if (!exists) {
            errors.push(`Kelas "${trimmedKelas}" tidak ditemukan di database`);
            // Tampilkan saran kelas yang tersedia
            const semuaKelas = await getAllKelas();
            if (semuaKelas.length > 0) {
                errors.push(`Kelas yang tersedia: ${semuaKelas.join(', ')}`);
            }
            return { valid: false, errors };
        }
        return { valid: true, errors, kelas: trimmedKelas };
    }
    
    return { valid: true, errors, kelas: trimmedKelas };
}

// Ambil semua kelas (dari database.js)
async function getAllKelas() {
    const { getAllKelas: getAllKelasFromDB } = require('./database.js');
    return await getAllKelasFromDB();
}

// ==================== VALIDASI NISN (10 DIGIT) ====================

// Validasi format NISN (harus 10 digit angka)
function validateNISNFormat(nisn) {
    const errors = [];
    
    if (!nisn || typeof nisn !== 'string' || nisn.trim() === '') {
        errors.push('NISN tidak boleh kosong');
        return { valid: false, errors };
    }
    
    const trimmedNisn = nisn.trim();
    
    if (trimmedNisn.length !== 10) {
        errors.push(`NISN harus terdiri dari 10 digit angka (panjang: ${trimmedNisn.length})`);
    }
    
    if (!/^\d+$/.test(trimmedNisn)) {
        errors.push('NISN harus terdiri dari angka 0-9 saja');
    }
    
    return { valid: errors.length === 0, errors, nisn: trimmedNisn };
}

// Validasi NISN (dengan pengecekan existence - untuk TAMBAH)
async function validateNISN(nisn, checkExists = true) {
    const formatResult = validateNISNFormat(nisn);
    if (!formatResult.valid) {
        return formatResult;
    }
    
    const errors = [...formatResult.errors];
    const trimmedNisn = formatResult.nisn;
    
    if (checkExists) {
        const exists = await isNISNExists(trimmedNisn);
        if (exists) {
            errors.push(`NISN "${trimmedNisn}" sudah digunakan`);
        }
    }
    
    return { valid: errors.length === 0, errors, nisn: trimmedNisn };
}

// Validasi NISN untuk update (harus sudah ada)
async function validateNISNForUpdate(nisn) {
    const formatResult = validateNISNFormat(nisn);
    if (!formatResult.valid) {
        return formatResult;
    }
    
    const errors = [...formatResult.errors];
    const trimmedNisn = formatResult.nisn;
    
    const exists = await isNISNExists(trimmedNisn);
    if (!exists) {
        errors.push(`NISN "${trimmedNisn}" tidak ditemukan di database`);
    }
    
    return { valid: errors.length === 0, errors, nisn: trimmedNisn };
}

// Validasi NISN untuk hapus (harus sudah ada)
async function validateNISNForDelete(nisn) {
    return validateNISNForUpdate(nisn);
}

// ==================== VALIDASI NILAI ====================

function validateNilai(nilai) {
    const errors = [];
    const nilaiAngka = parseFloat(nilai);
    
    if (isNaN(nilaiAngka)) {
        errors.push(`Nilai "${nilai}" bukan angka yang valid`);
    } else if (nilaiAngka < 0 || nilaiAngka > 100) {
        errors.push(`Nilai harus antara 0-100 (diterima: ${nilaiAngka})`);
    }
    
    return { valid: errors.length === 0, errors, nilaiAngka: isNaN(nilaiAngka) ? null : nilaiAngka };
}

// ==================== VALIDASI MAPEL ====================

function validateMapel(mapel, checkExists = false) {
    const errors = [];
    
    if (!mapel || typeof mapel !== 'string' || mapel.trim() === '') {
        errors.push('Mata pelajaran tidak boleh kosong');
        return { valid: false, errors };
    }
    
    return { valid: true, errors, mapel: mapel.trim() };
}

async function validateMapelWithExistence(mapel) {
    const result = validateMapel(mapel);
    if (!result.valid) return result;
    
    const exists = await isMapelExists(mapel);
    if (!exists) {
        result.valid = false;
        result.errors.push(`Mata pelajaran "${mapel}" tidak ditemukan di database`);
    }
    
    return result;
}

async function validateMapelForSiswa(nisn, mapel) {
    const result = validateMapel(mapel);
    if (!result.valid) return result;
    
    const exists = await isMapelDimilikiSiswa(nisn, mapel);
    if (!exists) {
        result.valid = false;
        result.errors.push(`Mata pelajaran "${mapel}" tidak ditemukan untuk siswa ${nisn}`);
    }
    
    return result;
}

// ==================== VALIDASI TIPE ====================

function validateTipe(tipe) {
    const errors = [];
    
    if (!tipe || !TIPE_VALID.includes(tipe.toLowerCase())) {
        errors.push(`Tipe "${tipe}" tidak valid. Gunakan: ${TIPE_VALID.join(', ')}`);
        return { valid: false, errors };
    }
    
    return { valid: true, errors, tipe: tipe.toLowerCase() };
}

// ==================== VALIDASI FILE CSV ====================

function validateCSVFile(filePath) {
    const fs = require('fs');
    const errors = [];
    
    if (!filePath) {
        errors.push('Path file CSV tidak boleh kosong');
        return { valid: false, errors };
    }
    
    if (!fs.existsSync(filePath)) {
        errors.push(`File "${filePath}" tidak ditemukan`);
        return { valid: false, errors };
    }
    
    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
        errors.push(`File "${filePath}" kosong`);
        return { valid: false, errors };
    }
    
    return { valid: true, errors };
}

// ==================== VALIDASI DATA SISWA ====================

async function validateSiswaData(nisn, nama, kelas, jk, ttl) {
    const errors = [];
    
    const nisnValidation = await validateNISN(nisn, true);
    if (!nisnValidation.valid) {
        errors.push(...nisnValidation.errors);
    }
    
    if (!nama || nama.trim() === '') {
        errors.push('Nama tidak boleh kosong');
    }
    
    if (!kelas || kelas.trim() === '') {
        errors.push('Kelas tidak boleh kosong');
    }
    
    return { valid: errors.length === 0, errors };
}

// ==================== DISPLAY ERRORS ====================

function displayErrors(errors, prefix = '❌') {
    if (!errors || errors.length === 0) return;
    console.log(`\n${prefix} PERINGATAN:`);
    errors.forEach(err => console.log(`   ${err}`));
}

module.exports = {
    validateNISN,
    validateNISNFormat,
    validateNISNForUpdate,
    validateNISNForDelete,
    validateNilai,
    validateMapel,
    validateMapelWithExistence,
    validateMapelForSiswa,
    validateTipe,
    validateKelas,
    validateCSVFile,
    validateSiswaData,
    displayErrors,
    getAllKelas
};