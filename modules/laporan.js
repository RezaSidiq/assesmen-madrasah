// modules/laporan.js - Fitur --laporan untuk export langsung (TANPA KONVERSI KELAS)

const { getAllSiswa, getSiswaByKelas, getDB } = require('./database.js');
const { validateMapelWithExistence, validateKelas, displayErrors } = require('./validator.js');
const { hitungNilaiAkhir } = require('./utils.js');
const { exportToExcel } = require('./export.js');

async function generateLaporan(mapel, kelas = null) {
    console.log(`\n📊 MEMBUAT LAPORAN NILAI`);
    console.log(`   Mapel : ${mapel}`);
    console.log(`   Kelas : ${kelas || 'Semua Kelas'}`);
    console.log(`   Format: EXCEL\n`);
    
    // Validasi mapel
    const mapelValidation = await validateMapelWithExistence(mapel);
    if (!mapelValidation.valid) {
        displayErrors(mapelValidation.errors);
        console.log(`\n💡 Gunakan 'node updateNilai.js --list-mapel' untuk melihat daftar mapel.`);
        return;
    }
    
    let siswaList = [];
    let kelasTerpakai = kelas;
    
    if (kelas) {
        // Validasi kelas (exact match, tanpa konversi)
        const kelasValidation = await validateKelas(kelas, true);
        if (!kelasValidation.valid) {
            displayErrors(kelasValidation.errors);
            return;
        }
        
        console.log(`📋 Filter Kelas: ${kelas}`);
        siswaList = await getSiswaByKelas(kelas);
        kelasTerpakai = kelas;
        
    } else {
        const semuaSiswa = await getAllSiswa();
        for (let nisn in semuaSiswa) {
            siswaList.push({
                nisn: nisn,
                nama: semuaSiswa[nisn].nama || '-',
                kelas: semuaSiswa[nisn].kelas || '-'
            });
        }
    }
    
    if (siswaList.length === 0) {
        console.log(`❌ Tidak ada siswa ditemukan${kelas ? ` di kelas ${kelas}` : ''}`);
        return;
    }
    
    console.log(`📊 Total siswa diproses: ${siswaList.length}\n`);
    console.log('🔄 Mengumpulkan data nilai...\n');
    
    const dataNilai = [];
    const db = getDB();
    
    for (const siswa of siswaList) {
        const [teoriSnapshot, praktekSnapshot, sikapSnapshot, kehadiranSnapshot] = await Promise.all([
            db.ref(`nilai/${siswa.nisn}/${mapel}`).once('value'),
            db.ref(`nilai_praktek/${siswa.nisn}/${mapel}`).once('value'),
            db.ref(`nilai_sikap/${siswa.nisn}/${mapel}`).once('value'),
            db.ref(`kehadiran/${siswa.nisn}/${mapel}`).once('value')
        ]);
        
        const teori = teoriSnapshot.exists() ? teoriSnapshot.val() : '-';
        const praktek = praktekSnapshot.exists() ? praktekSnapshot.val() : '-';
        const sikap = sikapSnapshot.exists() ? sikapSnapshot.val() : '-';
        const kehadiran = kehadiranSnapshot.exists() ? kehadiranSnapshot.val() : '-';
        
        let nilaiAkhir = null;
        let status = '-';
        
        if (teori !== '-' && praktek !== '-' && kehadiran !== '-') {
            nilaiAkhir = hitungNilaiAkhir(teori, praktek, sikap, kehadiran);
            status = nilaiAkhir >= 70 ? 'Lulus' : 'Remedial';
        } else {
            status = 'Data Tidak Lengkap';
        }
        
        dataNilai.push({
            nisn: siswa.nisn,
            nama: siswa.nama,
            kelas: siswa.kelas,
            teori: teori,
            praktek: praktek,
            sikap: sikap,
            kehadiran: kehadiran,
            nilaiAkhir: nilaiAkhir,
            status: status
        });
    }
    
    dataNilai.sort((a, b) => a.nama.localeCompare(b.nama));
    
    displayRingkasan(dataNilai, mapel);
    
    console.log(`\n📁 Sedang mengexport ke Excel...`);
    const result = await exportToExcel(dataNilai, mapel, kelasTerpakai, 'mapel');
    if (result) {
        console.log(`✅ Laporan Excel berhasil dibuat!`);
    } else {
        console.log(`❌ Gagal membuat laporan Excel.`);
    }
    
    return dataNilai;
}

function displayRingkasan(dataNilai, mapel) {
    let totalNilaiAkhir = 0;
    let jumlahData = 0;
    let nilaiTertinggi = -1;
    let nilaiTerendah = 101;
    
    for (const item of dataNilai) {
        if (item.nilaiAkhir !== null) {
            totalNilaiAkhir += item.nilaiAkhir;
            jumlahData++;
            if (item.nilaiAkhir > nilaiTertinggi) nilaiTertinggi = item.nilaiAkhir;
            if (item.nilaiAkhir < nilaiTerendah) nilaiTerendah = item.nilaiAkhir;
        }
    }
    
    const rataKeseluruhan = jumlahData > 0 ? (totalNilaiAkhir / jumlahData).toFixed(2) : 0;
    
    console.log('\n' + '='.repeat(60));
    console.log(`📊 RINGKASAN LAPORAN MAPEL: ${mapel}`);
    console.log('='.repeat(60));
    console.log(`   📍 Total siswa diproses : ${dataNilai.length}`);
    console.log(`   ✅ Siswa dengan data    : ${jumlahData}`);
    console.log(`   ❌ Siswa tanpa data    : ${dataNilai.length - jumlahData}`);
    if (jumlahData > 0) {
        console.log(`   📈 Rata-rata nilai     : ${rataKeseluruhan}`);
        console.log(`   🏆 Nilai tertinggi    : ${nilaiTertinggi.toFixed(2)}`);
        console.log(`   📉 Nilai terendah     : ${nilaiTerendah.toFixed(2)}`);
    }
    console.log('='.repeat(60));
}

module.exports = { generateLaporan };