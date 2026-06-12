// modules/get-mapel.js - Menampilkan nilai semua siswa untuk satu mapel

const { getAllSiswa, getSiswaByKelas, getDB } = require('./database.js');
const { validateMapelWithExistence, validateKelas, displayErrors } = require('./validator.js');
const { hitungNilaiAkhir } = require('./utils.js');

async function getNilaiByMapel(mapel, kelas = null) {
    console.log(`\n🔍 MENCARI NILAI UNTUK MAPEL: ${mapel}\n`);
    
    // Validasi mapel
    const mapelValidation = await validateMapelWithExistence(mapel);
    if (!mapelValidation.valid) {
        displayErrors(mapelValidation.errors);
        console.log(`\n💡 Gunakan 'node updateNilai.js --list-mapel' untuk melihat daftar mapel.`);
        return;
    }
    
    let siswaList = [];
    
    if (kelas) {
        const kelasValidation = await validateKelas(kelas, true);
        if (!kelasValidation.valid) {
            displayErrors(kelasValidation.errors);
            return;
        }
        console.log(`📋 Filter Kelas: ${kelas}`);
        siswaList = await getSiswaByKelas(kelas);
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
    
    let withDataCount = 0;
    let withoutDataCount = 0;
    
    for (const siswa of siswaList) {
        const [teoriSnapshot, praktekSnapshot, sikapSnapshot, kehadiranSnapshot] = await Promise.all([
            db.ref(`nilai/${siswa.nisn}/${mapel}`).once('value'),
            db.ref(`nilai_praktek/${siswa.nisn}/${mapel}`).once('value'),
            db.ref(`nilai_sikap/${siswa.nisn}/${mapel}`).once('value'),
            db.ref(`kehadiran/${siswa.nisn}/${mapel}`).once('value')
        ]);
        
        const teori = teoriSnapshot.exists() ? teoriSnapshot.val() : null;
        const praktek = praktekSnapshot.exists() ? praktekSnapshot.val() : null;
        const sikap = sikapSnapshot.exists() ? sikapSnapshot.val() : null;
        const kehadiran = kehadiranSnapshot.exists() ? kehadiranSnapshot.val() : null;
        
        // Hitung apakah siswa memiliki data untuk mapel ini
        const hasData = (teori !== null || praktek !== null || sikap !== null || kehadiran !== null);
        
        if (hasData) {
            withDataCount++;
        } else {
            withoutDataCount++;
        }
        
        // Format nilai untuk ditampilkan
        const teoriDisplay = teori !== null ? teori : '-';
        const praktekDisplay = praktek !== null ? praktek : '-';
        const sikapDisplay = sikap !== null ? sikap : '-';
        const kehadiranDisplay = kehadiran !== null ? kehadiran : '-';
        
        let nilaiAkhir = null;
        let status = '-';
        
        if (teori !== null && praktek !== null && kehadiran !== null) {
            nilaiAkhir = hitungNilaiAkhir(teori, praktek, sikap, kehadiran);
            status = nilaiAkhir >= 70 ? 'Lulus' : 'Remedial';
        }
        
        dataNilai.push({
            nisn: siswa.nisn,
            nama: siswa.nama,
            kelas: siswa.kelas,
            teori: teoriDisplay,
            praktek: praktekDisplay,
            sikap: sikapDisplay,
            kehadiran: kehadiranDisplay,
            nilaiAkhir: nilaiAkhir,
            status: status
        });
    }
    
    console.log(`📊 Statistik data: ${withDataCount} siswa punya data, ${withoutDataCount} siswa tanpa data\n`);
    
    if (withDataCount === 0) {
        console.log(`⚠️  Tidak ada data nilai untuk mapel "${mapel}"`);
        console.log(`💡 Gunakan 'node updateNilai.js --file data.csv --tipe teori' untuk menginput nilai`);
        return;
    }
    
    // Urutkan berdasarkan kelas, kemudian nama
    dataNilai.sort((a, b) => {
        if (a.kelas !== b.kelas) {
            return a.kelas.localeCompare(b.kelas);
        }
        return a.nama.localeCompare(b.nama);
    });
    
    displayNilaiMapelResult(dataNilai, mapel);
    
    return dataNilai;
}

function displayNilaiMapelResult(dataNilai, mapel) {
    console.log('='.repeat(130));
    console.log(`📋 NILAI MAPEL: ${mapel}`);
    console.log('='.repeat(130));
    console.log(` ${'No'.padEnd(5)} | ${'NISN'.padEnd(15)} | ${'Nama Siswa'.padEnd(28)} | ${'Kelas'.padEnd(12)} | Teori | Praktek | Sikap | Hadir | Nilai Akhir | Status`);
    console.log('='.repeat(130));
    
    let totalNilaiAkhir = 0;
    let jumlahData = 0;
    let nilaiTertinggi = -1;
    let nilaiTerendah = 101;
    let no = 1;
    
    for (const item of dataNilai) {
        const teoriStr = String(item.teori).padStart(5);
        const praktekStr = String(item.praktek).padStart(6);
        const sikapStr = String(item.sikap).padStart(5);
        const hadirStr = String(item.kehadiran).padStart(5);
        
        let nilaiStr = '-';
        let statusDisplay = item.status;
        
        if (item.nilaiAkhir !== null) {
            nilaiStr = item.nilaiAkhir.toFixed(2).padStart(11);
            totalNilaiAkhir += item.nilaiAkhir;
            jumlahData++;
            if (item.nilaiAkhir > nilaiTertinggi) nilaiTertinggi = item.nilaiAkhir;
            if (item.nilaiAkhir < nilaiTerendah) nilaiTerendah = item.nilaiAkhir;
            statusDisplay = item.status === 'Lulus' ? '✅ Lulus' : '⚠️ Remedial';
        }
        
        const namaDisplay = item.nama.length > 26 ? item.nama.substring(0, 23) + '...' : item.nama;
        
        console.log(` ${String(no).padEnd(5)} | ${item.nisn.padEnd(15)} | ${namaDisplay.padEnd(28)} | ${String(item.kelas).padEnd(12)} | ${teoriStr} | ${praktekStr} | ${sikapStr} | ${hadirStr} | ${nilaiStr} | ${statusDisplay}`);
        no++;
    }
    
    console.log('='.repeat(130));
    
    const rataKeseluruhan = jumlahData > 0 ? (totalNilaiAkhir / jumlahData).toFixed(2) : 0;
    console.log(`\n📊 STATISTIK MAPEL ${mapel}:`);
    console.log(`   📍 Total siswa diproses : ${dataNilai.length}`);
    console.log(`   ✅ Siswa dengan data    : ${jumlahData}`);
    console.log(`   ❌ Siswa tanpa data    : ${dataNilai.length - jumlahData}`);
    if (jumlahData > 0) {
        console.log(`   📈 Rata-rata nilai     : ${rataKeseluruhan}`);
        console.log(`   🏆 Nilai tertinggi    : ${nilaiTertinggi.toFixed(2)}`);
        console.log(`   📉 Nilai terendah     : ${nilaiTerendah.toFixed(2)}`);
    }
    console.log('='.repeat(130));
}

module.exports = { getNilaiByMapel };