// modules/utils.js - Fungsi helper yang digunakan di banyak tempat

// BOBOT NILAI (konsisten)
const BOBOT_TEORI = 0.30;
const BOBOT_PRAKTEK = 0.35;
const BOBOT_SIKAP = 0.20;
const BOBOT_KEHADIRAN = 0.15;

// TIPE NILAI VALID
const TIPE_VALID = ['teori', 'praktek', 'sikap', 'kehadiran'];

// Konversi nilai sikap (huruf A/B/C/D ke angka)
function konversiSikapKeAngka(sikap) {
    try {
        if (sikap === null || sikap === undefined || sikap === '-') return 0;
        if (typeof sikap === 'number') return Math.min(100, Math.max(0, sikap));
        if (typeof sikap === 'string') {
            const upper = sikap.trim().toUpperCase();
            if (upper === 'A') return 90;
            if (upper === 'B') return 80;
            if (upper === 'C') return 70;
            if (upper === 'D') return 60;
            const angka = parseInt(upper);
            if (!isNaN(angka)) return Math.min(100, Math.max(0, angka));
        }
        return 0;
    } catch (error) {
        console.error(`[utils] Error konversi sikap: ${error.message}`);
        return 0;
    }
}

// Hitung nilai akhir berdasarkan bobot
function hitungNilaiAkhir(teori, praktek, sikap, kehadiran) {
    try {
        const nilaiTeori = teori || 0;
        const nilaiPraktek = praktek || 0;
        const nilaiSikap = konversiSikapKeAngka(sikap);
        const nilaiKehadiran = kehadiran || 0;
        
        const hasil = (nilaiTeori * BOBOT_TEORI) + 
                      (nilaiPraktek * BOBOT_PRAKTEK) + 
                      (nilaiSikap * BOBOT_SIKAP) + 
                      (nilaiKehadiran * BOBOT_KEHADIRAN);
        
        return Math.round(hasil * 100) / 100;
    } catch (error) {
        console.error(`[utils] Error hitung nilai akhir: ${error.message}`);
        return 0;
    }
}

// Delay helper untuk rate limiting
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Format kelas (opsional, untuk tampilan)
function formatKelas(kelas) {
    if (!kelas) return '-';
    try {
        const konversi = {
            '7': 'VII (Tujuh)', '8': 'VIII (Delapan)', '9': 'IX (Sembilan)',
            '10': 'X (Sepuluh)', '11': 'XI (Sebelas)', '12': 'XII (Dua Belas)'
        };
        const angkaKelas = kelas.match(/^\d+/);
        if (angkaKelas && konversi[angkaKelas[0]]) {
            const huruf = kelas.replace(/^\d+/, '');
            return konversi[angkaKelas[0]] + huruf;
        }
        return kelas;
    } catch (error) {
        return kelas;
    }
}

module.exports = {
    BOBOT_TEORI,
    BOBOT_PRAKTEK,
    BOBOT_SIKAP,
    BOBOT_KEHADIRAN,
    TIPE_VALID,
    konversiSikapKeAngka,
    hitungNilaiAkhir,
    delay,
    formatKelas
};